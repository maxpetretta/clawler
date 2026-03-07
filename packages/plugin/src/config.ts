import type { ProviderId } from "./providers/types"

export type ClawlerProviderSelection = ProviderId | "auto"
export type ExaSearchType = "neural" | "fast" | "auto" | "deep" | "deep-reasoning" | "instant"
export type ExaCategory =
  | "company"
  | "people"
  | "research paper"
  | "news"
  | "tweet"
  | "personal site"
  | "financial report"
export type TavilySearchDepth = "basic" | "advanced" | "fast" | "ultra-fast"
export type TavilyAnswerMode = boolean | "basic" | "advanced"
export type ParallelSearchMode = string
export type AnthropicToolVersion = "web_search_20250305" | "web_search_20260209"
export type OpenAIReasoningEffort = "low" | "medium" | "high"
export type OpenAISearchContextSize = "low" | "medium" | "high"
export type OpenAIApiMode = "auto" | "responses" | "chat_completions_search"
export type PerplexityApiMode = "search" | "chat"
export type BraveSafeSearch = "off" | "moderate" | "strict"

type ApiKeyConfig = {
  apiKey?: string
}

export type ClawlerSharedOptions = {
  freshness?: string
  country?: string
  searchLang?: string
  topic?: string
  includeDomains?: string[]
  excludeDomains?: string[]
}

export type ClawlerConfig = {
  provider: ClawlerProviderSelection
  toolName: string
  maxResults: number
  cacheTtlMinutes: number
  timeoutSeconds: number
  searchDefaults: ClawlerSharedOptions
  brave: ApiKeyConfig & {
    enableRichResults: boolean
    safesearch?: BraveSafeSearch
  }
  exa: ApiKeyConfig & {
    type: ExaSearchType
    category?: ExaCategory
    maxAgeHours?: number
  }
  tavily: ApiKeyConfig & {
    searchDepth: TavilySearchDepth
    includeAnswer: TavilyAnswerMode
    autoParameters: boolean
    chunksPerSource?: number
    includeRawContent?: boolean
    exactMatch?: boolean
  }
  perplexity: ApiKeyConfig & {
    apiMode: PerplexityApiMode
    baseUrl: string
    model: string
    maxTokens: number
    maxTokensPerPage: number
  }
  parallel: ApiKeyConfig & {
    mode: ParallelSearchMode
    maxCharsPerResult: number
    maxCharsTotal: number
    maxAgeSeconds?: number
  }
  gemini: ApiKeyConfig & {
    model: string
    dynamicThreshold?: number
  }
  openai: ApiKeyConfig & {
    apiMode: OpenAIApiMode
    model: string
    chatCompletionsModel: string
    reasoningEffort: OpenAIReasoningEffort
    searchContextSize: OpenAISearchContextSize
    includeSources: boolean
    externalWebAccess: boolean
    city?: string
    region?: string
    timezone?: string
  }
  anthropic: ApiKeyConfig & {
    model: string
    toolVersion: AnthropicToolVersion
    maxTokens: number
    maxUses: number
    directOnly: boolean
    city?: string
    region?: string
    timezone?: string
  }
}

const DEFAULT_CONFIG: ClawlerConfig = {
  provider: "auto",
  toolName: "search_web",
  maxResults: 5,
  cacheTtlMinutes: 15,
  timeoutSeconds: 60,
  searchDefaults: {},
  brave: {
    enableRichResults: true,
  },
  exa: {
    type: "auto",
  },
  tavily: {
    searchDepth: "advanced",
    includeAnswer: true,
    autoParameters: true,
    includeRawContent: false,
    exactMatch: false,
  },
  perplexity: {
    apiMode: "search",
    baseUrl: "https://api.perplexity.ai",
    model: "sonar-pro",
    maxTokens: 4000,
    maxTokensPerPage: 2000,
  },
  parallel: {
    mode: "one-shot",
    maxCharsPerResult: 5000,
    maxCharsTotal: 50000,
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
    maxTokens: 4096,
    maxUses: 5,
    directOnly: true,
  },
}

