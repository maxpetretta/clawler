import type { ClawlerConfig } from "../config"
import {
  buildApproximateUserLocation,
  buildPromptWithGuidance,
  dedupeUrlCitations,
  defineProvider,
  normalizeDomains,
  requestJson,
  requireApiKey,
} from "./shared"
import type { SearchOptions } from "./types"

type OpenAICitation = {
  url?: string
  title?: string
  start_index?: number
  end_index?: number
}

type OpenAIResponse = {
  output_text?: string
  output?: Array<{
    type?: string
    content?: Array<{
      type?: string
      text?: string
      annotations?: Array<
        {
          type?: string
        } & OpenAICitation
      >
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
        url_citation?: OpenAICitation
      }>
    }
  }>
}

type OpenAIRequestConfig = ClawlerConfig["openai"] & {
  apiKey: string
  timeoutSeconds: number
}

function buildOpenAIUserLocation(options: SearchOptions, config: OpenAIRequestConfig) {
  return buildApproximateUserLocation({
    country: options.country,
    city: config.city,
    region: config.region,
    timezone: config.timezone,
  })
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

  const userLocation = buildOpenAIUserLocation(options, config)
  if (userLocation) {
    tool.user_location = userLocation
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
      tool_choice: { type: "web_search" },
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

export const openaiProvider = defineProvider("openai", "llm", async (query, options, context) => {
  const apiKey = requireApiKey(context.config, "openai", context.env)
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
      citations: dedupeUrlCitations(message?.annotations?.map((annotation) => annotation.url_citation) ?? []),
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
  const citations = dedupeUrlCitations([
    ...messageParts.flatMap((part) => part.annotations ?? []),
    ...(response.output
      ?.filter((item) => item.type === "web_search_call")
      .flatMap((item) => item.action?.sources?.map((source) => ({ url: source.url })) ?? []) ?? []),
  ])

  return {
    provider: "openai",
    query,
    answer,
    citations,
  }
})

export function shouldUseOpenAIChatCompletions(
  options: SearchOptions,
  apiMode: ClawlerConfig["openai"]["apiMode"],
): boolean {
  if (apiMode === "chat_completions_search") {
    return true
  }

  if (apiMode === "responses") {
    return false
  }

  return !(options.includeDomains?.length || options.excludeDomains?.length || options.country)
}
