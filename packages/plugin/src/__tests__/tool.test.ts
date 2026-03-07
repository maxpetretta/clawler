import { describe, expect, test } from "bun:test"
import { resolveConfig } from "../config"
import { createClawlerTool } from "../tool"

describe("createClawlerTool", () => {
  test("exposes the configured tool name", () => {
    const tool = createClawlerTool(resolveConfig({ toolName: "search_now" }))
    expect(tool.name).toBe("search_now")
  })

  test("rejects empty queries", async () => {
    const tool = createClawlerTool(resolveConfig({ provider: "brave" }))
    await expect(tool.execute("id", { query: "   " })).rejects.toThrow("Query must not be empty.")
  })

  test("rejects unknown per-call provider overrides", async () => {
    const tool = createClawlerTool(resolveConfig({ provider: "brave" }))
    await expect(tool.execute("id", { query: "search", provider: "unknown" as never })).rejects.toThrow(
      "Unknown provider: unknown",
    )
  })

  test("uses plugin defaults and caches repeated requests", async () => {
    const originalFetch = globalThis.fetch
    const calls: string[] = []
    globalThis.fetch = ((url) => {
      calls.push(String(url))
      return Promise.resolve(
        new Response(
          JSON.stringify({
            web: {
              results: [{ title: "Title", url: "https://example.com", description: "snippet" }],
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
    }) as typeof fetch

    const previousKey = process.env.BRAVE_API_KEY
    process.env.BRAVE_API_KEY = "key"

    try {
      const tool = createClawlerTool(
        resolveConfig({
          provider: "brave",
          searchDefaults: {
            includeDomains: ["openai.com"],
            searchLang: "en",
          },
        }),
      )

      const first = await tool.execute("id", { query: "search" })
      const second = await tool.execute("id", { query: "search" })

      expect(first).toContain("https://example.com")
      expect(second).toBe(first)
      expect(calls).toHaveLength(1)
      expect(calls[0]).toContain("site%3Aopenai.com")
      expect(calls[0]).toContain("search_lang=en")
    } finally {
      globalThis.fetch = originalFetch
      if (previousKey === undefined) {
        process.env.BRAVE_API_KEY = undefined
      } else {
        process.env.BRAVE_API_KEY = previousKey
      }
    }
  })

  test("uses the per-call provider override", async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = ((url) => {
      const value = String(url)
      if (value.includes("api.exa.ai")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              results: [
                {
                  title: "Exa Result",
                  url: "https://exa.example.com",
                  text: "exa snippet",
                  publishedDate: "2026-03-07",
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        )
      }

      return Promise.resolve(
        new Response(
          JSON.stringify({
            web: {
              results: [{ title: "Brave Result", url: "https://brave.example.com", description: "brave snippet" }],
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
    }) as typeof fetch

    const previousBraveKey = process.env.BRAVE_API_KEY
    const previousExaKey = process.env.EXA_API_KEY
    process.env.BRAVE_API_KEY = "brave-key"
    process.env.EXA_API_KEY = "exa-key"

    try {
      const tool = createClawlerTool(resolveConfig({ provider: "brave" }))
      const result = await tool.execute("id", { query: "search", provider: "exa" })

      expect(result).toContain("(via exa)")
      expect(result).toContain("https://exa.example.com")
      expect(result).not.toContain("https://brave.example.com")
    } finally {
      globalThis.fetch = originalFetch
      if (previousBraveKey === undefined) {
        process.env.BRAVE_API_KEY = undefined
      } else {
        process.env.BRAVE_API_KEY = previousBraveKey
      }

      if (previousExaKey === undefined) {
        process.env.EXA_API_KEY = undefined
      } else {
        process.env.EXA_API_KEY = previousExaKey
      }
    }
  })
})