export function resolveConfig(pluginConfig: unknown): ClawlerConfig {
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
      enableRichResults:
        asBoolean(readObject(record.brave)?.enableRichResults) ?? DEFAULT_CONFIG.brave.enableRichResults,
      safesearch: asBraveSafeSearch(readObject(record.brave)?.safesearch),
    },
    exa: {
      apiKey: readApiKey(record.exa),
      type: asExaSearchType(readObject(record.exa)?.type) ?? DEFAULT_CONFIG.exa.type,
      category: asExaCategory(readObject(record.exa)?.category),
      maxAgeHours: asBoundedInteger(readObject(record.exa)?.maxAgeHours, -1),
    },
    tavily: {
      apiKey: readApiKey(record.tavily),
      searchDepth: asTavilySearchDepth(readObject(record.tavily)?.searchDepth) ?? DEFAULT_CONFIG.tavily.searchDepth,
      includeAnswer:
        asTavilyAnswerMode(readObject(record.tavily)?.includeAnswer) ?? DEFAULT_CONFIG.tavily.includeAnswer,
      autoParameters: asBoolean(readObject(record.tavily)?.autoParameters) ?? DEFAULT_CONFIG.tavily.autoParameters,
      chunksPerSource: asBoundedPositiveInteger(readObject(record.tavily)?.chunksPerSource, 1),
      includeRawContent:
        asBoolean(readObject(record.tavily)?.includeRawContent) ?? DEFAULT_CONFIG.tavily.includeRawContent,
      exactMatch: asBoolean(readObject(record.tavily)?.exactMatch) ?? DEFAULT_CONFIG.tavily.exactMatch,
    },
    perplexity: {
      apiKey: readApiKey(record.perplexity),
      apiMode: asPerplexityApiMode(readObject(record.perplexity)?.apiMode) ?? DEFAULT_CONFIG.perplexity.apiMode,
      baseUrl: asNonEmptyString(readObject(record.perplexity)?.baseUrl) ?? DEFAULT_CONFIG.perplexity.baseUrl,
      model: asNonEmptyString(readObject(record.perplexity)?.model) ?? DEFAULT_CONFIG.perplexity.model,
      maxTokens:
        asBoundedPositiveInteger(readObject(record.perplexity)?.maxTokens, 1, 1000000) ??
        DEFAULT_CONFIG.perplexity.maxTokens,
      maxTokensPerPage:
        asBoundedPositiveInteger(readObject(record.perplexity)?.maxTokensPerPage, 1, 1000000) ??
        DEFAULT_CONFIG.perplexity.maxTokensPerPage,
    },
    parallel: {
      apiKey: readApiKey(record.parallel),
      mode: asParallelSearchMode(readObject(record.parallel)?.mode) ?? DEFAULT_CONFIG.parallel.mode,
      maxCharsPerResult:
        asBoundedPositiveInteger(readObject(record.parallel)?.maxCharsPerResult, 100) ??
        DEFAULT_CONFIG.parallel.maxCharsPerResult,
      maxCharsTotal:
        asBoundedPositiveInteger(readObject(record.parallel)?.maxCharsTotal, 100) ??
        DEFAULT_CONFIG.parallel.maxCharsTotal,
      maxAgeSeconds: asBoundedPositiveInteger(readObject(record.parallel)?.maxAgeSeconds, 1),
    },
    gemini: {
      apiKey: readApiKey(record.gemini),
      model: asNonEmptyString(readObject(record.gemini)?.model) ?? DEFAULT_CONFIG.gemini.model,
      dynamicThreshold: asBoundedNumber(readObject(record.gemini)?.dynamicThreshold, 0, 1),
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
      city: asNonEmptyString(readObject(record.openai)?.city),
      region: asNonEmptyString(readObject(record.openai)?.region),
      timezone: asNonEmptyString(readObject(record.openai)?.timezone),
    },
    anthropic: {
      apiKey: readApiKey(record.anthropic),
      model: asNonEmptyString(readObject(record.anthropic)?.model) ?? DEFAULT_CONFIG.anthropic.model,
      toolVersion:
        asAnthropicToolVersion(readObject(record.anthropic)?.toolVersion) ?? DEFAULT_CONFIG.anthropic.toolVersion,
      maxTokens:
        asBoundedPositiveInteger(readObject(record.anthropic)?.maxTokens, 1) ?? DEFAULT_CONFIG.anthropic.maxTokens,
      maxUses: asBoundedPositiveInteger(readObject(record.anthropic)?.maxUses, 1) ?? DEFAULT_CONFIG.anthropic.maxUses,
      directOnly: asBoolean(readObject(record.anthropic)?.directOnly) ?? DEFAULT_CONFIG.anthropic.directOnly,
      city: asNonEmptyString(readObject(record.anthropic)?.city),
      region: asNonEmptyString(readObject(record.anthropic)?.region),
      timezone: asNonEmptyString(readObject(record.anthropic)?.timezone),
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

function asBoundedInteger(value: unknown, min: number, max = Number.POSITIVE_INFINITY): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : undefined
}

