import { describe, expect, test } from "bun:test"
import { resolveConfig } from "../config"
import { resolveSearchOptions } from "../tool"

describe("config resolution", () => {
  test("reads shared search defaults from plugin config", () => {
    const config = resolveConfig({
      searchDefaults: {
        freshness: "pw",
        country: "us",
        searchLang: "en",
        topic: "news",
        includeDomains: ["docs.openai.com", "platform.openai.com"],
        excludeDomains: ["example.com"],
      },
      openai: {
        apiMode: "responses",
        searchContextSize: "high",
        city: "Detroit",
        region: "California",
        timezone: "America/Los_Angeles",
      },
    })

    expect(config.searchDefaults).toEqual({
      freshness: "pw",
      country: "us",
      searchLang: "en",
      topic: "news",
      includeDomains: ["docs.openai.com", "platform.openai.com"],
      excludeDomains: ["example.com"],
    })
    expect(config.openai.apiMode).toBe("responses")
    expect(config.openai.searchContextSize).toBe("high")
    expect(config.openai.city).toBe("Detroit")
    expect(config.openai.region).toBe("California")
    expect(config.openai.timezone).toBe("America/Los_Angeles")
  })

  test("reads Exa category and maxAgeHours config", () => {
    const config = resolveConfig({
      exa: {
        category: "tweet",
        maxAgeHours: 0,
      },
    })

    expect(config.exa.category).toBe("tweet")
    expect(config.exa.maxAgeHours).toBe(0)
  })

  test("reads Tavily advanced options from plugin config", () => {
    const config = resolveConfig({
      tavily: {
        chunksPerSource: 7,
        includeRawContent: true,
        exactMatch: true,
      },
    })

    expect(config.tavily).toMatchObject({
      chunksPerSource: 7,
      includeRawContent: true,
      exactMatch: true,
    })
  })

  test("reads Gemini dynamicThreshold config", () => {
    const config = resolveConfig({
      gemini: {
        dynamicThreshold: 0.5,
      },
    })

    expect(config.gemini.dynamicThreshold).toBe(0.5)
  })

  test("reads Perplexity apiMode from plugin config", () => {
    const config = resolveConfig({
      perplexity: {
        apiMode: "chat",
      },
    })

    expect(config.perplexity.apiMode).toBe("chat")
  })

  test("reads Brave rich-results and safesearch config", () => {
    const config = resolveConfig({
      brave: {
        enableRichResults: false,
        safesearch: "strict",
      },
    })

    expect(config.brave.enableRichResults).toBe(false)
    expect(config.brave.safesearch).toBe("strict")
  })

  test("reads Anthropic maxTokens and location config", () => {
    const config = resolveConfig({
      anthropic: {
        maxTokens: 2048,
        city: "San Francisco",
        region: "California",
        timezone: "America/Los_Angeles",
      },
    })

    expect(config.anthropic.maxTokens).toBe(2048)
    expect(config.anthropic.city).toBe("San Francisco")
    expect(config.anthropic.region).toBe("California")
    expect(config.anthropic.timezone).toBe("America/Los_Angeles")
  })

  test("defaults Anthropic maxTokens to 4096", () => {
    const config = resolveConfig({})

    expect(config.anthropic.maxTokens).toBe(4096)
  })
})

describe("search option resolution", () => {
  test("merges plugin defaults with per-call overrides", () => {
    const config = resolveConfig({
      maxResults: 7,
      searchDefaults: {
        freshness: "pm",
        country: "us",
        searchLang: "en",
        topic: "general",
        includeDomains: ["openai.com"],
        excludeDomains: ["example.com"],
      },
    })

    expect(
      resolveSearchOptions(config, {
        query: "ignored",
        count: 3,
        country: "ca",
        include_domains: ["anthropic.com"],
      }),
    ).toEqual({
      maxResults: 3,
      freshness: "pm",
      country: "ca",
      searchLang: "en",
      topic: "general",
      includeDomains: ["anthropic.com"],
      excludeDomains: ["example.com"],
    })
  })
})
