import type { BetterSearchConfig } from "../config"

export const providerIds = [
  "brave",
  "exa",
  "tavily",
  "perplexity",
  "parallel",
  "gemini",
  "openai",
  "anthropic",
] as const

export type ProviderId = (typeof providerIds)[number]

export function isProviderId(value: unknown): value is ProviderId {
  return (
    value === "brave" ||
    value === "exa" ||
    value === "tavily" ||
    value === "perplexity" ||
    value === "parallel" ||
    value === "gemini" ||
    value === "openai" ||
    value === "anthropic"
  )
}

export type SearchResultItem = {
  title: string
  url: string
  snippet: string
  publishedDate?: string
}

export type SearchOptions = {
  maxResults?: number
  freshness?: string
  country?: string
  searchLang?: string
  topic?: string
  includeDomains?: string[]
  excludeDomains?: string[]
}

export type SearchResult = {
  provider: ProviderId
  query: string
  results?: SearchResultItem[]
  answer?: string
  citations?: string[]
  meta?: Record<string, unknown>
}

export type SearchProviderContext = {
  config: BetterSearchConfig
  env: Record<string, string | undefined>
  fetch: typeof fetch
}

export type SearchProvider = {
  id: ProviderId
  name: string
  envVars: string[]
  category: "traditional" | "llm" | "hybrid"
  isAvailable(config: BetterSearchConfig, env?: Record<string, string | undefined>): boolean
  search(query: string, options: SearchOptions, context: SearchProviderContext): Promise<SearchResult>
}

export type ProviderStatus = {
  id: ProviderId
  name: string
  available: boolean
  envVars: string[]
  source: "config" | "env" | "missing"
}
