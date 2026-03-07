import { describe, expect, test } from "bun:test"
import { resolveConfig } from "../config"
import {
  asSearchResultItem,
  buildPromptWithGuidance,
  buildQueryWithDomainFilters,
  createProviderRequest,
  dedupeStrings,
  isoCountryName,
  normalizeDomain,
  normalizeDomains,
  providerCredentialSource,
  providerEnvVars,
  requestJson,
  resolveApiKey,
  trimSnippet,
} from "../providers/shared"

describe("shared provider helpers", () => {
  test("normalizes domains and query filters", () => {
    expect(normalizeDomain(" https://www.example.com/ ")).toBe("example.com")
    expect(normalizeDomains(["https://www.example.com/", "example.com", ""])).toEqual(["example.com"])
    expect(
      buildQueryWithDomainFilters("search term", {
        includeDomains: ["docs.openai.com"],
        excludeDomains: ["example.com"],
      }),
    ).toBe("search term site:docs.openai.com -site:example.com")
  })

  test("builds prompt guidance only for unsupported options", () => {
    const prompt = buildPromptWithGuidance(
      "search term",
      {
        topic: "news",
        country: "us",
        searchLang: "en",
        freshness: "pw",
        includeDomains: ["openai.com"],
        excludeDomains: ["example.com"],
      },
      {
        includeDomains: true,
      },
    )

    expect(prompt).toContain("Focus on news sources.")
    expect(prompt).toContain("Prefer results relevant to us.")
    expect(prompt).toContain("Prefer sources written in language en.")
    expect(prompt).toContain("Prefer sources published within the past week.")
    expect(prompt).toContain("Do not use sources from: example.com.")
    expect(prompt).not.toContain("Only use sources from: openai.com.")
  })

  test("includes explicit allow-list guidance when domains are unsupported", () => {
    expect(
      buildPromptWithGuidance(
        "search term",
        {
          includeDomains: ["openai.com"],
        },
        {},
      ),
    ).toContain("Only use sources from: openai.com.")
  })

  test("requestJson uses provider defaults from createProviderRequest", async () => {
    const config = resolveConfig({ timeoutSeconds: 42 })
    const context = {
      config,
      env: {},
      fetch: async () => new Response("", { status: 200 }),
    }
    const request = createProviderRequest("exa", "https://example.com", context, {
      method: "POST",
      headers: { "x-api-key": "key" },
      body: { query: "test" },
    })

    expect(request).toMatchObject({
      provider: "exa",
      url: "https://example.com",
      timeoutSeconds: 42,
      method: "POST",
    })

    const result = await requestJson<{ ok: boolean }>("exa", "https://example.com", context, {
      method: "GET",
    })

    expect(result).toBeUndefined()
  })

  test("dedupes and trims normalized snippets", () => {
    expect(trimSnippet("  a   b   c  ", 5)).toBe("a b c")
    expect(trimSnippet("abcdef", 5)).toBe("abcd…")
    expect(dedupeStrings(["a", undefined, "a", "b"])).toEqual(["a", "b"])
    expect(
      asSearchResultItem({
        title: " ",
        url: " https://example.com ",
        snippet: "  line one\nline two  ",
      }),
    ).toEqual({
      title: " https://example.com ",
      url: "https://example.com",
      snippet: "line one line two",
      publishedDate: undefined,
    })
  })

  test("resolves credential sources and provider env vars", () => {
    const config = resolveConfig({
      exa: { apiKey: "config-exa" },
    })

    expect(resolveApiKey(config, "exa", {})).toBe("config-exa")
    expect(resolveApiKey(resolveConfig({}), "perplexity", { OPENROUTER_API_KEY: "router" })).toBe("router")
    expect(resolveApiKey(resolveConfig({}), "gemini", { GOOGLE_AI_API_KEY: "google" })).toBe("google")
    expect(resolveApiKey(resolveConfig({}), "brave", { BRAVE_API_KEY: "brave" })).toBe("brave")

    expect(providerEnvVars("anthropic")).toEqual(["ANTHROPIC_API_KEY"])
    expect(providerCredentialSource(config, "exa", {})).toBe("config")
    expect(providerCredentialSource(resolveConfig({}), "openai", { OPENAI_API_KEY: "key" })).toBe("env")
    expect(providerCredentialSource(resolveConfig({}), "openai", {})).toBe("missing")
  })

  test("maps ISO country codes", () => {
    expect(isoCountryName("us")).toBe("United States")
    expect(isoCountryName("usa")).toBeUndefined()
  })
})
