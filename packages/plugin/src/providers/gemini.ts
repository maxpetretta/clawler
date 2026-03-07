import type { ClawlerConfig } from "../config"
import { buildPromptWithGuidance, dedupeStrings, requestJson, resolveApiKey } from "./shared"
import type { SearchOptions, SearchProvider } from "./types"

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

export const geminiProvider: SearchProvider = {
  id: "gemini",
  name: "Gemini",
  envVars: ["GEMINI_API_KEY"],
  category: "llm",
  isAvailable(config, env = process.env) {
    return Boolean(resolveApiKey(config, "gemini", env))
  },
  async search(query, options, context) {
    const apiKey = resolveApiKey(context.config, "gemini", context.env)

    if (!apiKey) {
      throw new Error("Gemini is not configured.")
    }

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
  },
}

function buildGeminiCitations(groundingMetadata: GeminiGroundingMetadata | undefined): string[] {
  const renderedContentUrls = extractRenderedContentUrls(groundingMetadata?.searchEntryPoint?.renderedContent)

  if (renderedContentUrls.length > 0) {
    return renderedContentUrls
  }

  const groundingChunks = groundingMetadata?.groundingChunks ?? []
  const supportedChunkUris = groundingMetadata?.groundingSupports
    ?.flatMap((support) => support.groundingChunkIndices ?? [])
    .map((index) => groundingChunks[index]?.web?.uri)

  return dedupeStrings(supportedChunkUris?.length ? supportedChunkUris : groundingChunks.map((chunk) => chunk.web?.uri))
}

function extractRenderedContentUrls(renderedContent: string | undefined): string[] {
  if (!renderedContent) {
    return []
  }

  const matches = renderedContent.matchAll(/href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/giu)
  const urls: string[] = []

  for (const match of matches) {
    const href = match[1] ?? match[2] ?? match[3]
    const decodedHref = decodeHtmlAttribute(href)

    if (!decodedHref) {
      continue
    }

    try {
      const url = new URL(decodedHref)

      if (url.protocol === "http:" || url.protocol === "https:") {
        urls.push(url.toString())
      }
    } catch {
      continue
    }
  }

  return dedupeStrings(urls)
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

    switch (match.toLowerCase()) {
      case "&amp;":
        return "&"
      case "&lt;":
        return "<"
      case "&gt;":
        return ">"
      case "&quot;":
        return '"'
      case "&apos;":
      case "&#39;":
        return "'"
      default:
        return match
    }
  })
}
