import type { BetterSearchConfig } from "../config"
import { parseFreshness } from "./freshness"
import { asSearchResultItem, isoCountryName, normalizeDomains, requestJson, resolveApiKey } from "./shared"
import type { SearchOptions, SearchProvider } from "./types"

type TavilyResponse = {
  answer?: string
  results?: Array<{
    title?: string
    url?: string
    content?: string
    published_date?: string
  }>
}

type TavilyRequestConfig = BetterSearchConfig["tavily"] & {
  timeoutSeconds: number
  apiKey: string
}

export function buildTavilyRequest(query: string, options: SearchOptions, config: TavilyRequestConfig) {
  const freshness = parseFreshness(options.freshness)
  const body: Record<string, unknown> = {
    api_key: config.apiKey,
    query,
    search_depth: config.searchDepth,
    max_results: options.maxResults ?? 5,
    include_answer: config.includeAnswer,
    auto_parameters: config.autoParameters,
  }

  if (options.topic) {
    body.topic = options.topic
  }

  if (freshness?.kind === "relative") {
    body.time_range = freshness.tavily
  } else if (freshness?.kind === "range") {
    body.start_date = freshness.startDate
    body.end_date = freshness.endDate
  }

  const includeDomains = normalizeDomains(options.includeDomains)
  const excludeDomains = normalizeDomains(options.excludeDomains)

  if (includeDomains) {
    body.include_domains = includeDomains
  }

  if (excludeDomains) {
    body.exclude_domains = excludeDomains
  }

  const countryName = isoCountryName(options.country)
  if (countryName) {
    body.country = countryName.toLowerCase()
  }

  return {
    url: "https://api.tavily.com/search",
    method: "POST" as const,
    headers: {
      "content-type": "application/json",
    },
    body,
    timeoutSeconds: config.timeoutSeconds,
  }
}

export const tavilyProvider: SearchProvider = {
  id: "tavily",
  name: "Tavily",
  envVars: ["TAVILY_API_KEY"],
  category: "hybrid",
  isAvailable(config, env = process.env) {
    return Boolean(resolveApiKey(config, "tavily", env))
  },
  async search(query, options, context) {
    const apiKey = resolveApiKey(context.config, "tavily", context.env)

    if (!apiKey) {
      throw new Error("Tavily is not configured.")
    }

    const request = buildTavilyRequest(query, options, {
      ...context.config.tavily,
      apiKey,
      timeoutSeconds: context.config.timeoutSeconds,
    })
    const response = await requestJson<TavilyResponse>("tavily", request.url, context, request)
    const results =
      response.results
        ?.filter((entry) => Boolean(entry.url))
        .map((entry) =>
          asSearchResultItem({
            title: entry.title ?? entry.url ?? "Untitled result",
            url: entry.url ?? "",
            snippet: entry.content ?? "",
            publishedDate: entry.published_date,
          }),
        ) ?? []

    return {
      provider: "tavily",
      query,
      answer: response.answer,
      citations: results.map((entry) => entry.url),
      results,
    }
  },
}
