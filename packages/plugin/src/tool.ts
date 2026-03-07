import { SearchCache } from "./cache"
import type { BetterSearchConfig } from "./config"
import { formatSearchResult } from "./format"
import { resolveProvider } from "./providers/registry"
import type { SearchOptions } from "./providers/types"

type BetterSearchToolParams = {
  query: string
  count?: number
  freshness?: string
  country?: string
  search_lang?: string
  topic?: string
  include_domains?: string[]
  exclude_domains?: string[]
}

export function createBetterSearchTool(config: BetterSearchConfig) {
  const cache = new SearchCache<string>(config.cacheTtlMinutes * 60 * 1000)

  return {
    name: config.toolName,
    description:
      "Search the web using the configured Better Search provider. Use this instead of the built-in web_search tool.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query string." },
        count: { type: "number", description: "Number of results to return (1-20).", minimum: 1, maximum: 20 },
        freshness: { type: "string", description: "Recency filter such as pd, pw, pm, py, or a date range." },
        country: { type: "string", description: "2-letter country code for region-specific results." },
        search_lang: { type: "string", description: "2-letter ISO language code for search results." },
        topic: { type: "string", description: "Search category such as general, news, or finance." },
        include_domains: {
          type: "array",
          items: { type: "string" },
          description: "Optional domain allowlist.",
        },
        exclude_domains: {
          type: "array",
          items: { type: "string" },
          description: "Optional domain denylist.",
        },
      },
      required: ["query"],
    },
    async execute(_toolCallId: string, params: BetterSearchToolParams) {
      const query = params.query.trim()

      if (query.length === 0) {
        throw new Error("Query must not be empty.")
      }

      const env = process.env as Record<string, string | undefined>
      const provider = resolveProvider(config, env)
      const options = resolveSearchOptions(config, params)
      const cacheKey = buildCacheKey(provider.id, query, options)
      const cached = cache.get(cacheKey)

      if (cached) {
        return cached
      }

      const result = await provider.search(query, options, {
        config,
        env,
        fetch: globalThis.fetch,
      })
      const formatted = formatSearchResult(result)

      cache.set(cacheKey, formatted)
      return formatted
    },
  }
}

export function resolveSearchOptions(config: BetterSearchConfig, params: BetterSearchToolParams): SearchOptions {
  return {
    maxResults: params.count ?? config.maxResults,
    freshness: params.freshness ?? config.searchDefaults.freshness,
    country: params.country ?? config.searchDefaults.country,
    searchLang: params.search_lang ?? config.searchDefaults.searchLang,
    topic: params.topic ?? config.searchDefaults.topic,
    includeDomains: params.include_domains ?? config.searchDefaults.includeDomains,
    excludeDomains: params.exclude_domains ?? config.searchDefaults.excludeDomains,
  }
}

function buildCacheKey(providerId: string, query: string, options: SearchOptions): string {
  return `${providerId}:${query}:${stableStringify(options)}`
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`
  }

  return JSON.stringify(value)
}
