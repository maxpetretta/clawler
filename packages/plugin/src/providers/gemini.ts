import type { ClawlerConfig } from "../config"
import { buildPromptWithGuidance, dedupeStrings, defineProvider, requestJson, requireApiKey } from "./shared"
import type { SearchOptions } from "./types"

type GeminiGroundingMetadata = {
  groundingChunks?: Array<{
    web?: {
      uri?: string
      title?: string
    }
  }>
  groundingSupports?: Array<{
    segment?: {
      text?: string
    }
    groundingChunkIndices?: number[]
    confidenceScores?: number[]
  }>
  searchEntryPoint?: {
    renderedContent?: string
  }
  webSearchQueries?: string[]
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
    groundingMetadata?: GeminiGroundingMetadata
  }>
}

type GeminiRequestConfig = ClawlerConfig["gemini"] & {
  apiKey: string
  timeoutSeconds: number
}

const HTML_ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
}

export function buildGeminiRequest(query: string, options: SearchOptions, config: GeminiRequestConfig) {
  const googleSearchTool =
    config.dynamicThreshold === undefined
      ? {}
      : {
          dynamic_retrieval_config: {
            mode: "MODE_DYNAMIC",
            dynamic_threshold: config.dynamicThreshold,
          },
        }

  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`,
    method: "POST" as const,
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": config.apiKey,
    },
    body: {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildPromptWithGuidance(query, options, {}),
            },
          ],
        },
      ],
      tools: [{ google_search: googleSearchTool }],
    },
    timeoutSeconds: config.timeoutSeconds,
  }
}

export const geminiProvider = defineProvider("gemini", "llm", async (query, options, context) => {
  const apiKey = requireApiKey(context.config, "gemini", context.env)
  const request = buildGeminiRequest(query, options, {
    ...context.config.gemini,
    apiKey,
    timeoutSeconds: context.config.timeoutSeconds,
  })
  const response = await requestJson<GeminiResponse>("gemini", request.url, context, request)
  const candidate = response.candidates?.[0]
  const groundingMetadata = candidate?.groundingMetadata
  const answer = candidate?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join("\n")
    .trim()
  const citations = buildGeminiCitations(groundingMetadata)
  const webSearchQueries = dedupeStrings(groundingMetadata?.webSearchQueries)

  return {
    provider: "gemini",
    query,
    answer,
    citations,
    meta: {
      webSearchQueries,
    },
  }
})

function buildGeminiCitations(groundingMetadata: GeminiGroundingMetadata | undefined): string[] {
  const structuredUrls = extractStructuredGroundingUrls(groundingMetadata)

  if (structuredUrls.length > 0) {
    return structuredUrls
  }

  return extractRenderedContentUrls(groundingMetadata?.searchEntryPoint?.renderedContent)
}

function extractStructuredGroundingUrls(groundingMetadata: GeminiGroundingMetadata | undefined): string[] {
  const groundingChunks = groundingMetadata?.groundingChunks ?? []
  const supportedChunkUris = groundingMetadata?.groundingSupports
    ?.flatMap((support) => support.groundingChunkIndices ?? [])
    .map((index) => groundingChunks[index]?.web?.uri)
  const preferredUrls = dedupeStrings(supportedChunkUris)

  if (preferredUrls.length > 0) {
    return preferredUrls
  }

  return dedupeStrings(groundingChunks.map((chunk) => chunk.web?.uri))
}

function extractRenderedContentUrls(renderedContent: string | undefined): string[] {
  if (!renderedContent) {
    return []
  }

  const urls: string[] = []

  for (const match of renderedContent.matchAll(/href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/giu)) {
    const href = match[1] ?? match[2] ?? match[3]
    const url = tryParseHttpUrl(decodeHtmlAttribute(href))

    if (url) {
      urls.push(url)
    }
  }

  return dedupeStrings(urls)
}

function tryParseHttpUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined
  } catch {
    return undefined
  }
}

function decodeHtmlAttribute(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  return value.replace(/&(?:amp|lt|gt|quot|apos|#39);|&#x([\da-f]+);|&#(\d+);/giu, (match, hex, decimal) => {
    if (hex) {
      return String.fromCodePoint(Number.parseInt(hex, 16))
    }

    if (decimal) {
      return String.fromCodePoint(Number.parseInt(decimal, 10))
    }

    return HTML_ENTITY_MAP[match.toLowerCase()] ?? match
  })
}
