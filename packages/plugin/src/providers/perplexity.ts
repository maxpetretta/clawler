import type { ClawlerConfig } from "../config"
import { parseFreshness, toUsDate } from "./freshness"
import {
  buildPromptWithGuidance,
  dedupeStrings,
  hasApiKey,
  normalizeDomains,
  providerEnvVars,
  requestJson,
  requireApiKey,
} from "./shared"
import type { SearchOptions, SearchProvider } from "./types"

type PerplexitySearchResult = {
  title?: string
  url?: string
  snippet?: string
  date?: string
}

type PerplexityResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  citations?: string[]
  results?: PerplexitySearchResult[]
  search_results?: PerplexitySearchResult[]
}

type PerplexityRequestConfig = ClawlerConfig["perplexity"] & {
  apiKey: string
  timeoutSeconds: number
  viaOpenRouter: boolean
}

export function buildPerplexityRequest(query: string, options: SearchOptions, config: PerplexityRequestConfig) {
  return shouldUsePerplexitySearchApi(config)
    ? buildPerplexitySearchRequest(query, options, config)
    : buildPerplexityChatRequest(query, options, config)
}

function buildPerplexitySearchRequest(query: string, options: SearchOptions, config: PerplexityRequestConfig) {
  const freshness = parseFreshness(options.freshness)
  const includeDomains = normalizeDomains(options.includeDomains)
  const excludeDomains = normalizeDomains(options.excludeDomains)
  const body: Record<string, unknown> = {
    query: buildPromptWithGuidance(query, options, {
      freshness: true,
      country: true,
      searchLang: true,
      includeDomains: true,
      excludeDomains: true,
    }),
    model: config.model,
    max_results: options.maxResults ?? 5,
    max_tokens: config.maxTokens,
    max_tokens_per_page: config.maxTokensPerPage,
  }

  if (options.country) {
    body.country = options.country
  }

  if (options.searchLang) {
    body.search_language_filter = options.searchLang
  }

  if (freshness?.kind === "relative") {
    body.search_recency_filter = freshness.perplexity
  } else if (freshness?.kind === "range") {
    body.search_after_date_filter = toUsDate(freshness.startDate)
    body.search_before_date_filter = toUsDate(freshness.endDate)
  }

  const domainFilter = buildSearchDomainFilter(includeDomains, excludeDomains)
  if (domainFilter) {
    body.search_domain_filter = domainFilter
  }

  return {
    url: `${config.baseUrl.replace(/\/+$/u, "")}/search`,
    method: "POST" as const,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
    },
    body,
    timeoutSeconds: config.timeoutSeconds,
  }
}

function buildPerplexityChatRequest(query: string, options: SearchOptions, config: PerplexityRequestConfig) {
  const freshness = parseFreshness(options.freshness)
  const includeDomains = normalizeDomains(options.includeDomains)
  const excludeDomains = normalizeDomains(options.excludeDomains)
  const body: Record<string, unknown> = {
    model: config.viaOpenRouter ? normalizeOpenRouterModel(config.model) : config.model,
    messages: [
      {
        role: "user",
        content: buildPromptWithGuidance(query, options, {
          freshness: true,
          includeDomains: true,
          excludeDomains: true,
        }),
      },
    ],
  }

  const webSearchOptions: Record<string, unknown> = {}

  if (freshness?.kind === "relative") {
    webSearchOptions.search_recency_filter = freshness.perplexity
  } else if (freshness?.kind === "range") {
    webSearchOptions.search_after_date_filter = toUsDate(freshness.startDate)
    webSearchOptions.search_before_date_filter = toUsDate(freshness.endDate)
  }

  if (includeDomains) {
    webSearchOptions.search_domain_filter = includeDomains
  } else if (excludeDomains) {
    webSearchOptions.search_domain_filter = excludeDomains
    webSearchOptions.search_filter = "exclude_domains"
  }

  if (Object.keys(webSearchOptions).length > 0) {
    body.web_search_options = webSearchOptions
  }

  return {
    url: `${config.baseUrl.replace(/\/+$/u, "")}/chat/completions`,
    method: "POST" as const,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
    },
    body,
    timeoutSeconds: config.timeoutSeconds,
  }
}

function shouldUsePerplexitySearchApi(config: PerplexityRequestConfig): boolean {
  return config.apiMode === "search" && !config.viaOpenRouter
}

function buildSearchDomainFilter(
  includeDomains: string[] | undefined,
  excludeDomains: string[] | undefined,
): string[] | undefined {
  if (!includeDomains && !excludeDomains) {
    return undefined
  }

  return [...(includeDomains ?? []), ...((excludeDomains ?? []).map((domain) => `-${domain}`))]
}

export const perplexityProvider: SearchProvider = {
  id: "perplexity",
  name: "Perplexity",
  envVars: providerEnvVars("perplexity"),
  category: "llm",
  isAvailable(config, env = process.env) {
    return hasApiKey(config, "perplexity", env)
  },
  async search(query, options, context) {
    const apiKey = requireApiKey(context.config, "perplexity", context.env)
    const viaOpenRouter =
      !(context.config.perplexity.apiKey || context.env.PERPLEXITY_API_KEY) && Boolean(context.env.OPENROUTER_API_KEY)
    const baseUrl = viaOpenRouter ? "https://openrouter.ai/api/v1" : context.config.perplexity.baseUrl
    const request = buildPerplexityRequest(query, options, {
      ...context.config.perplexity,
      apiKey,
      baseUrl,
      timeoutSeconds: context.config.timeoutSeconds,
      viaOpenRouter,
    })
    const response = await requestJson<PerplexityResponse>("perplexity", request.url, context, request)
    const results = normalizePerplexityResults(response.results ?? response.search_results)

    return {
      provider: "perplexity",
      query,
      answer: response.choices?.[0]?.message?.content?.trim(),
      citations: dedupeStrings(response.citations ?? results?.map((entry) => entry.url)),
      results,
    }
  },
}

function normalizePerplexityResults(results: PerplexitySearchResult[] | undefined) {
  return results?.flatMap((entry) => {
    if (!entry.url) {
      return []
    }

    return [
      {
        title: entry.title ?? entry.url,
        url: entry.url,
        snippet: entry.snippet ?? "",
        publishedDate: entry.date,
      },
    ]
  })
}

function normalizeOpenRouterModel(model: string): string {
  return model.includes("/") ? model : `perplexity/${model}`
}
