import type { ProviderId } from "./providers/types"

export type BetterSearchProviderSelection = ProviderId | "auto"
export type ExaSearchType = "neural" | "fast" | "auto" | "deep" | "deep-reasoning" | "instant"
export type TavilySearchDepth = "basic" | "advanced" | "fast" | "ultra-fast"
export type TavilyAnswerMode = boolean | "basic" | "advanced"
export type ParallelSearchMode = "fast" | "standard"
export type AnthropicToolVersion = "web_search_20250305" | "web_search_20260209"
export type OpenAIReasoningEffort = "low" | "medium" | "high"
export type OpenAISearchContextSize = "low" | "medium" | "high"
export type OpenAIApiMode = "auto" | "responses" | "chat_completions_search"

type ApiKeyConfig = {
  apiKey?: string
}

export type BetterSearchSharedOptions = {
  freshness?: string
  country?: string
  searchLang?: string
  topic?: string
  includeDomains?: string[]
  excludeDomains?: string[]
}

export type BetterSearchConfig = {
  provider: BetterSearchProviderSelection
  toolName: string
  maxResults: number
  cacheTtlMinutes: number
  timeoutSeconds: number
  searchDefaults: BetterSearchSharedOptions
  brave: ApiKeyConfig
  exa: ApiKeyConfig & {
    type: ExaSearchType
  }
  tavily: ApiKeyConfig & {
    searchDepth: TavilySearchDepth
    includeAnswer: TavilyAnswerMode
    autoParameters: boolean
  }
  perplexity: ApiKeyConfig & {
    baseUrl: string
    model: string
  }
  parallel: ApiKeyConfig & {
    mode: ParallelSearchMode
    maxCharsPerResult: number
  }
  gemini: ApiKeyConfig & {
    model: string
  }
  openai: ApiKeyConfig & {
    apiMode: OpenAIApiMode
    model: string
    chatCompletionsModel: string
    reasoningEffort: OpenAIReasoningEffort
    searchContextSize: OpenAISearchContextSize
    includeSources: boolean
    externalWebAccess: boolean
  }
  anthropic: ApiKeyConfig & {
    model: string
    toolVersion: AnthropicToolVersion
    maxUses: number
    directOnly: boolean
  }
}

const DEFAULT_CONFIG: BetterSearchConfig = {
  provider: "auto",
  toolName: "better_search",
  maxResults: 5,
  cacheTtlMinutes: 15,
  timeoutSeconds: 60,
  searchDefaults: {},
  brave: {},
  exa: {
    type: "auto",
  },
  tavily: {
    searchDepth: "advanced",
    includeAnswer: true,
    autoParameters: true,
  },
  perplexity: {
    baseUrl: "https://api.perplexity.ai",
    model: "sonar-pro",
  },
  parallel: {
    mode: "fast",
    maxCharsPerResult: 1500,
  },
  gemini: {
    model: "gemini-2.5-flash",
  },
  openai: {
    apiMode: "auto",
    model: "gpt-5-mini",
    chatCompletionsModel: "gpt-5-search-api",
    reasoningEffort: "low",
    searchContextSize: "medium",
    includeSources: true,
    externalWebAccess: true,
  },
  anthropic: {
    model: "claude-sonnet-4-6",
    toolVersion: "web_search_20260209",
    maxUses: 5,
    directOnly: true,
  },
}

