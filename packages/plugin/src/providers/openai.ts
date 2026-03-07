import type { BetterSearchConfig } from "../config"
import { buildPromptWithGuidance, dedupeStrings, normalizeDomains, requestJson, resolveApiKey } from "./shared"
import type { SearchOptions, SearchProvider } from "./types"

type OpenAIResponse = {
  output_text?: string
  output?: Array<{
    type?: string
    content?: Array<{
      type?: string
      text?: string
      annotations?: Array<{
        type?: string
        url?: string
      }>
    }>
    action?: {
      sources?: Array<{
        url?: string
      }>
    }
  }>
}

type OpenAIChatCompletionsResponse = {
  choices?: Array<{
    message?: {
      content?: string
      annotations?: Array<{
        type?: string
        url_citation?: {
          url?: string
        }
      }>
    }
  }>
}

type OpenAIRequestConfig = BetterSearchConfig["openai"] & {
  apiKey: string
  timeoutSeconds: number
}

export function buildOpenAIResponsesRequest(query: string, options: SearchOptions, config: OpenAIRequestConfig) {
  const includeDomains = normalizeDomains(options.includeDomains)
  const excludeDomains = normalizeDomains(options.excludeDomains)
  const tool: Record<string, unknown> = {
    type: "web_search",
    search_context_size: config.searchContextSize,
    external_web_access: config.externalWebAccess,
  }

  if (includeDomains || excludeDomains) {
    tool.filters = {
      ...(includeDomains ? { allowed_domains: includeDomains } : {}),
      ...(excludeDomains ? { blocked_domains: excludeDomains } : {}),
    }
  }

  if (options.country) {
    tool.user_location = {
      type: "approximate",
      country: options.country.toUpperCase(),
    }
  }

  return {
    url: "https://api.openai.com/v1/responses",
    method: "POST" as const,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
    },
    body: {
      model: config.model,
      reasoning: {
        effort: config.reasoningEffort,
      },
      tool_choice: "auto",
      input: buildPromptWithGuidance(query, options, {
        country: true,
        includeDomains: true,
      }),
      tools: [tool],
      ...(config.includeSources ? { include: ["web_search_call.action.sources"] } : {}),
    },
    timeoutSeconds: config.timeoutSeconds,
  }
}

export function buildOpenAIChatCompletionsRequest(query: string, options: SearchOptions, config: OpenAIRequestConfig) {
  return {
    url: "https://api.openai.com/v1/chat/completions",
    method: "POST" as const,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
    },
    body: {
      model: config.chatCompletionsModel,
      messages: [
        {
          role: "user",
          content: buildPromptWithGuidance(query, options, {}),
        },
      ],
    },
    timeoutSeconds: config.timeoutSeconds,
  }
}

export const openaiProvider: SearchProvider = {
  id: "openai",
  name: "OpenAI",
  envVars: ["OPENAI_API_KEY"],
  category: "llm",
  isAvailable(config, env = process.env) {
    return Boolean(resolveApiKey(config, "openai", env))
  },
  async search(query, options, context) {
    const apiKey = resolveApiKey(context.config, "openai", context.env)

    if (!apiKey) {
      throw new Error("OpenAI is not configured.")
    }

    const requestConfig = {
      ...context.config.openai,
      apiKey,
      timeoutSeconds: context.config.timeoutSeconds,
    }

    if (shouldUseOpenAIChatCompletions(options, context.config.openai.apiMode)) {
      const request = buildOpenAIChatCompletionsRequest(query, options, requestConfig)
      const response = await requestJson<OpenAIChatCompletionsResponse>("openai", request.url, context, request)
      const message = response.choices?.[0]?.message

      return {
        provider: "openai",
        query,
        answer: message?.content?.trim(),
        citations: dedupeStrings(message?.annotations?.map((annotation) => annotation.url_citation?.url)),
      }
    }

    const request = buildOpenAIResponsesRequest(query, options, requestConfig)
    const response = await requestJson<OpenAIResponse>("openai", request.url, context, request)
    const messageParts =
      response.output?.filter((item) => item.type === "message").flatMap((item) => item.content ?? []) ?? []
    const answer =
      response.output_text ??
      messageParts
        .map((part) => part.text)
        .filter(Boolean)
        .join("\n")
        .trim()
    const citations = dedupeStrings([
      ...messageParts.flatMap((part) => part.annotations?.map((annotation) => annotation.url) ?? []),
      ...(response.output
        ?.filter((item) => item.type === "web_search_call")
        .flatMap((item) => item.action?.sources?.map((source) => source.url) ?? []) ?? []),
    ])

    return {
      provider: "openai",
      query,
      answer,
      citations,
    }
  },
}

export function shouldUseOpenAIChatCompletions(
  options: SearchOptions,
  apiMode: BetterSearchConfig["openai"]["apiMode"],
): boolean {
  if (apiMode === "chat_completions_search") {
    return true
  }

  if (apiMode === "responses") {
    return false
  }

  return !(options.includeDomains?.length || options.excludeDomains?.length || options.country)
}
