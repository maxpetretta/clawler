import { describe, expect, test } from "bun:test"
import { resolveConfig } from "../config"
import { formatSearchResult } from "../format"
import { buildAnthropicRequest } from "../providers/anthropic"
import { buildBraveRequest } from "../providers/brave"
import { buildExaRequest } from "../providers/exa"
import { buildGeminiRequest } from "../providers/gemini"
import {
  buildOpenAIChatCompletionsRequest,
  buildOpenAIResponsesRequest,
  shouldUseOpenAIChatCompletions,
} from "../providers/openai"
import { buildParallelRequest } from "../providers/parallel"
import { buildPerplexityRequest } from "../providers/perplexity"
import { buildTavilyRequest } from "../providers/tavily"

describe("provider request builders", () => {
  test("builds a Brave web search request", () => {
    const request = buildBraveRequest(
      "openclaw plugins",
      {
        maxResults: 7,
        freshness: "pw",
        country: "us",
        searchLang: "en",
        includeDomains: ["openclaw.com"],
      },
      "brave-key",
      30,
    )

    const url = new URL(request.url)
    expect(url.hostname).toBe("api.search.brave.com")
    expect(url.searchParams.get("q")).toContain("site:openclaw.com")
    expect(url.searchParams.get("count")).toBe("7")
    expect(url.searchParams.get("freshness")).toBe("pw")
    expect(url.searchParams.get("country")).toBe("US")
    expect(request.headers["X-Subscription-Token"]).toBe("brave-key")
  })

  test("builds an Exa search request with dates and domains", () => {
    const request = buildExaRequest(
      "ai search",
      {
        maxResults: 5,
        freshness: "2026-03-01to2026-03-05",
        topic: "news",
        includeDomains: ["exa.ai"],
        excludeDomains: ["example.com"],
      },
      {
        apiKey: "exa-key",
        type: "auto",
        timeoutSeconds: 30,
      },
    )

    expect(request.url).toBe("https://api.exa.ai/search")
    expect(request.headers["x-api-key"]).toBe("exa-key")
    expect(request.body).toMatchObject({
      query: "ai search",
      type: "auto",
      numResults: 5,
      category: "news",
      includeDomains: ["exa.ai"],
      excludeDomains: ["example.com"],
      startPublishedDate: "2026-03-01T00:00:00.000Z",
      endPublishedDate: "2026-03-05T23:59:59.999Z",
    })
  })

  test("builds an Exa request for finance searches", () => {
    const request = buildExaRequest(
      "earnings",
      {
        topic: "finance",
      },
      {
        apiKey: "exa-key",
        type: "deep",
        timeoutSeconds: 30,
      },
    )

    expect(request.body).toMatchObject({
      category: "financial report",
    })
  })

  test("builds a Tavily search request", () => {
    const config = resolveConfig({})
    const request = buildTavilyRequest(
      "openclaw search",
      {
        maxResults: 4,
        freshness: "pd",
        topic: "news",
        includeDomains: ["docs.openclaw.com"],
        excludeDomains: ["example.com"],
        country: "us",
      },
      {
        ...config.tavily,
        apiKey: "tavily-key",
        timeoutSeconds: 30,
      },
    )

    expect(request.url).toBe("https://api.tavily.com/search")
    expect(request.body).toMatchObject({
      api_key: "tavily-key",
      query: "openclaw search",
      search_depth: config.tavily.searchDepth,
      max_results: 4,
      include_answer: config.tavily.includeAnswer,
      auto_parameters: config.tavily.autoParameters,
      topic: "news",
      time_range: "day",
      include_domains: ["docs.openclaw.com"],
      exclude_domains: ["example.com"],
      country: "united states",
    })
  })

  test("builds a Tavily range request", () => {
    const config = resolveConfig({})
    const request = buildTavilyRequest(
      "openclaw search",
      {
        freshness: "2026-03-01to2026-03-05",
      },
      {
        ...config.tavily,
        apiKey: "tavily-key",
        timeoutSeconds: 30,
      },
    )

    expect(request.body).toMatchObject({
      start_date: "2026-03-01",
      end_date: "2026-03-05",
    })
  })

  test("builds a Perplexity chat completion request", () => {
    const request = buildPerplexityRequest(
      "latest openclaw updates",
      {
        freshness: "pm",
        includeDomains: ["openclaw.com"],
      },
      {
        apiKey: "perplexity-key",
        baseUrl: "https://api.perplexity.ai",
        model: "sonar-pro",
        timeoutSeconds: 30,
        viaOpenRouter: false,
      },
    )

    expect(request.url).toBe("https://api.perplexity.ai/chat/completions")
    expect(request.headers.Authorization).toBe("Bearer perplexity-key")
    expect(request.body).toMatchObject({
      model: "sonar-pro",
      web_search_options: {
        search_recency_filter: "month",
        search_domain_filter: ["openclaw.com"],
      },
    })
  })

  test("builds a Perplexity exclude-domain range request", () => {
    const request = buildPerplexityRequest(
      "latest openclaw updates",
      {
        freshness: "2026-03-01to2026-03-05",
        excludeDomains: ["example.com"],
      },
      {
        apiKey: "perplexity-key",
        baseUrl: "https://api.perplexity.ai",
        model: "sonar-pro",
        timeoutSeconds: 30,
        viaOpenRouter: true,
      },
    )

    expect(request.body).toMatchObject({
      model: "perplexity/sonar-pro",
      web_search_options: {
        search_after_date_filter: "03/01/2026",
        search_before_date_filter: "03/05/2026",
        search_domain_filter: ["example.com"],
        search_filter: "exclude_domains",
      },
    })
  })

  test("preserves an already-prefixed OpenRouter model name", () => {
    const request = buildPerplexityRequest(
      "latest openclaw updates",
      {},
      {
        apiKey: "perplexity-key",
        baseUrl: "https://openrouter.ai/api/v1",
        model: "perplexity/sonar-pro",
        timeoutSeconds: 30,
        viaOpenRouter: true,
      },
    )

    expect(request.body).toMatchObject({
      model: "perplexity/sonar-pro",
    })
  })

  test("builds a Parallel search request", () => {
    const config = resolveConfig({
      parallel: {
        mode: "fast",
        maxCharsPerResult: 2000,
      },
    })
    const request = buildParallelRequest(
      "agent search",
      {
        freshness: "pw",
        includeDomains: ["parallel.ai"],
      },
      {
        ...config.parallel,
        apiKey: "parallel-key",
        timeoutSeconds: 45,
      },
    )

    expect(request.url).toBe("https://api.parallel.ai/v1beta/search")
    expect(request.headers["parallel-beta"]).toBe("search-extract-2025-10-10")
    expect(request.body).toMatchObject({
      search_queries: ["agent search"],
      mode: "fast",
      excerpts: {
        max_chars_per_result: 2000,
      },
      source_policy: {
        include_domains: ["parallel.ai"],
      },
    })
    expect((request.body as Record<string, unknown>).source_policy).toMatchObject({
      after_date: expect.any(String),
    })
  })

  test("builds a Gemini grounded search request", () => {
    const request = buildGeminiRequest(
      "search this",
      {
        topic: "general",
      },
      {
        apiKey: "gemini-key",
        model: "gemini-2.5-flash",
        timeoutSeconds: 30,
      },
    )

    expect(request.url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent")
    expect(request.headers["x-goog-api-key"]).toBe("gemini-key")
    expect(request.body).toMatchObject({
      tools: [{ google_search: {} }],
    })
  })

  test("builds an OpenAI responses request", () => {
    const request = buildOpenAIResponsesRequest(
      "who won yesterday",
      {
        country: "us",
        includeDomains: ["openai.com"],
        excludeDomains: ["example.com"],
      },
      {
        apiKey: "openai-key",
        apiMode: "responses",
        model: "gpt-5",
        chatCompletionsModel: "gpt-5-search-api",
        reasoningEffort: "low",
        searchContextSize: "medium",
        includeSources: true,
        externalWebAccess: true,
        timeoutSeconds: 30,
      },
    )

    expect(request.url).toBe("https://api.openai.com/v1/responses")
    expect(request.body).toMatchObject({
      model: "gpt-5",
      reasoning: {
        effort: "low",
      },
      tool_choice: "auto",
      tools: [
        {
          type: "web_search",
          search_context_size: "medium",
          external_web_access: true,
          filters: {
            allowed_domains: ["openai.com"],
            blocked_domains: ["example.com"],
          },
          user_location: {
            type: "approximate",
            country: "US",
          },
        },
      ],
      include: ["web_search_call.action.sources"],
    })
  })

  test("builds an OpenAI chat completions search request", () => {
    const request = buildOpenAIChatCompletionsRequest(
      "what is openai",
      {},
      {
        apiKey: "openai-key",
        apiMode: "chat_completions_search",
        model: "gpt-5-mini",
        chatCompletionsModel: "gpt-5-search-api",
        reasoningEffort: "low",
        searchContextSize: "medium",
        includeSources: true,
        externalWebAccess: true,
        timeoutSeconds: 30,
      },
    )

    expect(request.url).toBe("https://api.openai.com/v1/chat/completions")
    expect(request.body).toMatchObject({
      model: "gpt-5-search-api",
      messages: [{ role: "user", content: "what is openai" }],
    })
  })

  test("OpenAI auto mode uses Responses when native filtering is required", () => {
    expect(shouldUseOpenAIChatCompletions({}, "auto")).toBe(true)
    expect(shouldUseOpenAIChatCompletions({ includeDomains: ["openai.com"] }, "auto")).toBe(false)
    expect(shouldUseOpenAIChatCompletions({ excludeDomains: ["example.com"] }, "auto")).toBe(false)
    expect(shouldUseOpenAIChatCompletions({ country: "us" }, "auto")).toBe(false)
  })

  test("builds an Anthropic messages request", () => {
    const request = buildAnthropicRequest(
      "find docs",
      {
        country: "us",
        excludeDomains: ["example.com"],
      },
      {
        apiKey: "anthropic-key",
        model: "claude-sonnet-4-6",
        toolVersion: "web_search_20260209",
        maxUses: 5,
        directOnly: true,
        timeoutSeconds: 30,
      },
    )

    expect(request.url).toBe("https://api.anthropic.com/v1/messages")
    expect(request.headers["x-api-key"]).toBe("anthropic-key")
    expect(request.body).toMatchObject({
      model: "claude-sonnet-4-6",
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: 5,
          allowed_callers: ["direct"],
          blocked_domains: ["example.com"],
          user_location: {
            type: "approximate",
            country: "US",
          },
        },
      ],
    })
  })

  test("prefers Anthropic allowed domains when both allow and deny lists are provided", () => {
    const request = buildAnthropicRequest(
      "find docs",
      {
        includeDomains: ["anthropic.com"],
        excludeDomains: ["example.com"],
      },
      {
        apiKey: "anthropic-key",
        model: "claude-sonnet-4-6",
        toolVersion: "web_search_20260209",
        maxUses: 5,
        directOnly: true,
        timeoutSeconds: 30,
      },
    )

    expect(request.body).toMatchObject({
      tools: [
        {
          allowed_domains: ["anthropic.com"],
        },
      ],
    })
  })

  test("builds an Anthropic allow-list request when only include domains are provided", () => {
    const request = buildAnthropicRequest(
      "find docs",
      {
        includeDomains: ["anthropic.com"],
      },
      {
        apiKey: "anthropic-key",
        model: "claude-sonnet-4-6",
        toolVersion: "web_search_20260209",
        maxUses: 5,
        directOnly: true,
        timeoutSeconds: 30,
      },
    )

    expect(request.body).toMatchObject({
      tools: [
        {
          allowed_domains: ["anthropic.com"],
        },
      ],
    })
  })
})

describe("result formatting", () => {
  test("formats hybrid results with answer and sources", () => {
    const text = formatSearchResult({
      provider: "tavily",
      query: "openclaw docs",
      answer: "Use the docs page.",
      citations: ["https://openclaw.com/docs"],
      results: [
        {
          title: "Docs",
          url: "https://openclaw.com/docs",
          snippet: "Everything starts here.",
        },
      ],
    })

    expect(text).toContain('Search results for "openclaw docs" (via tavily):')
    expect(text).toContain("Answer:")
    expect(text).toContain("Sources:")
    expect(text).toContain("Results:")
    expect(text).toContain("1. Docs")
  })
})
