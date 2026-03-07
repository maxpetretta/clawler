import type { ExaCategory } from "../config"
import { parseFreshness, toIsoDateEnd, toIsoDateStart } from "./freshness"
import { asSearchResultItem, hasApiKey, normalizeDomains, providerEnvVars, requestJson, requireApiKey } from "./shared"
import type { SearchOptions, SearchProvider } from "./types"

const DEFAULT_EXA_HIGHLIGHT_MAX_CHARACTERS = 4000

const EXA_TOPIC_CATEGORY_MAP: Record<string, ExaCategory> = {
  news: "news",
  finance: "financial report",
}

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

function resolveExaCategory(options: SearchOptions, configuredCategory?: ExaCategory): ExaCategory | undefined {
  if (configuredCategory) {
    return configuredCategory
  }

  if (!options.topic) {
    return undefined
  }

  return EXA_TOPIC_CATEGORY_MAP[options.topic]
}

export function createExaBody(query: string, options: SearchOptions, config: ExaRequestConfig) {
  const freshness = parseFreshness(options.freshness)
  const body: Record<string, unknown> = {
    query,
    type: config.type,
    numResults: options.maxResults ?? 5,
    contents: {
      highlights: {
        maxCharacters: DEFAULT_EXA_HIGHLIGHT_MAX_CHARACTERS,
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

  const category = resolveExaCategory(options, config.category)

  if (category) {
    body.category = category
  }

  if (typeof config.maxAgeHours === "number") {
    body.maxAgeHours = config.maxAgeHours
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
  category?: ExaCategory
  maxAgeHours?: number
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
    body: createExaBody(query, options, config),
    timeoutSeconds: config.timeoutSeconds,
  }
}

export const exaProvider: SearchProvider = {
  id: "exa",
  name: "Exa",
  envVars: providerEnvVars("exa"),
  category: "traditional",
  isAvailable(config, env = process.env) {
    return hasApiKey(config, "exa", env)
  },
  async search(query, options, context) {
    const apiKey = requireApiKey(context.config, "exa", context.env)
    const request = buildExaRequest(query, options, {
      apiKey,
      type: context.config.exa.type,
      category: context.config.exa.category,
      maxAgeHours: context.config.exa.maxAgeHours,
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