export function resolveConfig(pluginConfig: unknown): BetterSearchConfig {
  if (!pluginConfig || typeof pluginConfig !== "object") {
    return DEFAULT_CONFIG
  }

  const record = pluginConfig as Record<string, unknown>

  return {
    provider: isProviderSelection(record.provider) ? record.provider : DEFAULT_CONFIG.provider,
    toolName: asNonEmptyString(record.toolName) ?? DEFAULT_CONFIG.toolName,
    maxResults: asBoundedPositiveInteger(record.maxResults, 1, 20) ?? DEFAULT_CONFIG.maxResults,
    cacheTtlMinutes: asBoundedPositiveInteger(record.cacheTtlMinutes, 0) ?? DEFAULT_CONFIG.cacheTtlMinutes,
    timeoutSeconds: asBoundedPositiveInteger(record.timeoutSeconds, 1) ?? DEFAULT_CONFIG.timeoutSeconds,
    searchDefaults: {
      freshness: asNonEmptyString(readObject(record.searchDefaults)?.freshness),
      country: asNonEmptyString(readObject(record.searchDefaults)?.country),
      searchLang: asNonEmptyString(readObject(record.searchDefaults)?.searchLang),
      topic: asNonEmptyString(readObject(record.searchDefaults)?.topic),
      includeDomains: asStringArray(readObject(record.searchDefaults)?.includeDomains),
      excludeDomains: asStringArray(readObject(record.searchDefaults)?.excludeDomains),
    },
    brave: {
      apiKey: readApiKey(record.brave),
    },
    exa: {
      apiKey: readApiKey(record.exa),
      type: asExaSearchType(readObject(record.exa)?.type) ?? DEFAULT_CONFIG.exa.type,
    },
    tavily: {
      apiKey: readApiKey(record.tavily),
      searchDepth: asTavilySearchDepth(readObject(record.tavily)?.searchDepth) ?? DEFAULT_CONFIG.tavily.searchDepth,
      includeAnswer:
        asTavilyAnswerMode(readObject(record.tavily)?.includeAnswer) ?? DEFAULT_CONFIG.tavily.includeAnswer,
      autoParameters: asBoolean(readObject(record.tavily)?.autoParameters) ?? DEFAULT_CONFIG.tavily.autoParameters,
    },
    perplexity: {
      apiKey: readApiKey(record.perplexity),
      baseUrl: asNonEmptyString(readObject(record.perplexity)?.baseUrl) ?? DEFAULT_CONFIG.perplexity.baseUrl,
      model: asNonEmptyString(readObject(record.perplexity)?.model) ?? DEFAULT_CONFIG.perplexity.model,
    },
    parallel: {
      apiKey: readApiKey(record.parallel),
      mode: asParallelSearchMode(readObject(record.parallel)?.mode) ?? DEFAULT_CONFIG.parallel.mode,
      maxCharsPerResult:
        asBoundedPositiveInteger(readObject(record.parallel)?.maxCharsPerResult, 100) ??
        DEFAULT_CONFIG.parallel.maxCharsPerResult,
    },
    gemini: {
      apiKey: readApiKey(record.gemini),
      model: asNonEmptyString(readObject(record.gemini)?.model) ?? DEFAULT_CONFIG.gemini.model,
    },
    openai: {
      apiKey: readApiKey(record.openai),
      apiMode: asOpenAIApiMode(readObject(record.openai)?.apiMode) ?? DEFAULT_CONFIG.openai.apiMode,
      model: asNonEmptyString(readObject(record.openai)?.model) ?? DEFAULT_CONFIG.openai.model,
      chatCompletionsModel:
        asNonEmptyString(readObject(record.openai)?.chatCompletionsModel) ?? DEFAULT_CONFIG.openai.chatCompletionsModel,
      reasoningEffort:
        asOpenAIReasoningEffort(readObject(record.openai)?.reasoningEffort) ?? DEFAULT_CONFIG.openai.reasoningEffort,
      searchContextSize:
        asOpenAISearchContextSize(readObject(record.openai)?.searchContextSize) ??
        DEFAULT_CONFIG.openai.searchContextSize,
      includeSources: asBoolean(readObject(record.openai)?.includeSources) ?? DEFAULT_CONFIG.openai.includeSources,
      externalWebAccess:
        asBoolean(readObject(record.openai)?.externalWebAccess) ?? DEFAULT_CONFIG.openai.externalWebAccess,
    },
    anthropic: {
      apiKey: readApiKey(record.anthropic),
      model: asNonEmptyString(readObject(record.anthropic)?.model) ?? DEFAULT_CONFIG.anthropic.model,
      toolVersion:
        asAnthropicToolVersion(readObject(record.anthropic)?.toolVersion) ?? DEFAULT_CONFIG.anthropic.toolVersion,
      maxUses: asBoundedPositiveInteger(readObject(record.anthropic)?.maxUses, 1) ?? DEFAULT_CONFIG.anthropic.maxUses,
      directOnly: asBoolean(readObject(record.anthropic)?.directOnly) ?? DEFAULT_CONFIG.anthropic.directOnly,
    },
  }
}

function readApiKey(value: unknown): string | undefined {
  return asNonEmptyString(readObject(value)?.apiKey)
}

function readObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") {
    return undefined
  }

  return value as Record<string, unknown>
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function asBoundedPositiveInteger(value: unknown, min: number, max = Number.POSITIVE_INFINITY): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : undefined
}

