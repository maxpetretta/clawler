import { isProviderId, providerIds, type ProviderId } from "./providers/types"

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
  fallback: ProviderId[]
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

const PROVIDER_SELECTIONS = ["auto", ...providerIds] as const
const EXA_SEARCH_TYPES = ["neural", "fast", "auto", "deep", "deep-reasoning", "instant"] as const
const EXA_CATEGORIES = [
  "company",
  "people",
  "research paper",
  "news",
  "tweet",
  "personal site",
  "financial report",
] as const
const TAVILY_SEARCH_DEPTHS = ["basic", "advanced", "fast", "ultra-fast"] as const
const TAVILY_ANSWER_MODES = ["basic", "advanced"] as const
const PERPLEXITY_API_MODES = ["search", "chat"] as const
const BRAVE_SAFE_SEARCH_VALUES = ["off", "moderate", "strict"] as const
const ANTHROPIC_TOOL_VERSIONS = ["web_search_20250305", "web_search_20260209"] as const
const OPENAI_REASONING_EFFORTS = ["low", "medium", "high"] as const
const OPENAI_SEARCH_CONTEXT_SIZES = ["low", "medium", "high"] as const
const OPENAI_API_MODES = ["auto", "responses", "chat_completions_search"] as const

const STRING_PROPERTY = { type: "string" } as const
const LOCATION_SCHEMA_PROPERTIES = {
  city: STRING_PROPERTY,
  region: STRING_PROPERTY,
  timezone: STRING_PROPERTY,
} as const
const SHARED_SEARCH_SCHEMA_PROPERTIES = {
  freshness: STRING_PROPERTY,
  country: STRING_PROPERTY,
  searchLang: STRING_PROPERTY,
  topic: STRING_PROPERTY,
  includeDomains: {
    type: "array",
    items: STRING_PROPERTY,
  },
  excludeDomains: {
    type: "array",
    items: STRING_PROPERTY,
  },
} as const

const DEFAULT_CONFIG: ClawlerConfig = {
  provider: "auto",
  fallback: [],
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
  const record = readObject(pluginConfig)

  if (!record) {
    return DEFAULT_CONFIG
  }

  return {
    provider: asProviderSelection(record.provider) ?? DEFAULT_CONFIG.provider,
    fallback: asProviderIdArray(record.fallback) ?? DEFAULT_CONFIG.fallback,
    toolName: asNonEmptyString(record.toolName) ?? DEFAULT_CONFIG.toolName,
    maxResults: asBoundedPositiveInteger(record.maxResults, 1, 20) ?? DEFAULT_CONFIG.maxResults,
    cacheTtlMinutes: asBoundedPositiveInteger(record.cacheTtlMinutes, 0) ?? DEFAULT_CONFIG.cacheTtlMinutes,
    timeoutSeconds: asBoundedPositiveInteger(record.timeoutSeconds, 1) ?? DEFAULT_CONFIG.timeoutSeconds,
    searchDefaults: resolveSharedOptions(record.searchDefaults),
    brave: resolveBraveConfig(record.brave),
    exa: resolveExaConfig(record.exa),
    tavily: resolveTavilyConfig(record.tavily),
    perplexity: resolvePerplexityConfig(record.perplexity),
    parallel: resolveParallelConfig(record.parallel),
    gemini: resolveGeminiConfig(record.gemini),
    openai: resolveOpenAIConfig(record.openai),
    anthropic: resolveAnthropicConfig(record.anthropic),
  }
}

function resolveSharedOptions(value: unknown): ClawlerSharedOptions {
  const record = readObject(value)

  return {
    freshness: asNonEmptyString(record?.freshness),
    country: asNonEmptyString(record?.country),
    searchLang: asNonEmptyString(record?.searchLang),
    topic: asNonEmptyString(record?.topic),
    includeDomains: asStringArray(record?.includeDomains),
    excludeDomains: asStringArray(record?.excludeDomains),
  }
}

function resolveBraveConfig(value: unknown): ClawlerConfig["brave"] {
  const record = readObject(value)

  return {
    apiKey: readApiKey(value),
    enableRichResults: asBoolean(record?.enableRichResults) ?? DEFAULT_CONFIG.brave.enableRichResults,
    safesearch: asEnum(record?.safesearch, BRAVE_SAFE_SEARCH_VALUES),
  }
}

