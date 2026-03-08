import type { ClawlerConfig } from "../config"

export const providerIds = [
  "anthropic",
  "brave",
  "exa",
  "gemini",
  "openai",
  "parallel",
  "perplexity",
  "tavily",
] as const

export type ProviderId = (typeof providerIds)[number]

export function isProviderId(value: unknown): value is ProviderId {
  return (
    value === "anthropic" ||
    value === "brave" ||
    value === "exa" ||
    value === "gemini" ||
    value === "openai" ||
    value === "parallel" ||
    value === "perplexity" ||
    value === "tavily"
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
  config: ClawlerConfig
  env: Record<string, string | undefined>
  fetch: typeof fetch
}

export type SearchProvider = {
  id: ProviderId
  name: string
  envVars: string[]
  category: "traditional" | "llm" | "hybrid"
  isAvailable(config: ClawlerConfig, env?: Record<string, string | undefined>): boolean
  search(query: string, options: SearchOptions, context: SearchProviderContext): Promise<SearchResult>
}

export type ProviderStatus = {
  id: ProviderId
  name: string
  available: boolean
  envVars: string[]
  source: "config" | "env" | "missing"
}
