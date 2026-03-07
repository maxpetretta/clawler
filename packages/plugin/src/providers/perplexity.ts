import type { BetterSearchConfig } from "../config"
import { parseFreshness, toUsDate } from "./freshness"
import { buildPromptWithGuidance, dedupeStrings, normalizeDomains, requestJson, resolveApiKey } from "./shared"
import type { SearchOptions, SearchProvider } from "./types"

type PerplexityResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  citations?: string[]
  search_results?: Array<{
    title?: string
    url?: string
    snippet?: string
    date?: string
  }>
}

type PerplexityRequestConfig = BetterSearchConfig["perplexity"] & {
  apiKey: string
  timeoutSeconds: number
  viaOpenRouter: boolean
}

export function buildPerplexityRequest(query: string, options: SearchOptions, config: PerplexityRequestConfig) {
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

export const perplexityProvider: SearchProvider = {
  id: "perplexity",
  name: "Perplexity",
  envVars: ["PERPLEXITY_API_KEY", "OPENROUTER_API_KEY"],
  category: "llm",
  isAvailable(config, env = process.env) {
    return Boolean(resolveApiKey(config, "perplexity", env))
  },
  async search(query, options, context) {
    const apiKey = resolveApiKey(context.config, "perplexity", context.env)

    if (!apiKey) {
      throw new Error("Perplexity is not configured.")
    }

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

    return {
      provider: "perplexity",
      query,
      answer: response.choices?.[0]?.message?.content?.trim(),
      citations: dedupeStrings(response.citations ?? response.search_results?.map((entry) => entry.url)),
      results: response.search_results?.flatMap((entry) => {
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
      }),
    }
  },
}

function normalizeOpenRouterModel(model: string): string {
  return model.includes("/") ? model : `perplexity/${model}`
}
