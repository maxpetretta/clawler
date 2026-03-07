export type ParsedFreshness =
  | {
      kind: "relative"
      brave: "pd" | "pw" | "pm" | "py"
      tavily: "day" | "week" | "month" | "year"
      perplexity: "day" | "week" | "month" | "year"
      afterDate: string
    }
  | {
      kind: "range"
      startDate: string
      endDate: string
      afterDate: string
    }

export function parseFreshness(value: string | undefined, now = new Date()): ParsedFreshness | undefined {
  if (!value) {
    return undefined
  }

  if (value === "pd" || value === "pw" || value === "pm" || value === "py") {
    const offsetDays = value === "pd" ? 1 : value === "pw" ? 7 : value === "pm" ? 31 : 365
    const afterDate = addDays(now, -offsetDays)

    return {
      kind: "relative",
      brave: value,
      tavily: value === "pd" ? "day" : value === "pw" ? "week" : value === "pm" ? "month" : "year",
      perplexity: value === "pd" ? "day" : value === "pw" ? "week" : value === "pm" ? "month" : "year",
      afterDate: toDateString(afterDate),
    }
  }

  const match = /^(?<start>\d{4}-\d{2}-\d{2})to(?<end>\d{4}-\d{2}-\d{2})$/.exec(value)

  if (!match?.groups) {
    return undefined
  }

  return {
    kind: "range",
    startDate: match.groups.start,
    endDate: match.groups.end,
    afterDate: match.groups.start,
  }
}

export function toIsoDateStart(date: string): string {
  return `${date}T00:00:00.000Z`
}

export function toIsoDateEnd(date: string): string {
  return `${date}T23:59:59.999Z`
}

export function toUsDate(date: string): string {
  const [year, month, day] = date.split("-")
  return `${month}/${day}/${year}`
}

export function describeFreshness(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  if (value === "pd") {
    return "the past day"
  }

  if (value === "pw") {
    return "the past week"
  }

  if (value === "pm") {
    return "the past month"
  }

  if (value === "py") {
    return "the past year"
  }

  const parsed = parseFreshness(value)
  return parsed?.kind === "range" ? `${parsed.startDate} through ${parsed.endDate}` : undefined
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}
