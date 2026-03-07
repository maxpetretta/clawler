import type { ClawlerConfig } from "../config"
import { fetchJson, type JsonRequest } from "../http"
import { describeFreshness } from "./freshness"
import type { ProviderId, SearchOptions, SearchProviderContext, SearchResultItem } from "./types"

const countryNames = new Intl.DisplayNames(["en"], { type: "region" })

const providerNames: Record<ProviderId, string> = {
  brave: "Brave",
  exa: "Exa",
  tavily: "Tavily",
  perplexity: "Perplexity",
  parallel: "Parallel",
  gemini: "Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic",
}

const providerEnvVarMap: Record<ProviderId, string[]> = {
  brave: ["BRAVE_API_KEY"],
  exa: ["EXA_API_KEY"],
  tavily: ["TAVILY_API_KEY"],
  perplexity: ["PERPLEXITY_API_KEY", "OPENROUTER_API_KEY"],
  parallel: ["PARALLEL_API_KEY"],
  gemini: ["GEMINI_API_KEY", "GOOGLE_AI_API_KEY"],
  openai: ["OPENAI_API_KEY"],
  anthropic: ["ANTHROPIC_API_KEY"],
}

type ApproximateUserLocation = {
  type: "approximate"
  country?: string
  city?: string
  region?: string
  timezone?: string
}

type UrlCitation = {
  url?: string
  title?: string
}

export function createProviderRequest(
  provider: ProviderId,
  url: string,
  context: SearchProviderContext,
  init: Omit<JsonRequest, "url" | "provider" | "timeoutSeconds">,
): JsonRequest {
  return {
    url,
    provider,
    timeoutSeconds: context.config.timeoutSeconds,
    ...init,
  }
}

export function requestJson<TResponse>(
  provider: ProviderId,
  url: string,
  context: SearchProviderContext,
  init: Omit<JsonRequest, "url" | "provider" | "timeoutSeconds">,
): Promise<TResponse> {
  return fetchJson<TResponse>(createProviderRequest(provider, url, context, init), context.fetch)
}

export function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .replace(/^https?:\/\//iu, "")
    .replace(/^www\./iu, "")
    .replace(/\/+$/u, "")
}

export function normalizeDomains(domains: string[] | undefined): string[] | undefined {
  const normalized = domains?.map(normalizeDomain).filter((value) => value.length > 0)
  return normalized && normalized.length > 0 ? Array.from(new Set(normalized)) : undefined
}

export function buildQueryWithDomainFilters(query: string, options: SearchOptions): string {
  const include = normalizeDomains(options.includeDomains)?.map((domain) => `site:${domain}`) ?? []
  const exclude = normalizeDomains(options.excludeDomains)?.map((domain) => `-site:${domain}`) ?? []
  return [query.trim(), ...include, ...exclude].join(" ").trim()
}

export function buildPromptWithGuidance(
  query: string,
  options: SearchOptions,
  supported: Partial<Record<keyof SearchOptions, true>>,
): string {
  const guidance: string[] = []

  if (options.topic && !supported.topic) {
    guidance.push(`Focus on ${options.topic} sources.`)
  }

  if (options.country && !supported.country) {
    guidance.push(`Prefer results relevant to ${options.country}.`)
  }

  if (options.searchLang && !supported.searchLang) {
    guidance.push(`Prefer sources written in language ${options.searchLang}.`)
  }

  if (options.freshness && !supported.freshness) {
    const range = describeFreshness(options.freshness)
    if (range) {
      guidance.push(`Prefer sources published within ${range}.`)
    }
  }

  if (options.includeDomains && options.includeDomains.length > 0 && !supported.includeDomains) {
    guidance.push(`Only use sources from: ${normalizeDomains(options.includeDomains)?.join(", ")}.`)
  }

  if (options.excludeDomains && options.excludeDomains.length > 0 && !supported.excludeDomains) {
    guidance.push(`Do not use sources from: ${normalizeDomains(options.excludeDomains)?.join(", ")}.`)
  }

  if (guidance.length === 0) {
    return query.trim()
  }

  return `${query.trim()}\n\nSearch constraints:\n- ${guidance.join("\n- ")}`
}