function isProviderSelection(value: unknown): value is BetterSearchProviderSelection {
  return (
    value === "auto" ||
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

function asExaSearchType(value: unknown): ExaSearchType | undefined {
  return value === "neural" ||
    value === "fast" ||
    value === "auto" ||
    value === "deep" ||
    value === "deep-reasoning" ||
    value === "instant"
    ? value
    : undefined
}

function asTavilySearchDepth(value: unknown): TavilySearchDepth | undefined {
  return value === "basic" || value === "advanced" || value === "fast" || value === "ultra-fast" ? value : undefined
}

function asTavilyAnswerMode(value: unknown): TavilyAnswerMode | undefined {
  return value === true || value === false || value === "basic" || value === "advanced" ? value : undefined
}

function asParallelSearchMode(value: unknown): ParallelSearchMode | undefined {
  return value === "fast" || value === "standard" ? value : undefined
}

function asAnthropicToolVersion(value: unknown): AnthropicToolVersion | undefined {
  return value === "web_search_20250305" || value === "web_search_20260209" ? value : undefined
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const strings = value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
  return strings.length > 0 ? strings : undefined
}

function asOpenAIReasoningEffort(value: unknown): OpenAIReasoningEffort | undefined {
  return value === "low" || value === "medium" || value === "high" ? value : undefined
}

function asOpenAISearchContextSize(value: unknown): OpenAISearchContextSize | undefined {
  return value === "low" || value === "medium" || value === "high" ? value : undefined
}

function asOpenAIApiMode(value: unknown): OpenAIApiMode | undefined {
  return value === "auto" || value === "responses" || value === "chat_completions_search" ? value : undefined
}

export const betterSearchConfigSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    provider: {
      type: "string",
      default: "auto",
      enum: ["auto", "brave", "exa", "tavily", "perplexity", "parallel", "gemini", "openai", "anthropic"],
    },
    toolName: {
      type: "string",
      default: "better_search",
    },
    maxResults: {
      type: "number",
      default: 5,
      minimum: 1,
      maximum: 20,
    },
    cacheTtlMinutes: {
      type: "number",
      default: 15,
      minimum: 0,
    },
    timeoutSeconds: {
      type: "number",
      default: 60,
      minimum: 1,
    },
    searchDefaults: {
      type: "object",
      additionalProperties: false,
      properties: {
        freshness: { type: "string" },
        country: { type: "string" },
        searchLang: { type: "string" },
        topic: { type: "string" },
        includeDomains: {
          type: "array",
          items: { type: "string" },
        },
        excludeDomains: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
    brave: {
      type: "object",
      additionalProperties: false,
      properties: {
        apiKey: { type: "string" },
      },
    },
    exa: {
      type: "object",
      additionalProperties: false,
      properties: {
        apiKey: { type: "string" },
        type: {
          type: "string",
          default: "auto",
          enum: ["neural", "fast", "auto", "deep", "deep-reasoning", "instant"],
        },
      },
    },
    tavily: {
      type: "object",
      additionalProperties: false,
      properties: {
        apiKey: { type: "string" },
        searchDepth: {
          type: "string",
          default: "advanced",
          enum: ["basic", "advanced", "fast", "ultra-fast"],
        },
        includeAnswer: {
          oneOf: [{ type: "boolean" }, { type: "string", enum: ["basic", "advanced"] }],
          default: true,
        },
        autoParameters: {
          type: "boolean",
          default: true,
        },
      },
    },
    perplexity: {
      type: "object",
      additionalProperties: false,
      properties: {
        apiKey: { type: "string" },
        baseUrl: {
          type: "string",
          default: "https://api.perplexity.ai",
        },
        model: {
          type: "string",
          default: "sonar-pro",
        },
      },
    },
    parallel: {
      type: "object",
      additionalProperties: false,
      properties: {
        apiKey: { type: "string" },
        mode: {
          type: "string",
          default: "fast",
          enum: ["fast", "standard"],
        },
        maxCharsPerResult: {
          type: "number",
          default: 1500,
          minimum: 100,
        },
      },
    },
    gemini: {
      type: "object",
      additionalProperties: false,
      properties: {
        apiKey: { type: "string" },
        model: {
          type: "string",
          default: "gemini-2.5-flash",
        },
      },
    },
    openai: {
      type: "object",
      additionalProperties: false,
      properties: {
        apiKey: { type: "string" },
        apiMode: {
          type: "string",
          default: "auto",
          enum: ["auto", "responses", "chat_completions_search"],
        },
        model: {
          type: "string",
          default: "gpt-5-mini",
        },
        chatCompletionsModel: {
          type: "string",
          default: "gpt-5-search-api",
        },
        reasoningEffort: {
          type: "string",
          default: "low",
          enum: ["low", "medium", "high"],
        },
        searchContextSize: {
          type: "string",
          default: "medium",
          enum: ["low", "medium", "high"],
        },
        includeSources: {
          type: "boolean",
          default: true,
        },
        externalWebAccess: {
          type: "boolean",
          default: true,
        },
      },
    },
    anthropic: {
      type: "object",
      additionalProperties: false,
      properties: {
        apiKey: { type: "string" },
        model: {
          type: "string",
          default: "claude-sonnet-4-6",
        },
        toolVersion: {
          type: "string",
          default: "web_search_20260209",
          enum: ["web_search_20250305", "web_search_20260209"],
        },
        maxUses: {
          type: "number",
          default: 5,
          minimum: 1,
        },
        directOnly: {
          type: "boolean",
          default: true,
        },
      },
    },
  },
} as const
