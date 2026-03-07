import type { BetterSearchConfig } from "../config"
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
  rich?: {
    type?: string
    hint?: {
      vertical?: string
      callback_key?: string
    }
  }
}

type BraveRichResponse = Record<string, unknown>

export function buildBraveRequest(
  query: string,
  options: SearchOptions,
  apiKey: string,
  timeoutSeconds: number,
  config: BetterSearchConfig["brave"] = { enableRichResults: true },
) {
  const params = new URLSearchParams({
    q: buildQueryWithDomainFilters(query, options),
    count: String(options.maxResults ?? 5),
  })
  const freshness = parseFreshness(options.freshness)

  params.set("extra_snippets", "true")

  if (config.enableRichResults) {
    params.set("enable_rich_callback", "1")
  }

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

  if (config.safesearch) {
    params.set("safesearch", config.safesearch)
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

function buildBraveRichRequest(callbackKey: string, apiKey: string, timeoutSeconds: number) {
  const params = new URLSearchParams({
    callback_key: callbackKey,
  })

  return {
    url: `https://api.search.brave.com/res/v1/web/rich?${params.toString()}`,
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

    const request = buildBraveRequest(query, options, apiKey, context.config.timeoutSeconds, context.config.brave)
    const response = await requestJson<BraveResponse>("brave", request.url, context, request)
    let richData: BraveRichResponse | undefined

    if (context.config.brave.enableRichResults) {
      const callbackKey = response.rich?.hint?.callback_key

      if (callbackKey) {
        const richRequest = buildBraveRichRequest(callbackKey, apiKey, context.config.timeoutSeconds)
        richData = await requestJson<BraveRichResponse>("brave", richRequest.url, context, richRequest)
      }
    }

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
      ...(richData ? { meta: { rich: richData } } : {}),
    }
  },
}
