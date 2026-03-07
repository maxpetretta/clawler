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
