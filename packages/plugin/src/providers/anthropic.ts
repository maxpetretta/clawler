import type { BetterSearchConfig } from "../config"
import { buildPromptWithGuidance, dedupeStrings, normalizeDomains, requestJson, resolveApiKey } from "./shared"
import type { SearchOptions, SearchProvider } from "./types"

type AnthropicCitation = {
  type?: string
  url?: string
}

type AnthropicResponse = {
  stop_reason?: string
  content?: Array<
    | {
        type?: "text"
        text?: string
        citations?: AnthropicCitation[]
      }
    | {
        type?: "web_search_tool_result"
        content?:
          | { type?: string; error?: string }
          | Array<{
              type?: string
              url?: string
              title?: string
              text?: string
            }>
      }
  >
}

type AnthropicRequestConfig = BetterSearchConfig["anthropic"] & {
  apiKey: string
  timeoutSeconds: number
}

export function buildAnthropicRequest(query: string, options: SearchOptions, config: AnthropicRequestConfig) {
  const includeDomains = normalizeDomains(options.includeDomains)
  const excludeDomains = normalizeDomains(options.excludeDomains)
  const tool: Record<string, unknown> = {
    type: config.toolVersion,
    name: "web_search",
    max_uses: config.maxUses,
  }

  if (config.toolVersion === "web_search_20260209" && config.directOnly) {
    tool.allowed_callers = ["direct"]
  }

  if (includeDomains && excludeDomains) {
    tool.allowed_domains = includeDomains
  } else if (includeDomains) {
    tool.allowed_domains = includeDomains
  } else if (excludeDomains) {
    tool.blocked_domains = excludeDomains
  }

  if (options.country) {
    tool.user_location = {
      type: "approximate",
      country: options.country.toUpperCase(),
    }
  }

  return {
    url: "https://api.anthropic.com/v1/messages",
    method: "POST" as const,
    headers: {
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "x-api-key": config.apiKey,
    },
    body: {
      model: config.model,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: buildPromptWithGuidance(query, options, {
            country: true,
            includeDomains: true,
            excludeDomains: true,
          }),
        },
      ],
      tools: [tool],
    },
    timeoutSeconds: config.timeoutSeconds,
  }
}

export const anthropicProvider: SearchProvider = {
  id: "anthropic",
  name: "Anthropic",
  envVars: ["ANTHROPIC_API_KEY"],
  category: "llm",
  isAvailable(config, env = process.env) {
    return Boolean(resolveApiKey(config, "anthropic", env))
  },
  async search(query, options, context) {
    const apiKey = resolveApiKey(context.config, "anthropic", context.env)

    if (!apiKey) {
      throw new Error("Anthropic is not configured.")
    }

    const request = buildAnthropicRequest(query, options, {
      ...context.config.anthropic,
      apiKey,
      timeoutSeconds: context.config.timeoutSeconds,
    })
    const response = await runAnthropicRequest(request, context)
    const textBlocks = response.content?.filter((block) => block.type === "text") ?? []
    const answer = textBlocks
      .map((block) => block.text)
      .filter(Boolean)
      .join("\n")
      .trim()
    const citations = dedupeStrings(
      textBlocks.flatMap((block) => block.citations?.map((citation) => citation.url) ?? []),
    )

    return {
      provider: "anthropic",
      query,
      answer,
      citations,
    }
  },
}

async function runAnthropicRequest(
  request: ReturnType<typeof buildAnthropicRequest>,
  context: Parameters<SearchProvider["search"]>[2],
): Promise<AnthropicResponse> {
  const initialResponse = await requestJson<AnthropicResponse>("anthropic", request.url, context, request)

  if (initialResponse.stop_reason !== "pause_turn") {
    return initialResponse
  }

  const continuedBody = {
    ...(request.body as Record<string, unknown>),
    messages: [
      ...((request.body as { messages: unknown[] }).messages ?? []),
      {
        role: "assistant",
        content: initialResponse.content ?? [],
      },
    ],
  }

  return requestJson<AnthropicResponse>("anthropic", request.url, context, {
    ...request,
    body: continuedBody,
  })
}