function resolveExaConfig(value: unknown): ClawlerConfig["exa"] {
  const record = readObject(value)

  return {
    apiKey: readApiKey(value),
    type: asEnum(record?.type, EXA_SEARCH_TYPES) ?? DEFAULT_CONFIG.exa.type,
    category: asEnum(record?.category, EXA_CATEGORIES),
    maxAgeHours: asBoundedInteger(record?.maxAgeHours, -1),
  }
}

function resolveTavilyConfig(value: unknown): ClawlerConfig["tavily"] {
  const record = readObject(value)

  return {
    apiKey: readApiKey(value),
    searchDepth: asEnum(record?.searchDepth, TAVILY_SEARCH_DEPTHS) ?? DEFAULT_CONFIG.tavily.searchDepth,
    includeAnswer: asTavilyAnswerMode(record?.includeAnswer) ?? DEFAULT_CONFIG.tavily.includeAnswer,
    autoParameters: asBoolean(record?.autoParameters) ?? DEFAULT_CONFIG.tavily.autoParameters,
    chunksPerSource: asBoundedPositiveInteger(record?.chunksPerSource, 1),
    includeRawContent: asBoolean(record?.includeRawContent) ?? DEFAULT_CONFIG.tavily.includeRawContent,
    exactMatch: asBoolean(record?.exactMatch) ?? DEFAULT_CONFIG.tavily.exactMatch,
  }
}

function resolvePerplexityConfig(value: unknown): ClawlerConfig["perplexity"] {
  const record = readObject(value)

  return {
    apiKey: readApiKey(value),
    apiMode: asEnum(record?.apiMode, PERPLEXITY_API_MODES) ?? DEFAULT_CONFIG.perplexity.apiMode,
    baseUrl: asNonEmptyString(record?.baseUrl) ?? DEFAULT_CONFIG.perplexity.baseUrl,
    model: asNonEmptyString(record?.model) ?? DEFAULT_CONFIG.perplexity.model,
    maxTokens: asBoundedPositiveInteger(record?.maxTokens, 1, 1000000) ?? DEFAULT_CONFIG.perplexity.maxTokens,
    maxTokensPerPage:
      asBoundedPositiveInteger(record?.maxTokensPerPage, 1, 1000000) ?? DEFAULT_CONFIG.perplexity.maxTokensPerPage,
  }
}

function resolveParallelConfig(value: unknown): ClawlerConfig["parallel"] {
  const record = readObject(value)

  return {
    apiKey: readApiKey(value),
    mode: asNonEmptyString(record?.mode) ?? DEFAULT_CONFIG.parallel.mode,
    maxCharsPerResult:
      asBoundedPositiveInteger(record?.maxCharsPerResult, 100) ?? DEFAULT_CONFIG.parallel.maxCharsPerResult,
    maxCharsTotal: asBoundedPositiveInteger(record?.maxCharsTotal, 100) ?? DEFAULT_CONFIG.parallel.maxCharsTotal,
    maxAgeSeconds: asBoundedPositiveInteger(record?.maxAgeSeconds, 1),
  }
}

function resolveGeminiConfig(value: unknown): ClawlerConfig["gemini"] {
  const record = readObject(value)

  return {
    apiKey: readApiKey(value),
    model: asNonEmptyString(record?.model) ?? DEFAULT_CONFIG.gemini.model,
    dynamicThreshold: asBoundedNumber(record?.dynamicThreshold, 0, 1),
  }
}

function resolveOpenAIConfig(value: unknown): ClawlerConfig["openai"] {
  const record = readObject(value)

  return {
    apiKey: readApiKey(value),
    apiMode: asEnum(record?.apiMode, OPENAI_API_MODES) ?? DEFAULT_CONFIG.openai.apiMode,
    model: asNonEmptyString(record?.model) ?? DEFAULT_CONFIG.openai.model,
    chatCompletionsModel: asNonEmptyString(record?.chatCompletionsModel) ?? DEFAULT_CONFIG.openai.chatCompletionsModel,
    reasoningEffort: asEnum(record?.reasoningEffort, OPENAI_REASONING_EFFORTS) ?? DEFAULT_CONFIG.openai.reasoningEffort,
    searchContextSize:
      asEnum(record?.searchContextSize, OPENAI_SEARCH_CONTEXT_SIZES) ?? DEFAULT_CONFIG.openai.searchContextSize,
    includeSources: asBoolean(record?.includeSources) ?? DEFAULT_CONFIG.openai.includeSources,
    externalWebAccess: asBoolean(record?.externalWebAccess) ?? DEFAULT_CONFIG.openai.externalWebAccess,
    city: asNonEmptyString(record?.city),
    region: asNonEmptyString(record?.region),
    timezone: asNonEmptyString(record?.timezone),
  }
}

