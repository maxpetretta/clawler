import type { BetterSearchConfig } from "../config"
import { buildPromptWithGuidance, dedupeStrings, requestJson, resolveApiKey } from "./shared"
import type { SearchOptions, SearchProvider } from "./types"

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
    groundingMetadata?: {
      groundingChunks?: Array<{
        web?: {
          uri?: string
        }
      }>
    }
  }>
}

type GeminiRequestConfig = BetterSearchConfig["gemini"] & {
  apiKey: string
  timeoutSeconds: number
}

export function buildGeminiRequest(query: string, options: SearchOptions, config: GeminiRequestConfig) {
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
      tools: [{ google_search: {} }],
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
    const answer = candidate?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join("\n")
      .trim()
    const citations = dedupeStrings(candidate?.groundingMetadata?.groundingChunks?.map((chunk) => chunk.web?.uri) ?? [])

    return {
      provider: "gemini",
      query,
      answer,
      citations,
    }
  },
}
