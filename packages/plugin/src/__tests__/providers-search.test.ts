import { describe, expect, test } from "bun:test"
import { resolveConfig } from "../config"
import { anthropicProvider } from "../providers/anthropic"
import { braveProvider } from "../providers/brave"
import { exaProvider } from "../providers/exa"
import { geminiProvider } from "../providers/gemini"
import { openaiProvider } from "../providers/openai"
import { parallelProvider } from "../providers/parallel"
import { perplexityProvider } from "../providers/perplexity"
import { tavilyProvider } from "../providers/tavily"
import type { SearchProviderContext } from "../providers/types"

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  })
}

function createContext(
  configInput: unknown,
  env: Record<string, string | undefined>,
  responses: Response[],
): SearchProviderContext {
  const config = resolveConfig(configInput)
  let index = 0

  return {
    config,
    env,
    fetch: async () => responses[index++] ?? jsonResponse({}),
  }
}

describe("provider search normalization", () => {
  test("normalizes Brave results", async () => {
    const result = await braveProvider.search(
      "query",
      {},
      createContext({}, { BRAVE_API_KEY: "key" }, [
        jsonResponse({
          web: {
            results: [
              {
                title: "Title",
                url: "https://example.com",
                description: "desc",
                extra_snippets: ["more"],
                age: "1 day",
              },
              { title: "Ignore me" },
            ],
          },
        }),
      ]),
    )

    expect(result.results).toEqual([
      {
        title: "Title",
        url: "https://example.com",
        snippet: "desc more",
        publishedDate: "1 day",
      },
    ])
  })

  test("normalizes Exa results", async () => {
    const result = await exaProvider.search(
      "query",
      {},
      createContext({}, { EXA_API_KEY: "key" }, [
        jsonResponse({
          results: [
            { title: "Title", url: "https://example.com", highlights: ["one", "two"], publishedDate: "2026-03-01" },
          ],
        }),
      ]),
    )

    expect(result.results?.[0]).toMatchObject({
      title: "Title",
      url: "https://example.com",
      snippet: "one two",
      publishedDate: "2026-03-01",
    })
  })

  test("normalizes Tavily hybrid responses", async () => {
    const result = await tavilyProvider.search(
      "query",
      {},
      createContext({}, { TAVILY_API_KEY: "key" }, [
        jsonResponse({
          answer: "summary",
          results: [{ title: "Title", url: "https://example.com", content: "body" }],
        }),
      ]),
    )

    expect(result.answer).toBe("summary")
    expect(result.citations).toEqual(["https://example.com"])
    expect(result.results?.[0]).toMatchObject({ snippet: "body" })
  })

  test("normalizes Perplexity direct and OpenRouter responses", async () => {
    const direct = await perplexityProvider.search(
      "query",
      {},
      createContext({}, { PERPLEXITY_API_KEY: "key" }, [
        jsonResponse({
          choices: [{ message: { content: " answer " } }],
          citations: ["https://example.com", "https://example.com"],
          search_results: [{ title: "Title", url: "https://example.com", snippet: "body", date: "2026-03-01" }],
        }),
      ]),
    )

    const router = await perplexityProvider.search(
      "query",
      {},
      createContext({}, { OPENROUTER_API_KEY: "router" }, [
        jsonResponse({ choices: [{ message: { content: "router" } }] }),
      ]),
    )

    expect(direct.answer).toBe("answer")
    expect(direct.citations).toEqual(["https://example.com"])
    expect(direct.results?.[0]).toMatchObject({ title: "Title", publishedDate: "2026-03-01" })
    expect(router.answer).toBe("router")
  })

  test("normalizes Parallel results", async () => {
    const result = await parallelProvider.search(
      "query",
      {},
      createContext({}, { PARALLEL_API_KEY: "key" }, [
        jsonResponse({
          results: [{ title: "Title", url: "https://example.com", publish_date: "2026-03-01", excerpts: ["a", "b"] }],
        }),
      ]),
    )

    expect(result.results?.[0]).toMatchObject({
      title: "Title",
      url: "https://example.com",
      snippet: "a b",
      publishedDate: "2026-03-01",
    })
  })

  test("normalizes Gemini responses", async () => {
    const result = await geminiProvider.search(
      "query",
      {},
      createContext({}, { GOOGLE_AI_API_KEY: "key" }, [
        jsonResponse({
          candidates: [
            {
              content: { parts: [{ text: "Part 1" }, { text: "Part 2" }] },
              groundingMetadata: {
                groundingChunks: [{ web: { uri: "https://example.com" } }, { web: { uri: "https://example.com" } }],
              },
            },
          ],
        }),
      ]),
    )

    expect(result.answer).toBe("Part 1\nPart 2")
    expect(result.citations).toEqual(["https://example.com"])
  })

  test("normalizes OpenAI chat-completions and responses modes", async () => {
    const chat = await openaiProvider.search(
      "query",
      {},
      createContext(
        {
          openai: {
            apiMode: "chat_completions_search",
          },
        },
        { OPENAI_API_KEY: "key" },
        [
          jsonResponse({
            choices: [
              {
                message: {
                  content: " answer ",
                  annotations: [{ url_citation: { url: "https://example.com" } }],
                },
              },
            ],
          }),
        ],
      ),
    )

    const responses = await openaiProvider.search(
      "query",
      { includeDomains: ["openai.com"] },
      createContext(
        {
          openai: {
            apiMode: "auto",
          },
        },
        { OPENAI_API_KEY: "key" },
        [
          jsonResponse({
            output: [
              {
                type: "web_search_call",
                action: {
                  sources: [{ url: "https://source.example" }],
                },
              },
              {
                type: "message",
                content: [{ text: "A" }, { text: "B", annotations: [{ url: "https://message.example" }] }],
              },
            ],
          }),
        ],
      ),
    )

    expect(chat.answer).toBe("answer")
    expect(chat.citations).toEqual(["https://example.com"])
    expect(responses.answer).toBe("A\nB")
    expect(responses.citations).toEqual(["https://message.example", "https://source.example"])
  })

  test("normalizes Anthropic responses and follows pause_turn", async () => {
    const result = await anthropicProvider.search(
      "query",
      {},
      createContext({}, { ANTHROPIC_API_KEY: "key" }, [
        jsonResponse({
          stop_reason: "pause_turn",
          content: [{ type: "text", text: "intermediate", citations: [{ url: "https://ignore.example" }] }],
        }),
        jsonResponse({
          content: [
            {
              type: "text",
              text: "answer",
              citations: [{ url: "https://example.com" }, { url: "https://example.com" }],
            },
          ],
        }),
      ]),
    )

    expect(result.answer).toBe("answer")
    expect(result.citations).toEqual(["https://example.com"])
  })
})

describe("provider credential errors", () => {
  const context = createContext({}, {}, [])

  test("throws when providers are not configured", async () => {
    await expect(braveProvider.search("query", {}, context)).rejects.toThrow("Brave is not configured.")
    await expect(exaProvider.search("query", {}, context)).rejects.toThrow("Exa is not configured.")
    await expect(tavilyProvider.search("query", {}, context)).rejects.toThrow("Tavily is not configured.")
    await expect(perplexityProvider.search("query", {}, context)).rejects.toThrow("Perplexity is not configured.")
    await expect(parallelProvider.search("query", {}, context)).rejects.toThrow("Parallel is not configured.")
    await expect(geminiProvider.search("query", {}, context)).rejects.toThrow("Gemini is not configured.")
    await expect(openaiProvider.search("query", {}, context)).rejects.toThrow("OpenAI is not configured.")
    await expect(anthropicProvider.search("query", {}, context)).rejects.toThrow("Anthropic is not configured.")
  })
})