function resolveAnthropicConfig(value: unknown): ClawlerConfig["anthropic"] {
  const record = readObject(value)

  return {
    apiKey: readApiKey(value),
    model: asNonEmptyString(record?.model) ?? DEFAULT_CONFIG.anthropic.model,
    toolVersion: asEnum(record?.toolVersion, ANTHROPIC_TOOL_VERSIONS) ?? DEFAULT_CONFIG.anthropic.toolVersion,
    maxTokens: asBoundedPositiveInteger(record?.maxTokens, 1) ?? DEFAULT_CONFIG.anthropic.maxTokens,
    maxUses: asBoundedPositiveInteger(record?.maxUses, 1) ?? DEFAULT_CONFIG.anthropic.maxUses,
    directOnly: asBoolean(record?.directOnly) ?? DEFAULT_CONFIG.anthropic.directOnly,
    city: asNonEmptyString(record?.city),
    region: asNonEmptyString(record?.region),
    timezone: asNonEmptyString(record?.timezone),
  }
}

function readApiKey(value: unknown): string | undefined {
  return asNonEmptyString(readObject(value)?.apiKey)
}

function readObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined
  }

  return value as Record<string, unknown>
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function asEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : undefined
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

function asProviderSelection(value: unknown): ClawlerProviderSelection | undefined {
  return value === "auto" ? value : asProviderId(value)
}

function asProviderId(value: unknown): ProviderId | undefined {
  return isProviderId(value) ? value : undefined
}

function asProviderIdArray(value: unknown): ProviderId[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const ids = value.filter(isProviderId)
  return ids.length > 0 ? ids : undefined
}