function asBoundedNumber(value: unknown, min: number, max = Number.POSITIVE_INFINITY): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : undefined
}

function isProviderSelection(value: unknown): value is ClawlerProviderSelection {
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

function asExaCategory(value: unknown): ExaCategory | undefined {
  return value === "company" ||
    value === "people" ||
    value === "research paper" ||
    value === "news" ||
    value === "tweet" ||
    value === "personal site" ||
    value === "financial report"
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
  return asNonEmptyString(value)
}

function asPerplexityApiMode(value: unknown): PerplexityApiMode | undefined {
  return value === "search" || value === "chat" ? value : undefined
}

function asBraveSafeSearch(value: unknown): BraveSafeSearch | undefined {
  return value === "off" || value === "moderate" || value === "strict" ? value : undefined
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

export const clawlerConfigSchema = {
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
      default: "clawler",
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
        enableRichResults: {
          type: "boolean",
          default: true,
        },
        safesearch: {
          type: "string",
          enum: ["off", "moderate", "strict"],
        },
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
        category: {
          type: "string",
          enum: ["company", "people", "research paper", "news", "tweet", "personal site", "financial report"],
        },
        maxAgeHours: {
          type: "integer",
          minimum: -1,
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
        chunksPerSource: {
          type: "integer",
          minimum: 1,
        },
        includeRawContent: {
          type: "boolean",
          default: false,
        },
        exactMatch: {
          type: "boolean",
          default: false,
        },
      },
    },
    perplexity: {
      type: "object",
      additionalProperties: false,
      properties: {
        apiKey: { type: "string" },
        apiMode: {
          type: "string",
          default: "search",
          enum: ["search", "chat"],
        },
        baseUrl: {
          type: "string",
          default: "https://api.perplexity.ai",
        },
        model: {
          type: "string",
          default: "sonar-pro",
        },
        maxTokens: {
          type: "integer",
          default: 4000,
          minimum: 1,
          maximum: 1000000,
          description: "Maximum total tokens for search context (API default: 10000)",
        },
        maxTokensPerPage: {
          type: "integer",
          default: 2000,
          minimum: 1,
          maximum: 1000000,
          description: "Maximum tokens per page snippet (API default: 4096)",
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
          default: "one-shot",
        },
        maxCharsPerResult: {
          type: "number",
          default: 5000,
          minimum: 100,
        },
        maxCharsTotal: {
          type: "number",
          default: 50000,
          minimum: 100,
        },
        maxAgeSeconds: {
          type: "number",
          minimum: 1,
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
        dynamicThreshold: {
          type: "number",
          minimum: 0,
          maximum: 1,
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
        city: {
          type: "string",
        },
        region: {
          type: "string",
        },
        timezone: {
          type: "string",
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
        maxTokens: {
          type: "number",
          default: 4096,
          minimum: 1,
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
        city: {
          type: "string",
        },
        region: {
          type: "string",
        },
        timezone: {
          type: "string",
        },
      },
    },
  },
} as const
