import { parseFreshness } from "./freshness"
import { asSearchResultItem, buildQueryWithDomainFilters, requestJson, resolveApiKey } from "./shared"
import type { SearchOptions, SearchProvider } from "./types"

type BraveResponse = {
  web?: {
    results?: Array<{
      title?: string
      url?: string
      description?: string
      age?: string
      extra_snippets?: string[]
    }>
  }
}

export function buildBraveRequest(query: string, options: SearchOptions, apiKey: string, timeoutSeconds: number) {
  const params = new URLSearchParams({
    q: buildQueryWithDomainFilters(query, options),
    count: String(options.maxResults ?? 5),
  })
  const freshness = parseFreshness(options.freshness)

  if (freshness?.kind === "relative") {
    params.set("freshness", freshness.brave)
  } else if (freshness?.kind === "range") {
    params.set("freshness", `${freshness.startDate}to${freshness.endDate}`)
  }

  if (options.country) {
    params.set("country", options.country.toUpperCase())
  }

  if (options.searchLang) {
    params.set("search_lang", options.searchLang.toLowerCase())
    params.set("ui_lang", options.searchLang.toLowerCase())
  }

  return {
    url: `https://api.search.brave.com/res/v1/web/search?${params.toString()}`,
    method: "GET" as const,
    headers: {
      "X-Subscription-Token": apiKey,
    },
    timeoutSeconds,
  }
}

export const braveProvider: SearchProvider = {
  id: "brave",
  name: "Brave",
  envVars: ["BRAVE_API_KEY"],
  category: "traditional",
  isAvailable(config, env = process.env) {
    return Boolean(resolveApiKey(config, "brave", env))
  },
  async search(query, options, context) {
    const apiKey = resolveApiKey(context.config, "brave", context.env)

    if (!apiKey) {
      throw new Error("Brave is not configured.")
    }

    const request = buildBraveRequest(query, options, apiKey, context.config.timeoutSeconds)
    const response = await requestJson<BraveResponse>("brave", request.url, context, request)
    const results =
      response.web?.results
        ?.filter((entry) => Boolean(entry.url))
        .map((entry) =>
          asSearchResultItem({
            title: entry.title ?? entry.url ?? "Untitled result",
            url: entry.url ?? "",
            snippet: [entry.description, ...(entry.extra_snippets ?? [])].filter(Boolean).join(" "),
            publishedDate: entry.age,
          }),
        ) ?? []

    return {
      provider: "brave",
      query,
      results,
    }
  },
}
