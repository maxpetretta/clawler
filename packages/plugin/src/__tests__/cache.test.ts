import { describe, expect, test } from "bun:test"
import { SearchCache } from "../cache"

describe("SearchCache", () => {
  test("returns cached values before expiration", () => {
    const cache = new SearchCache<string>(1_000)
    const originalNow = Date.now
    let now = 1_000
    Date.now = () => now

    try {
      cache.set("query", "value")
      expect(cache.get("query")).toBe("value")

      now = 1_999
      expect(cache.get("query")).toBe("value")
    } finally {
      Date.now = originalNow
    }
  })

  test("evicts expired values", () => {
    const cache = new SearchCache<string>(500)
    const originalNow = Date.now
    let now = 1_000
    Date.now = () => now

    try {
      cache.set("query", "value")
      now = 1_500
      expect(cache.get("query")).toBeUndefined()
      expect(cache.get("query")).toBeUndefined()
    } finally {
      Date.now = originalNow
    }
  })
})
