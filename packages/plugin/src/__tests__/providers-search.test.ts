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

  test("fetches Brave rich results into meta when callback data is available", async () => {
    const result = await braveProvider.search(
      "AAPL",
      {},
      createContext({}, { BRAVE_API_KEY: "key" }, [
        jsonResponse({
          web: {
            results: [{ title: "Apple", url: "https://example.com", description: "stock quote" }],
          },
          rich: {
            type: "stock",
            hint: {
              vertical: "stocks",
              callback_key: "cb_123",
            },
          },
        }),
        jsonResponse({
          type: "stock",
          symbol: "AAPL",
          price: 250.12,
        }),
      ]),
    )

    expect(result.meta).toEqual({
      rich: {
        type: "stock",
        symbol: "AAPL",
        price: 250.12,
      },
    })
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

  test("normalizes Perplexity search, chat, and OpenRouter responses", async () => {
    const direct = await perplexityProvider.search(
      "query",
      {},
      createContext({}, { PERPLEXITY_API_KEY: "key" }, [
        jsonResponse({
          results: [{ title: "Title", url: "https://example.com", snippet: "body", date: "2026-03-01" }],
        }),
      ]),
    )

    const chat = await perplexityProvider.search(
      "query",
      {},
      createContext({ perplexity: { apiMode: "chat" } }, { PERPLEXITY_API_KEY: "key" }, [
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

    expect(direct.answer).toBeUndefined()
    expect(direct.citations).toEqual(["https://example.com"])
    expect(direct.results?.[0]).toMatchObject({ title: "Title", publishedDate: "2026-03-01" })
    expect(chat.answer).toBe("answer")
    expect(chat.citations).toEqual(["https://example.com"])
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
                groundingChunks: [
                  { web: { uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/one" } },
                  { web: { uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/two" } },
                ],
                groundingSupports: [
                  {
                    segment: { text: "Part 1" },
                    groundingChunkIndices: [0, 1],
                    confidenceScores: [0.9, 0.8],
                  },
                ],
                searchEntryPoint: {
                  renderedContent:
                    '<a href="https://example.com/article?ref=1&amp;lang=en">Example</a><a href="https://second.example/path">Second</a>',
                },
                webSearchQueries: ["query one", "query one", "query two"],
              },
            },
          ],
        }),
      ]),
    )

    expect(result.answer).toBe("Part 1\nPart 2")
    expect(result.citations).toEqual(["https://vertexaisearch.cloud.google.com/grounding-api-redirect/one", "https://vertexaisearch.cloud.google.com/grounding-api-redirect/two"])
    expect(result.meta).toEqual({ webSearchQueries: ["query one", "query two"] })
  })

  test("normalizes Gemini rendered-content citations with entity decoding and URL filtering", async () => {
    const result = await geminiProvider.search(
      "query",
      {},
      createContext({}, { GOOGLE_AI_API_KEY: "key" }, [
        jsonResponse({
          candidates: [
            {
              content: { parts: [{ text: "Part 1" }] },
              groundingMetadata: {
                searchEntryPoint: {
                  renderedContent:
                    '<a href="">Empty</a><a href="/relative">Relative</a><a href="javascript:alert(1)">Bad</a><a href="https://example.com/path?foo&#61;1&amp;bar&#x3D;2">Good</a>',
                },
              },
            },
          ],
        }),
      ]),
    )

    expect(result.citations).toEqual(["https://example.com/path?foo=1&bar=2"])
  })

  test("normalizes Gemini citations from supported grounding chunks when rendered content is unavailable", async () => {
    const result = await geminiProvider.search(
      "query",
      {},
      createContext({}, { GOOGLE_AI_API_KEY: "key" }, [
        jsonResponse({
          candidates: [
            {
              content: { parts: [{ text: "Part 1" }] },
              groundingMetadata: {
                groundingChunks: [
                  { web: { uri: "https://ignored.example" } },
                  { web: { uri: "https://supported.example" } },
                ],
                groundingSupports: [{ groundingChunkIndices: [1] }],
              },
            },
          ],
        }),
      ]),
    )

    expect(result.citations).toEqual(["https://supported.example"])
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
                  annotations: [
                    {
                      url_citation: {
                        url: "https://example.com",
                        title: "Example",
                        start_index: 0,
                        end_index: 6,
                      },
                    },
                  ],
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
                content: [
                  { text: "A" },
                  {
                    text: "B",
                    annotations: [
                      {
                        url: "https://message.example",
                        title: "Message Source",
                        start_index: 0,
                        end_index: 1,
                      },
                    ],
                  },
                ],
              },
            ],
          }),
        ],
      ),
    )

    expect(chat.answer).toBe("answer")
    expect(chat.citations).toEqual(["Example — https://example.com"])
    expect(responses.answer).toBe("A\nB")
    expect(responses.citations).toEqual(["Message Source — https://message.example", "https://source.example"])
  })

  test("normalizes Anthropic responses across multiple pause_turn continuations", async () => {
    const result = await anthropicProvider.search(
      "query",
      {},
      createContext({}, { ANTHROPIC_API_KEY: "key" }, [
        jsonResponse({
          stop_reason: "pause_turn",
          content: [
            { type: "text", text: "intermediate", citations: [{ url: "https://inline-one.example" }] },
            {
              type: "web_search_tool_result",
              content: [
                { url: "https://search-one.example", title: "Search One", text: "one" },
                { url: "https://search-two.example", title: "Search Two", text: "two" },
              ],
            },
          ],
        }),
        jsonResponse({
          stop_reason: "pause_turn",
          content: [
            { type: "text", text: "more", citations: [{ url: "https://inline-two.example" }] },
            {
              type: "web_search_tool_result",
              content: [
                { url: "https://search-two.example", title: "Search Two", text: "two" },
                { url: "https://search-three.example", title: "Search Three", text: "three" },
              ],
            },
          ],
        }),
        jsonResponse({
          content: [
            {
              type: "text",
              text: "answer",
              citations: [{ url: "https://inline-two.example" }, { url: "https://final.example" }],
            },
            {
              type: "web_search_tool_result",
              content: [
                { url: "https://search-three.example", title: "Search Three", text: "three" },
                { url: "https://search-four.example", title: "Search Four", text: "four" },
              ],
            },
          ],
        }),
      ]),
    )

    expect(result.answer).toBe("intermediate\nmore\nanswer")
    expect(result.citations).toEqual([
      "https://inline-one.example",
      "https://search-one.example",
      "https://search-two.example",
      "https://inline-two.example",
      "https://search-three.example",
      "https://final.example",
      "https://search-four.example",
    ])
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