export function trimSnippet(value: string | undefined, maxLength = 320): string {
  if (!value) {
    return ""
  }

  const normalized = value.replace(/\s+/gu, " ").trim()

  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`
}

export function dedupeStrings(values: Array<string | undefined> | undefined): string[] {
  return Array.from(new Set((values ?? []).filter((value): value is string => Boolean(value && value.length > 0))))
}

export function buildApproximateUserLocation({
  country,
  city,
  region,
  timezone,
}: {
  country?: string
  city?: string
  region?: string
  timezone?: string
}): ApproximateUserLocation | undefined {
  const normalizedCountry = country?.trim().toUpperCase()
  const normalizedCity = city?.trim()
  const normalizedRegion = region?.trim()
  const normalizedTimezone = timezone?.trim()

  if (!normalizedCountry && !normalizedCity && !normalizedRegion && !normalizedTimezone) {
    return undefined
  }

  return {
    type: "approximate",
    ...(normalizedCountry ? { country: normalizedCountry } : {}),
    ...(normalizedCity ? { city: normalizedCity } : {}),
    ...(normalizedRegion ? { region: normalizedRegion } : {}),
    ...(normalizedTimezone ? { timezone: normalizedTimezone } : {}),
  }
}

export function formatUrlCitation(citation: UrlCitation | undefined): string | undefined {
  const url = citation?.url?.trim()
  const title = citation?.title?.trim()

  if (!url) {
    return undefined
  }

  return title ? `${title} — ${url}` : url
}

export function dedupeUrlCitations(citations: Array<UrlCitation | undefined>): string[] {
  const citationsByUrl = new Map<string, string>()

  for (const citation of citations) {
    const url = citation?.url?.trim()

    if (!url) {
      continue
    }

    const formatted = formatUrlCitation(citation) ?? url
    const existing = citationsByUrl.get(url)

    if (!existing || (existing === url && formatted !== url)) {
      citationsByUrl.set(url, formatted)
    }
  }

  return Array.from(citationsByUrl.values())
}

export function resolveApiKey(
  config: ClawlerConfig,
  providerId: ProviderId,
  env: Record<string, string | undefined>,
): string | undefined {
  const configValue = readProviderApiKey(config, providerId)
  if (configValue) {
    return configValue
  }

  if (providerId === "perplexity") {
    return env.PERPLEXITY_API_KEY ?? env.OPENROUTER_API_KEY
  }

  if (providerId === "gemini") {
    return env.GEMINI_API_KEY ?? env.GOOGLE_AI_API_KEY
  }

  const envVar = providerEnvVars(providerId)[0]
  return env[envVar]
}

export function hasApiKey(
  config: ClawlerConfig,
  providerId: ProviderId,
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(resolveApiKey(config, providerId, env))
}

export function requireApiKey(
  config: ClawlerConfig,
  providerId: ProviderId,
  env: Record<string, string | undefined> = process.env,
): string {
  const apiKey = resolveApiKey(config, providerId, env)

  if (!apiKey) {
    throw new Error(`${providerNames[providerId]} is not configured.`)
  }

  return apiKey
}

export function providerEnvVars(providerId: ProviderId): string[] {
  return providerEnvVarMap[providerId]
}

export function providerCredentialSource(
  config: ClawlerConfig,
  providerId: ProviderId,
  env: Record<string, string | undefined>,
): "config" | "env" | "missing" {
  if (readProviderApiKey(config, providerId)) {
    return "config"
  }

  return providerEnvVars(providerId).some((envVar) => Boolean(env[envVar])) ? "env" : "missing"
}

export function isoCountryName(regionCode: string | undefined): string | undefined {
  if (!regionCode || regionCode.length !== 2) {
    return undefined
  }

  return countryNames.of(regionCode.toUpperCase()) ?? undefined
}

export function asSearchResultItem(item: SearchResultItem): SearchResultItem {
  return {
    title: item.title.trim() || item.url,
    url: item.url.trim(),
    snippet: trimSnippet(item.snippet),
    publishedDate: item.publishedDate,
  }
}

function readProviderApiKey(config: ClawlerConfig, providerId: ProviderId): string | undefined {
  return config[providerId].apiKey
}
