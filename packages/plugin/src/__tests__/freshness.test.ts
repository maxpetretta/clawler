import { describe, expect, test } from "bun:test"
import { describeFreshness, parseFreshness, toIsoDateEnd, toIsoDateStart, toUsDate } from "../providers/freshness"

describe("freshness helpers", () => {
  test("parses relative freshness values", () => {
    expect(parseFreshness("pw", new Date("2026-03-07T00:00:00.000Z"))).toEqual({
      kind: "relative",
      brave: "pw",
      tavily: "week",
      perplexity: "week",
      afterDate: "2026-02-28",
    })
  })

  test("parses explicit date ranges", () => {
    expect(parseFreshness("2026-03-01to2026-03-05")).toEqual({
      kind: "range",
      startDate: "2026-03-01",
      endDate: "2026-03-05",
      afterDate: "2026-03-01",
    })
  })

  test("returns undefined for invalid freshness values", () => {
    expect(parseFreshness("yesterday")).toBeUndefined()
    expect(describeFreshness(undefined)).toBeUndefined()
  })

  test("formats helper date strings", () => {
    expect(toIsoDateStart("2026-03-01")).toBe("2026-03-01T00:00:00.000Z")
    expect(toIsoDateEnd("2026-03-01")).toBe("2026-03-01T23:59:59.999Z")
    expect(toUsDate("2026-03-01")).toBe("03/01/2026")
    expect(describeFreshness("pd")).toBe("the past day")
    expect(describeFreshness("pm")).toBe("the past month")
    expect(describeFreshness("2026-03-01to2026-03-05")).toBe("2026-03-01 through 2026-03-05")
  })
})
