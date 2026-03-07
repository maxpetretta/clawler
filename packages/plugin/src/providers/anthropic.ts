import type { BetterSearchConfig } from "../config"
import { buildPromptWithGuidance, dedupeStrings, normalizeDomains, requestJson, resolveApiKey } from "./shared"
import type { SearchOptions, SearchProvider } from "./types"

type AnthropicCitation = {
  type?: string
  url?: string
}

type AnthropicTextBlock = {
  type?: "text"
  text?: string
  citations?: AnthropicCitation[]
}

type AnthropicWebSearchResultItem = {
  type?: string
  url?: string
  title?: string
  text?: string
}

type AnthropicWebSearchToolResultBlock = {
  type?: "web_search_tool_result"
  content?: { type?: string; error?: string } | AnthropicWebSearchResultItem[]
}

type AnthropicContentBlock = AnthropicTextBlock | AnthropicWebSearchToolResultBlock

type AnthropicResponse = {
  stop_reason?: string
  content?: AnthropicContentBlock[]
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

  if (includeDomains) {
    tool.allowed_domains = includeDomains
  }

  if (excludeDomains) {
    tool.blocked_domains = excludeDomains
  }

  if (options.country) {
    tool.user_location = {
      type: "approximate",
      ...(config.city ? { city: config.city } : {}),
      ...(config.region ? { region: config.region } : {}),
      country: options.country.toUpperCase(),
      ...(config.timezone ? { timezone: config.timezone } : {}),
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
      max_tokens: config.maxTokens,
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
    const textBlocks = response.content?.filter(isAnthropicTextBlock) ?? []
    const answer = textBlocks
      .map((block) => block.text)
      .filter(Boolean)
      .join("\n")
      .trim()
    const citations = collectAnthropicCitationUrls(response.content)

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
  const responses: AnthropicResponse[] = []
  const originalMessages = ((request.body as { messages?: unknown[] }).messages ?? []).slice()
  const continuationMessages: Array<{ role: "assistant"; content: AnthropicContentBlock[] }> = []
  const maxIterations = 5
  let iterations = 0
  let response = await requestJson<AnthropicResponse>("anthropic", request.url, context, request)

  responses.push(response)

  while (response.stop_reason === "pause_turn" && iterations < maxIterations) {
    continuationMessages.push({
      role: "assistant",
      content: response.content ?? [],
    })

    const continuedBody = {
      ...(request.body as Record<string, unknown>),
      messages: [...originalMessages, ...continuationMessages],
    }

    response = await requestJson<AnthropicResponse>("anthropic", request.url, context, {
      ...request,
      body: continuedBody,
    })

    responses.push(response)
    iterations += 1
  }

  return mergeAnthropicResponses(responses)
}

function mergeAnthropicResponses(responses: AnthropicResponse[]): AnthropicResponse {
  const lastResponse = responses.at(-1) ?? {}

  return {
    ...lastResponse,
    content: responses.flatMap((response) => response.content ?? []),
  }
}

function isAnthropicTextBlock(block: AnthropicContentBlock): block is AnthropicTextBlock {
  return block.type === "text"
}

function isAnthropicWebSearchToolResultBlock(
  block: AnthropicContentBlock,
): block is AnthropicWebSearchToolResultBlock {
  return block.type === "web_search_tool_result"
}

function collectAnthropicCitationUrls(content: AnthropicContentBlock[] | undefined): string[] {
  const citations: Array<string | undefined> = []

  for (const block of content ?? []) {
    if (isAnthropicTextBlock(block)) {
      citations.push(...(block.citations?.map((citation) => citation.url) ?? []))
      continue
    }

    if (!isAnthropicWebSearchToolResultBlock(block) || !Array.isArray(block.content)) {
      continue
    }

    citations.push(...block.content.map((item) => item.url))
  }

  return dedupeStrings(citations)
}
