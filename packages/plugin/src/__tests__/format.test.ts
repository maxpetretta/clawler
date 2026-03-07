import { describe, expect, test } from "bun:test"
import { formatSearchResult } from "../format"

describe("formatSearchResult", () => {
  test("formats search results without an answer", () => {
    const text = formatSearchResult({
      provider: "exa",
      query: "openclaw",
      results: [
        {
          title: "OpenClaw",
          url: "https://openclaw.com",
          snippet: "OpenClaw docs",
          publishedDate: "2026-03-01",
        },
      ],
    })

    expect(text).toContain('Search results for "openclaw" (via exa):')
    expect(text).toContain("Search results:")
    expect(text).toContain("Published: 2026-03-01")
  })

  test("reports when no answer or results are available", () => {
    expect(
      formatSearchResult({
        provider: "brave",
        query: "nothing",
      }),
    ).toContain("No results returned.")
  })
})
