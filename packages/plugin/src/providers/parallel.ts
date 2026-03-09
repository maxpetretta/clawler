import type { ClawlerConfig } from "../config"
import { parseFreshness } from "./freshness"
import {
  asSearchResultItem,
  buildPromptWithGuidance,
  defineProvider,
  normalizeDomains,
  requestJson,
  requireApiKey,
} from "./shared"
import type { SearchOptions } from "./types"

type ParallelResponse = {
  results?: Array<{
    title?: string
    url?: string
    publish_date?: string | null
    excerpts?: string[]
  }>
}

type ParallelRequestConfig = ClawlerConfig["parallel"] & {
  apiKey: string
  timeoutSeconds: number
}

export function buildParallelRequest(query: string, options: SearchOptions, config: ParallelRequestConfig) {
  const freshness = parseFreshness(options.freshness)
  const excerpts: Record<string, number> = {
    max_chars_per_result: config.maxCharsPerResult,
    max_chars_total: config.maxCharsTotal,
  }
  const body: Record<string, unknown> = {
    objective: buildPromptWithGuidance(query, options, {
      includeDomains: true,
      excludeDomains: true,
      freshness: false,
    }),
    search_queries: [query],
    mode: config.mode,
    max_results: options.maxResults ?? 5,
    excerpts,
  }

  const sourcePolicy: Record<string, unknown> = {}
  const includeDomains = normalizeDomains(options.includeDomains)
  const excludeDomains = normalizeDomains(options.excludeDomains)

  if (includeDomains) {
    sourcePolicy.include_domains = includeDomains
  }

  if (excludeDomains) {
    sourcePolicy.exclude_domains = excludeDomains
  }

  if (freshness) {
    sourcePolicy.after_date = freshness.afterDate
  }

  if (Object.keys(sourcePolicy).length > 0) {
    body.source_policy = sourcePolicy
  }

  if (config.maxAgeSeconds) {
    body.fetch_policy = {
      max_age_seconds: config.maxAgeSeconds,
    }
  }

  return {
    url: "https://api.parallel.ai/v1beta/search",
    method: "POST" as const,
    headers: {
      "content-type": "application/json",
      "parallel-beta": "search-extract-2025-10-10",
      "x-api-key": config.apiKey,
    },
    body,
    timeoutSeconds: config.timeoutSeconds,
  }
}

export const parallelProvider = defineProvider("parallel", "traditional", async (query, options, context) => {
  const apiKey = requireApiKey(context.config, "parallel", context.env)
  const request = buildParallelRequest(query, options, {
    ...context.config.parallel,
    apiKey,
    timeoutSeconds: context.config.timeoutSeconds,
  })
  const response = await requestJson<ParallelResponse>("parallel", request.url, context, request)
  const results =
    response.results
      ?.filter((entry) => Boolean(entry.url))
      .map((entry) =>
        asSearchResultItem({
          title: entry.title ?? entry.url ?? "Untitled result",
          url: entry.url ?? "",
          snippet: entry.excerpts?.join(" ") ?? "",
          publishedDate: entry.publish_date ?? undefined,
        }),
      ) ?? []

  return {
    provider: "parallel",
    query,
    results,
  }
})