function asTavilyAnswerMode(value: unknown): TavilyAnswerMode | undefined {
  return value === true || value === false ? value : asEnum(value, TAVILY_ANSWER_MODES)
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

export const clawlerConfigSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    provider: {
      type: "string",
      default: DEFAULT_CONFIG.provider,
      enum: [...PROVIDER_SELECTIONS],
    },
    fallback: {
      type: "array",
      items: {
        type: "string",
        enum: [...providerIds],
      },
      default: [...DEFAULT_CONFIG.fallback],
      description:
        "Fallback providers tried in order if the primary fails. Only errors trigger fallback; empty results are valid. Per-call provider param skips fallback.",
    },
    toolName: {
      type: "string",
      default: DEFAULT_CONFIG.toolName,
    },
    maxResults: {
      type: "number",
      default: DEFAULT_CONFIG.maxResults,
      minimum: 1,
      maximum: 20,
    },
    cacheTtlMinutes: {
      type: "number",
      default: DEFAULT_CONFIG.cacheTtlMinutes,
      minimum: 0,
    },
    timeoutSeconds: {
      type: "number",
      default: DEFAULT_CONFIG.timeoutSeconds,
      minimum: 1,
    },
    searchDefaults: {
      type: "object",
      additionalProperties: false,
      properties: SHARED_SEARCH_SCHEMA_PROPERTIES,
    },
    brave: {
      type: "object",
      additionalProperties: false,
      properties: {
        apiKey: STRING_PROPERTY,
        enableRichResults: {
          type: "boolean",
          default: DEFAULT_CONFIG.brave.enableRichResults,
        },
        safesearch: {
          type: "string",
          enum: [...BRAVE_SAFE_SEARCH_VALUES],
        },
      },
    },
    exa: {
      type: "object",
      additionalProperties: false,
      properties: {
        apiKey: STRING_PROPERTY,
        type: {
          type: "string",
          default: DEFAULT_CONFIG.exa.type,
          enum: [...EXA_SEARCH_TYPES],
        },
        category: {
          type: "string",
          enum: [...EXA_CATEGORIES],
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
        apiKey: STRING_PROPERTY,
        searchDepth: {
          type: "string",
          default: DEFAULT_CONFIG.tavily.searchDepth,
          enum: [...TAVILY_SEARCH_DEPTHS],
        },
        includeAnswer: {
          oneOf: [{ type: "boolean" }, { type: "string", enum: [...TAVILY_ANSWER_MODES] }],
          default: DEFAULT_CONFIG.tavily.includeAnswer,
        },
        autoParameters: {
          type: "boolean",
          default: DEFAULT_CONFIG.tavily.autoParameters,
        },
        chunksPerSource: {
          type: "integer",
          minimum: 1,
        },
        includeRawContent: {
          type: "boolean",
          default: DEFAULT_CONFIG.tavily.includeRawContent,
        },
        exactMatch: {
          type: "boolean",
          default: DEFAULT_CONFIG.tavily.exactMatch,
        },
      },
    },
    perplexity: {
      type: "object",
      additionalProperties: false,
      properties: {
        apiKey: STRING_PROPERTY,
        apiMode: {
          type: "string",
          default: DEFAULT_CONFIG.perplexity.apiMode,
          enum: [...PERPLEXITY_API_MODES],
        },
        baseUrl: {
          type: "string",
          default: DEFAULT_CONFIG.perplexity.baseUrl,
        },
        model: {
          type: "string",
          default: DEFAULT_CONFIG.perplexity.model,
        },
        maxTokens: {
          type: "integer",
          default: DEFAULT_CONFIG.perplexity.maxTokens,
          minimum: 1,
          maximum: 1000000,
          description: "Maximum total tokens for search context (API default: 10000)",
        },
        maxTokensPerPage: {
          type: "integer",
          default: DEFAULT_CONFIG.perplexity.maxTokensPerPage,
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
        apiKey: STRING_PROPERTY,
        mode: {
          type: "string",
          default: DEFAULT_CONFIG.parallel.mode,
        },
        maxCharsPerResult: {
          type: "number",
          default: DEFAULT_CONFIG.parallel.maxCharsPerResult,
          minimum: 100,
        },
        maxCharsTotal: {
          type: "number",
          default: DEFAULT_CONFIG.parallel.maxCharsTotal,
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
        apiKey: STRING_PROPERTY,
        model: {
          type: "string",
          default: DEFAULT_CONFIG.gemini.model,
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
        apiKey: STRING_PROPERTY,
        apiMode: {
          type: "string",
          default: DEFAULT_CONFIG.openai.apiMode,
          enum: [...OPENAI_API_MODES],
        },
        model: {
          type: "string",
          default: DEFAULT_CONFIG.openai.model,
        },
        chatCompletionsModel: {
          type: "string",
          default: DEFAULT_CONFIG.openai.chatCompletionsModel,
        },
        reasoningEffort: {
          type: "string",
          default: DEFAULT_CONFIG.openai.reasoningEffort,
          enum: [...OPENAI_REASONING_EFFORTS],
        },
        searchContextSize: {
          type: "string",
          default: DEFAULT_CONFIG.openai.searchContextSize,
          enum: [...OPENAI_SEARCH_CONTEXT_SIZES],
        },
        includeSources: {
          type: "boolean",
          default: DEFAULT_CONFIG.openai.includeSources,
        },
        externalWebAccess: {
          type: "boolean",
          default: DEFAULT_CONFIG.openai.externalWebAccess,
        },
        ...LOCATION_SCHEMA_PROPERTIES,
      },
    },
    anthropic: {
      type: "object",
      additionalProperties: false,
      properties: {
        apiKey: STRING_PROPERTY,
        model: {
          type: "string",
          default: DEFAULT_CONFIG.anthropic.model,
        },
        toolVersion: {
          type: "string",
          default: DEFAULT_CONFIG.anthropic.toolVersion,
          enum: [...ANTHROPIC_TOOL_VERSIONS],
        },
        maxTokens: {
          type: "number",
          default: DEFAULT_CONFIG.anthropic.maxTokens,
          minimum: 1,
        },
        maxUses: {
          type: "number",
          default: DEFAULT_CONFIG.anthropic.maxUses,
          minimum: 1,
        },
        directOnly: {
          type: "boolean",
          default: DEFAULT_CONFIG.anthropic.directOnly,
        },
        ...LOCATION_SCHEMA_PROPERTIES,
      },
    },
  },
} as const
