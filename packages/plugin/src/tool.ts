import { SearchCache } from "./cache"
import type { ClawlerConfig } from "./config"
import { formatSearchResult } from "./format"
import { getProviderById, resolveProvider } from "./providers/registry"
import { isProviderId, type ProviderId, providerIds, type SearchOptions, type SearchProvider } from "./providers/types"

type ClawlerToolParams = {
  query: string
  provider?: ProviderId
  count?: number
  freshness?: string
  country?: string
  search_lang?: string
  topic?: string
  include_domains?: string[]
  exclude_domains?: string[]
}

export function createClawlerTool(config: ClawlerConfig) {
  const cache = new SearchCache<string>(config.cacheTtlMinutes * 60 * 1000)

  return {
    name: config.toolName,
    description:
      "Search the web.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query string." },
        provider: {
          type: "string",
          enum: [...providerIds],
          description: "Optional provider override for this search call.",
        },
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
    async execute(_toolCallId: string, params: ClawlerToolParams) {
      const query = params.query.trim()

      if (query.length === 0) {
        throw new Error("Query must not be empty.")
      }

      if (params.provider !== undefined && !isProviderId(params.provider)) {
        throw new Error(`Unknown provider: ${String(params.provider)}`)
      }

      const env = process.env as Record<string, string | undefined>
      const provider = resolveProvider(config, env, params.provider)
      const options = resolveSearchOptions(config, params)
      const cacheKey = buildCacheKey(provider.id, query, options)
      const cached = cache.get(cacheKey)

      if (cached) {
        return cached
      }

      // Per-call provider param skips fallback chain
      const fallbackChain = params.provider ? [] : config.fallback
      const errors: string[] = []

      for (const target of [provider, ...resolveFallbackProviders(config, env, fallbackChain)]) {
        try {
          const result = await target.search(query, options, {
            config,
            env,
            fetch: globalThis.fetch,
          })
          const formatted = formatSearchResult(result)
          const key = buildCacheKey(target.id, query, options)

          cache.set(key, formatted)
          return formatted
        } catch (err) {
          errors.push(`${target.id}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }

      throw new Error(`All providers failed:\n${errors.join("\n")}`)
    },
  }
}

export function resolveSearchOptions(config: ClawlerConfig, params: ClawlerToolParams): SearchOptions {
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

function resolveFallbackProviders(
  config: ClawlerConfig,
  env: Record<string, string | undefined>,
  fallbackIds: ProviderId[],
): SearchProvider[] {
  const providers: SearchProvider[] = []

  for (const id of fallbackIds) {
    try {
      const provider = getProviderById(id)
      if (provider.isAvailable(config, env)) {
        providers.push(provider)
      }
    } catch {
      // Unknown provider ID — skip
    }
  }

  return providers
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
