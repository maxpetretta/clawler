import { parseFreshness, toIsoDateEnd, toIsoDateStart } from "./freshness"
import { asSearchResultItem, normalizeDomains, requestJson, resolveApiKey } from "./shared"
import type { SearchOptions, SearchProvider } from "./types"

type ExaResponse = {
  results?: Array<{
    title?: string
    url?: string
    text?: string
    highlights?: string[]
    publishedDate?: string
    summary?: string
  }>
}

export function createExaBody(query: string, options: SearchOptions, searchType: string) {
  const freshness = parseFreshness(options.freshness)
  const body: Record<string, unknown> = {
    query,
    type: searchType,
    numResults: options.maxResults ?? 5,
    contents: {
      highlights: {
        numSentences: 3,
      },
    },
  }

  const includeDomains = normalizeDomains(options.includeDomains)
  const excludeDomains = normalizeDomains(options.excludeDomains)

  if (includeDomains) {
    body.includeDomains = includeDomains
  }

  if (excludeDomains) {
    body.excludeDomains = excludeDomains
  }

  if (options.topic === "news") {
    body.category = "news"
  } else if (options.topic === "finance") {
    body.category = "financial report"
  }

  if (freshness?.kind === "relative") {
    body.startPublishedDate = toIsoDateStart(freshness.afterDate)
  } else if (freshness?.kind === "range") {
    body.startPublishedDate = toIsoDateStart(freshness.startDate)
    body.endPublishedDate = toIsoDateEnd(freshness.endDate)
  }

  return body
}

type ExaRequestConfig = {
  apiKey: string
  type: string
  timeoutSeconds: number
}

export function buildExaRequest(query: string, options: SearchOptions, config: ExaRequestConfig) {
  return {
    url: "https://api.exa.ai/search",
    method: "POST" as const,
    headers: {
      "content-type": "application/json",
      "x-api-key": config.apiKey,
    },
    body: createExaBody(query, options, config.type),
    timeoutSeconds: config.timeoutSeconds,
  }
}

export const exaProvider: SearchProvider = {
  id: "exa",
  name: "Exa",
  envVars: ["EXA_API_KEY"],
  category: "traditional",
  isAvailable(config, env = process.env) {
    return Boolean(resolveApiKey(config, "exa", env))
  },
  async search(query, options, context) {
    const apiKey = resolveApiKey(context.config, "exa", context.env)

    if (!apiKey) {
      throw new Error("Exa is not configured.")
    }

    const request = buildExaRequest(query, options, {
      apiKey,
      type: context.config.exa.type,
      timeoutSeconds: context.config.timeoutSeconds,
    })
    const response = await requestJson<ExaResponse>("exa", request.url, context, request)
    const results =
      response.results
        ?.filter((entry) => Boolean(entry.url))
        .map((entry) =>
          asSearchResultItem({
            title: entry.title ?? entry.url ?? "Untitled result",
            url: entry.url ?? "",
            snippet: entry.highlights?.join(" ") ?? entry.summary ?? entry.text ?? "",
            publishedDate: entry.publishedDate,
          }),
        ) ?? []

    return {
      provider: "exa",
      query,
      results,
    }
  },
}
