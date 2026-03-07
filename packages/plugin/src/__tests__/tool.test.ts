import { describe, expect, test } from "bun:test"
import { resolveConfig } from "../config"
import { createBetterSearchTool } from "../tool"

describe("createBetterSearchTool", () => {
  test("exposes the configured tool name", () => {
    const tool = createBetterSearchTool(resolveConfig({ toolName: "search_now" }))
    expect(tool.name).toBe("search_now")
  })

  test("rejects empty queries", async () => {
    const tool = createBetterSearchTool(resolveConfig({ provider: "brave" }))
    await expect(tool.execute("id", { query: "   " })).rejects.toThrow("Query must not be empty.")
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
      const tool = createBetterSearchTool(
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
})
