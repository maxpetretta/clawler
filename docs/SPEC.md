# better-search — Spec

> Universal web search plugin for OpenClaw.
> Drop-in replacement for the built-in `web_search` tool.

**Version:** 0.1.0
**Author:** Max Petretta
**Date:** 2026-03-07

## 1. Goal

Better Search provides a single OpenClaw tool surface that can route web-search requests across multiple providers without changing the prompt interface the model sees.

The plugin is designed to:

1. Register a configurable tool name, defaulting to `better_search`.
2. Support both traditional search backends and model-native web-search APIs.
3. Normalize their outputs into one result shape.
4. Require no OpenClaw core patches.

Recommended OpenClaw config:

```json5
{
  tools: {
    deny: ["web_search"],
  },
}
```

That keeps the agent on the plugin tool instead of the built-in tool.

## 2. Current Status

Implemented now:

- Plugin tool registration and execution
- In-memory TTL caching
- Provider auto-detection and explicit provider selection
- Eight provider integrations
- Shared request options across providers
- Plugin-level shared search defaults
- Clack CLI commands for `better-search status` and `better-search setup`
- Request-builder tests and live provider validation

Not fully implemented yet:

- Built-in benchmark harness checked into `scripts/`
- Rich UI hints beyond the JSON schema surface

## 3. Providers

### 3.1 Implemented

| Provider | Category | Output shape | Auth |
|---|---|---|---|
| `brave` | Traditional search | `results[]` | `BRAVE_API_KEY` |
| `exa` | Traditional search | `results[]` | `EXA_API_KEY` |
| `tavily` | Hybrid search | `answer` + `results[]` + `citations[]` | `TAVILY_API_KEY` |
| `perplexity` | LLM search | `answer` + `citations[]` + optional `results[]` | `PERPLEXITY_API_KEY` or `OPENROUTER_API_KEY` |
| `parallel` | Traditional search | `results[]` | `PARALLEL_API_KEY` |
| `gemini` | LLM search | `answer` + `citations[]` | `GEMINI_API_KEY` or `GOOGLE_AI_API_KEY` |
| `openai` | LLM search | `answer` + `citations[]` | `OPENAI_API_KEY` |
| `anthropic` | LLM search | `answer` + `citations[]` | `ANTHROPIC_API_KEY` |

### 3.2 Auto-detection priority

When `provider: "auto"` is configured, the plugin resolves providers in this order:

1. `exa`
2. `tavily`
3. `brave`
4. `parallel`
5. `perplexity`
6. `openai`
7. `anthropic`
8. `gemini`

## 4. Architecture

### 4.1 Core flow

```text
agent
  -> better_search(query, options)
    -> if options.provider: use that provider (per-call override, no fallback)
    -> else: resolve configured default or auto-detect from available keys
    -> execute provider request
      -> on success: normalize + format + return
      -> on error + fallback configured: try next provider in fallback chain
      -> on error + no fallback: throw
    -> format response text for the agent (includes fallback note if applicable)
```

### 4.2 Result model

Internally, every provider returns:

```ts
type SearchResult = {
  provider: ProviderId
  query: string
  results?: Array<{
    title: string
    url: string
    snippet: string
    publishedDate?: string
  }>
  answer?: string
  citations?: string[]
  meta?: Record<string, unknown>
}
```

The tool currently formats that into text before returning it to OpenClaw.

### 4.3 Cache

- Cache type: in-memory TTL cache
- Key: `provider:query:stable_options_hash`
- Default TTL: `15` minutes
- Scope: current process only

## 5. Tool Surface

The registered tool accepts:

```json5
{
  query: "string",
  provider: "brave | exa | tavily | perplexity | parallel | gemini | openai | anthropic",
  count: 5,
  freshness: "pd | pw | pm | py | YYYY-MM-DDtoYYYY-MM-DD",
  country: "us",
  search_lang: "en",
  topic: "general | news | finance",
  include_domains: ["example.com"],
  exclude_domains: ["example.com"]
}
```

- `provider` (optional): Override the default search provider for this call. If omitted, uses the configured default or auto-detection. This enables per-query provider selection — e.g., use `exa` for research, `openai` for complex reasoning, `brave` for fast structured results.

### 5.1 Shared request options

These options are available at the plugin tool layer for all providers:

- `maxResults`
- `freshness`
- `country`
- `searchLang`
- `topic`
- `includeDomains`
- `excludeDomains`

Some providers support them natively. Others only receive them as prompt guidance.

## 6. Plugin Configuration

### 6.1 Top-level config

```json5
{
  plugins: {
    entries: {
      "better-search": {
        enabled: true,
        config: {
          provider: "auto",
          fallback: ["perplexity", "brave"],
          toolName: "better_search",
          maxResults: 5,
          cacheTtlMinutes: 15,
          timeoutSeconds: 60,

          searchDefaults: {
            freshness: "pm",
            country: "us",
            searchLang: "en",
            topic: "news",
            includeDomains: ["openai.com"],
            excludeDomains: ["example.com"]
          },

          exa: {
            type: "auto"
          },

          tavily: {
            searchDepth: "advanced",
            includeAnswer: true,
            autoParameters: true
          },

          perplexity: {
            baseUrl: "https://api.perplexity.ai",
            model: "sonar-pro"
          },

          parallel: {
            mode: "fast",
            maxCharsPerResult: 1500
          },

          gemini: {
            model: "gemini-2.5-flash"
          },

          openai: {
            apiMode: "auto",
            model: "gpt-5-mini",
            chatCompletionsModel: "gpt-5-search-api",
            reasoningEffort: "low",
            searchContextSize: "medium",
            includeSources: true,
            externalWebAccess: true
          },

          anthropic: {
            model: "claude-sonnet-4-6",
            toolVersion: "web_search_20260209",
            maxUses: 5,
            directOnly: true
          }
        }
      }
    }
  }
}
```

### 6.2 Shared plugin-level defaults

`searchDefaults` is the shared config layer for request options that apply across providers.

If a tool call omits one of these values, Better Search falls back to:

1. tool-call parameter
2. plugin `searchDefaults`
3. plugin global default

Examples:

- `count` falls back to `maxResults`
- `country` falls back to `searchDefaults.country`
- `include_domains` falls back to `searchDefaults.includeDomains`

### 6.3 Fallback chain

When the primary provider fails (timeout, rate limit, API error, missing key), the plugin can automatically retry with fallback providers.

**Config:**

```json5
{
  provider: "openai",
  fallback: ["perplexity", "brave"],
}
```

**Behavior:**

1. Try the primary provider (`provider` config or per-call `provider` param).
2. If it fails, try each provider in the `fallback` array in order.
3. If all fail, throw the last error.
4. On fallback, the result includes a note: `"(via brave, fallback from openai)"` so the agent knows which provider actually served the response.

**Rules:**

- `fallback` is an ordered array of provider IDs. Empty array `[]` disables fallback (fail immediately).
- Default: `[]` (no fallback) — users opt in explicitly.
- Only triggers on errors (timeout, HTTP 4xx/5xx, missing credentials). Does **not** trigger on empty results (that's a valid response).
- Per-call `provider` overrides skip the fallback chain — if you explicitly request a provider, you get that provider or an error.
- Each fallback attempt uses the same query and options as the original call.
- Fallback attempts are not cached (only the successful final result is cached).
- The fallback provider must be available (has credentials configured). Unavailable providers in the chain are silently skipped.

**Example flows:**

```
# Config: provider=openai, fallback=[perplexity, brave]

Query → openai (timeout) → perplexity (success)
  Result: "Search results for ... (via perplexity, fallback from openai)"

Query → openai (timeout) → perplexity (rate limit) → brave (success)  
  Result: "Search results for ... (via brave, fallback from openai)"

Query → openai (timeout) → perplexity (rate limit) → brave (error)
  Error: "All providers failed: openai (timeout), perplexity (rate limit), brave (error)"

# Per-call override: provider=exa (no fallback)
Query → exa (error)
  Error: "exa: <error message>"
```

### 6.4 Provider-specific config

Each provider exposes its own config options. Options are either **hardcoded** (not user-configurable), **configurable** (set via plugin config), or **normalized** (mapped from the shared tool params like `freshness`, `country`, etc.).

#### Brave

| Option | Default | Type | Notes |
|---|---|---|---|
| `apiKey` | env `BRAVE_API_KEY` | string | Required |
| `enableRichResults` | `true` | boolean | Fetch structured data (stocks, crypto, weather, sports) via Rich Search API callback. **⚠️ Requires paid Search plan.** |
| `safesearch` | _(unset, API defaults to moderate)_ | `"off" \| "moderate" \| "strict"` | Content filtering level |

**Hardcoded:** `extra_snippets=true` always sent (returns empty on free plan, up to 5 additional excerpts per result on paid plan).

**Normalized from shared options:**
- `count` → `count` param (native)
- `freshness` → `freshness` param (native: `pd`, `pw`, `pm`, `py`, date ranges)
- `country` → `country` param (native)
- `searchLang` → `search_lang` + `ui_lang` params (native)
- `includeDomains` / `excludeDomains` → query rewriting with `site:` / `-site:` operators

**Plan-gated features:**
- `extra_snippets`: returns data only on paid Search plan
- Rich data callback (`enable_rich_callback`): requires paid Search plan
- Free tier: 2,000 queries/month, 1 req/sec rate limit

```json5
{
  brave: {
    apiKey: "...",
    enableRichResults: true,
    safesearch: "moderate"
  }
}
```

#### Exa

| Option | Default | Type | Notes |
|---|---|---|---|
| `apiKey` | env `EXA_API_KEY` | string | Required |
| `type` | `"auto"` | `"neural" \| "fast" \| "auto" \| "deep" \| "deep-reasoning" \| "instant"` | Search mode. `neural` = embeddings-based (good for natural language). `fast` = keyword. `auto` = Exa decides. `deep` = multi-step with structured output. |
| `category` | _(unset)_ | `"company" \| "people" \| "research paper" \| "news" \| "tweet" \| "personal site" \| "financial report"` | Filter results by content category. Overrides topic-based mapping when set. |
| `maxAgeHours` | _(unset)_ | number | Content freshness control. `0` = always livecrawl (real-time), `24` = daily fresh, `-1` = cache only (fastest). Different from `freshness` which filters by publication date. |

**Hardcoded:** `contents.highlights.maxCharacters = 4000` (was `numSentences: 3` — 4000 chars per result gives much richer excerpts).

**Normalized from shared options:**
- `count` → `numResults` (native)
- `freshness` → `startPublishedDate` / `endPublishedDate` (native, ISO dates)
- `topic` → `category` mapping: `"news"` → `"news"`, `"finance"` → `"financial report"`. Config `category` overrides this.
- `includeDomains` / `excludeDomains` → native `includeDomains` / `excludeDomains` arrays
- `country`, `searchLang` → prompt guidance only (no native params)

```json5
{
  exa: {
    apiKey: "...",
    type: "auto",
    category: "research paper",
    maxAgeHours: 24
  }
}
```

#### Tavily

| Option | Default | Type | Notes |
|---|---|---|---|
| `apiKey` | env `TAVILY_API_KEY` | string | Required |
| `searchDepth` | `"advanced"` | `"basic" \| "advanced" \| "fast" \| "ultra-fast"` | Search thoroughness. `advanced` costs 2 credits per query. |
| `includeAnswer` | `true` | `boolean \| "basic" \| "advanced"` | Include LLM-generated answer alongside results. |
| `autoParameters` | `true` | boolean | Let Tavily auto-tune parameters based on query. |
| `chunksPerSource` | _(unset, defaults to 3 for advanced/fast)_ | number | Number of content chunks per source. Only applies when `searchDepth` is `"advanced"` or `"fast"`. |
| `includeRawContent` | `false` | boolean | Include full page text in results (`raw_content` field). Best paired with `searchDepth: "advanced"`. |
| `exactMatch` | `false` | boolean | Enable verbatim phrase matching. Useful for legal/compliance queries. |

**Hardcoded:** Queries over 400 characters are truncated at the last word boundary (per Tavily best practices).

**Normalized from shared options:**
- `count` → `max_results` (native)
- `freshness` → `time_range` (relative: `day`, `week`, `month`, `year`) or `start_date`/`end_date` (ranges) (native)
- `country` → `country` param with ISO name mapping (native)
- `topic` → `topic` param (native: `general`, `news`, `finance`)
- `includeDomains` / `excludeDomains` → native `include_domains` / `exclude_domains`
- `searchLang` → prompt guidance only

```json5
{
  tavily: {
    apiKey: "...",
    searchDepth: "advanced",
    includeAnswer: true,
    autoParameters: true,
    chunksPerSource: 3,
    includeRawContent: false,
    exactMatch: false
  }
}
```

#### Perplexity

| Option | Default | Type | Notes |
|---|---|---|---|
| `apiKey` | env `PERPLEXITY_API_KEY` or `OPENROUTER_API_KEY` | string | Falls back to OpenRouter if no direct key. |
| `apiMode` | `"search"` | `"search" \| "chat"` | `search` uses the dedicated Search API (`/search`). `chat` uses Chat Completions (`/chat/completions`). Search API is ~30x faster. |
| `baseUrl` | `"https://api.perplexity.ai"` | string | API base URL. Auto-switches to `https://openrouter.ai/api/v1` when using OpenRouter. |
| `model` | `"sonar-pro"` | string | Model ID. Options: `sonar`, `sonar-pro`, `sonar-reasoning-pro`. OpenRouter models auto-prefixed with `perplexity/`. |

**Hardcoded:** none.

**Normalized from shared options:**
- `count` → `max_results` (native on Search API path)
- `freshness` → `search_recency_filter` (relative: `day`, `week`, `month`, `year`) or date filters (native)
- `country` → native on Search API, prompt guidance on chat path
- `searchLang` → `search_language_filter` on Search API, prompt guidance on chat path
- `includeDomains` / `excludeDomains` → `search_domain_filter` (native on both paths)
- `topic` → prompt guidance only

```json5
{
  perplexity: {
    apiKey: "...",
    apiMode: "search",
    baseUrl: "https://api.perplexity.ai",
    model: "sonar-pro"
  }
}
```

#### Parallel

| Option | Default | Type | Notes |
|---|---|---|---|
| `apiKey` | env `PARALLEL_API_KEY` | string | Required |
| `mode` | `"one-shot"` | string | Search mode. `"one-shot"` is the API default (best quality). `"fast"` deprioritizes quality for speed. |
| `maxCharsPerResult` | `5000` | number | Maximum characters per result excerpt. API supports up to 10,000. |
| `maxCharsTotal` | `50000` | number | Maximum total characters across all excerpts. API maximum is 50,000. |
| `maxAgeSeconds` | _(unset)_ | number | Content cache age control via `fetch_policy.max_age_seconds`. Lower = more live content. |

**Hardcoded:** Required beta header `parallel-beta: search-extract-2025-10-10`.

**Normalized from shared options:**
- `count` → `max_results` (native)
- `freshness` → `source_policy.after_date` (native, ISO date)
- `includeDomains` / `excludeDomains` → `source_policy.include_domains` / `source_policy.exclude_domains` (native)
- `country`, `searchLang`, `topic` → prompt guidance only (injected into `objective`)

```json5
{
  parallel: {
    apiKey: "...",
    mode: "one-shot",
    maxCharsPerResult: 5000,
    maxCharsTotal: 50000,
    maxAgeSeconds: 3600
  }
}
```

#### Gemini

| Option | Default | Type | Notes |
|---|---|---|---|
| `apiKey` | env `GEMINI_API_KEY` or `GOOGLE_AI_API_KEY` | string | Required |
| `model` | `"gemini-2.5-flash"` | string | Gemini model ID. |
| `dynamicThreshold` | _(unset)_ | number (0-1) | Dynamic retrieval threshold. Lower = more likely to search, higher = more likely to use model knowledge. When unset, model always searches. |

**Hardcoded:** `tools: [{ google_search: {} }]` (or with `dynamic_retrieval_config` when threshold is set).

**Citation handling:** Citations come from `groundingMetadata`. The plugin extracts real URLs from `searchEntryPoint.renderedContent` HTML (parsing `href` attributes) and falls back to `groundingChunks[].web.uri` (which may be Google redirect URLs). `webSearchQueries` from the metadata is included in `meta.webSearchQueries`.

**Normalized from shared options:**
- All shared options (`freshness`, `country`, `searchLang`, `topic`, `includeDomains`, `excludeDomains`) → prompt guidance only. Gemini has no structured search controls.

```json5
{
  gemini: {
    apiKey: "...",
    model: "gemini-2.5-flash",
    dynamicThreshold: 0.3
  }
}
```

#### OpenAI

| Option | Default | Type | Notes |
|---|---|---|---|
| `apiKey` | env `OPENAI_API_KEY` | string | Required |
| `apiMode` | `"auto"` | `"auto" \| "responses" \| "chat_completions_search"` | `auto` uses Chat Completions for simple queries, switches to Responses API when domain filtering or country is needed. |
| `model` | `"gpt-5-mini"` | string | Model for Responses API path. |
| `chatCompletionsModel` | `"gpt-5-search-api"` | string | Model for Chat Completions search path. |
| `reasoningEffort` | `"low"` | `"low" \| "medium" \| "high"` | Reasoning depth on Responses API. Higher = better but slower + more expensive. |
| `searchContextSize` | `"medium"` | `"low" \| "medium" \| "high"` | Amount of search context to include. |
| `includeSources` | `true` | boolean | Include `web_search_call.action.sources` for full source list (beyond inline citations). |
| `externalWebAccess` | `true` | boolean | `false` = cache/indexed results only (offline mode). |
| `city` | _(unset)_ | string | City for location-aware results (e.g., `"San Francisco"`). |
| `region` | _(unset)_ | string | Region for location-aware results (e.g., `"California"`). |
| `timezone` | _(unset)_ | string | IANA timezone (e.g., `"America/Los_Angeles"`). |

**Hardcoded:** Citation annotations include `title`, `start_index`, `end_index` alongside `url`.

**Normalized from shared options:**
- `count` → not directly supported (model decides result count)
- `freshness` → prompt guidance only
- `country` → `user_location.country` on Responses API (native), prompt guidance on Chat Completions
- `includeDomains` → `filters.allowed_domains` on Responses API (native, up to 100)
- `excludeDomains` → `filters.blocked_domains` on Responses API (native)
- `searchLang`, `topic` → prompt guidance only

```json5
{
  openai: {
    apiKey: "...",
    apiMode: "auto",
    model: "gpt-5-mini",
    chatCompletionsModel: "gpt-5-search-api",
    reasoningEffort: "low",
    searchContextSize: "medium",
    includeSources: true,
    externalWebAccess: true,
    city: "San Francisco",
    region: "California",
    timezone: "America/Los_Angeles"
  }
}
```

#### Anthropic

| Option | Default | Type | Notes |
|---|---|---|---|
| `apiKey` | env `ANTHROPIC_API_KEY` | string | Required |
| `model` | `"claude-sonnet-4-6"` | string | Claude model ID. |
| `toolVersion` | `"web_search_20260209"` | `"web_search_20250305" \| "web_search_20260209"` | `20260209` supports dynamic filtering (code execution to filter results before context). `20250305` is basic search. |
| `maxTokens` | `4096` | number | Max output tokens for the response. Previous default of 1024 caused truncation. |
| `maxUses` | `5` | number | Maximum number of search calls per request. Claude may do multiple searches autonomously. |
| `directOnly` | `true` | boolean | When `true` on `web_search_20260209`, sends `allowed_callers: ["direct"]` to disable dynamic filtering's code execution. Required for ZDR eligibility. |
| `city` | _(unset)_ | string | City for location-aware results. |
| `region` | _(unset)_ | string | Region for location-aware results. |
| `timezone` | _(unset)_ | string | IANA timezone. |

**Hardcoded:** Multi-turn continuation — the plugin loops up to 5 times on `pause_turn` responses, accumulating all content blocks. Citation URLs are extracted from both inline `citations[]` on text blocks and `web_search_tool_result` content blocks.

**Normalized from shared options:**
- `count` → not directly supported (controlled by `maxUses` which limits search count, not result count)
- `freshness` → prompt guidance only
- `country` → `user_location.country` (native)
- `includeDomains` → `allowed_domains` (native). Both `allowed_domains` and `blocked_domains` can be set simultaneously.
- `excludeDomains` → `blocked_domains` (native)
- `searchLang`, `topic` → prompt guidance only

```json5
{
  anthropic: {
    apiKey: "...",
    model: "claude-sonnet-4-6",
    toolVersion: "web_search_20260209",
    maxTokens: 4096,
    maxUses: 5,
    directOnly: true,
    city: "San Francisco",
    region: "California",
    timezone: "America/Los_Angeles"
  }
}
```

## 7. Provider Implementation Details

### 7.1 Brave

- **Endpoint:** `GET https://api.search.brave.com/res/v1/web/search`
- **Rich endpoint:** `GET https://api.search.brave.com/res/v1/web/rich?callback_key={key}`
- **Auth:** `X-Subscription-Token` header
- **Output:** Structured `results[]` with title, URL, description, extra_snippets. Rich data in `meta.rich` when available.
- **Domain filtering:** Query rewriting with `site:` and `-site:` search operators (Brave doesn't have native domain filter params).
- **Rate limits:** Free tier: 1 req/sec, 2,000/month. Paid Search plan: higher limits + extra_snippets + rich data.

### 7.2 Exa

- **Endpoint:** `POST https://api.exa.ai/search`
- **Auth:** `x-api-key` header
- **Output:** Structured `results[]` with title, URL, highlights (up to 4000 chars each), publishedDate.
- **Domain filtering:** Native `includeDomains` / `excludeDomains` arrays.
- **Category mapping:** `topic: "news"` → `category: "news"`, `topic: "finance"` → `category: "financial report"`. Config `category` overrides topic mapping.
- **Freshness:** Dual mechanism — `startPublishedDate`/`endPublishedDate` for publication date filtering, `maxAgeHours` for cache freshness control.

### 7.3 Tavily

- **Endpoint:** `POST https://api.tavily.com/search`
- **Auth:** `api_key` in request body
- **Output:** Hybrid — `answer` (LLM summary) + `results[]` (structured) + optional `raw_content` per result.
- **Query limit:** Queries truncated at 400 characters (word boundary) per best practices.
- **Chunk reranking:** `chunks_per_source` controls snippet count per source for `advanced`/`fast` depths.
- **Domain filtering:** Native `include_domains` / `exclude_domains` with automatic normalization (strips protocols, trailing slashes).

### 7.4 Perplexity

- **Search endpoint:** `POST {baseUrl}/search` (apiMode: `"search"`, default)
- **Chat endpoint:** `POST {baseUrl}/chat/completions` (apiMode: `"chat"`)
- **Auth:** `Authorization: Bearer` header
- **Output:** `answer` (synthesized text) + `citations[]` + optional `results[]` (structured on Search API).
- **OpenRouter fallback:** When no `PERPLEXITY_API_KEY` is set but `OPENROUTER_API_KEY` exists, routes through OpenRouter with auto-prefixed model (`perplexity/sonar-pro`). Only chat path is available via OpenRouter.
- **Performance:** Search API is ~30x faster than chat completions (1.2s vs 36.6s in benchmarks).

### 7.5 Parallel

- **Endpoint:** `POST https://api.parallel.ai/v1beta/search`
- **Auth:** `x-api-key` header
- **Required header:** `parallel-beta: search-extract-2025-10-10`
- **Output:** Structured `results[]` with title, URL, excerpt (up to 5000 chars each).
- **Dual input:** `objective` (natural language goal with prompt guidance) + `search_queries` (focused keyword queries, currently `[query]`).
- **Cache control:** `fetch_policy.max_age_seconds` controls indexed vs live content freshness.
- **Domain filtering:** Native `source_policy.include_domains` / `source_policy.exclude_domains`.

### 7.6 Gemini

- **Endpoint:** `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- **Auth:** `x-goog-api-key` query param
- **Output:** `answer` (synthesized text) + `citations[]` (real URLs when parseable from HTML, otherwise Google redirect URLs).
- **Search tool:** `tools: [{ google_search: {} }]`, optionally with `dynamic_retrieval_config`.
- **Citation pipeline:** 1) Parse `searchEntryPoint.renderedContent` HTML for real `href` URLs. 2) Fall back to `groundingChunks[].web.uri` (may be `vertexaisearch.cloud.google.com` redirects). 3) Include `webSearchQueries` in `meta` for transparency.
- **No native shared controls:** All options (freshness, country, domains, etc.) are injected as prompt guidance.

### 7.7 OpenAI

- **Responses endpoint:** `POST https://api.openai.com/v1/responses` with `tools: [{ type: "web_search" }]`
- **Chat endpoint:** `POST https://api.openai.com/v1/chat/completions` with search-enabled models
- **Auth:** `Authorization: Bearer` header
- **Output:** `answer` (synthesized text via `output_text`) + `citations[]` (from annotations + sources).
- **Adaptive mode:** `apiMode: "auto"` uses Chat Completions for simple queries (faster, cheaper) and switches to Responses API when domain filtering or country targeting is needed.
- **Annotation data:** `url_citation` annotations include `title`, `url`, `start_index`, `end_index` for precise source attribution.
- **Offline mode:** `externalWebAccess: false` restricts to cached/indexed results only.
- **Location:** Full `user_location` with `country`, `city`, `region`, `timezone` on Responses API path.

### 7.8 Anthropic

- **Endpoint:** `POST https://api.anthropic.com/v1/messages`
- **Auth:** `x-api-key` header, `anthropic-version: 2023-06-01`
- **Output:** `answer` (synthesized text from all text blocks) + `citations[]` (inline citations + web_search_tool_result source URLs, deduped).
- **Tool versions:** `web_search_20250305` (basic) and `web_search_20260209` (dynamic filtering with code execution for result post-processing).
- **Multi-turn continuation:** Claude may respond with `stop_reason: "pause_turn"` during complex searches. The plugin loops up to 5 continuations, accumulating all content blocks into the final response.
- **Domain filtering:** Both `allowed_domains` and `blocked_domains` can be set simultaneously (fixed from earlier bug where only one was used).
- **ZDR compatibility:** Set `directOnly: true` on `web_search_20260209` to send `allowed_callers: ["direct"]`, disabling code execution for Zero Data Retention eligibility.
- **Location:** Full `user_location` with `country`, `city`, `region`, `timezone`.

## 8. Shared Option Capability Matrix

### 8.1 Shared tool options

| Provider | Freshness | Country | Search Lang | Topic | Allow list | Deny list | Count |
|---|---|---|---|---|---|---|---|
| `brave` | Native | Native | Native | Prompt | Query `site:` | Query `-site:` | Native |
| `exa` | Native (pub date) | Prompt | Prompt | Native (category) | Native | Native | Native |
| `tavily` | Native | Native | Prompt | Native | Native | Native | Native |
| `perplexity` | Native | Native* | Native* | Prompt | Native | Native | Native* |
| `parallel` | Native | Prompt | Prompt | Prompt | Native | Native | Native |
| `gemini` | Prompt | Prompt | Prompt | Prompt | Prompt | Prompt | — |
| `openai` | Prompt | Native† | Prompt | Prompt | Native† | Native† | — |
| `anthropic` | Prompt | Native | Prompt | Prompt | Native | Native | — |

**Legend:**
- **Native** = passed as a structured API parameter
- **Prompt** = injected into the query/prompt text as guidance
- **Query** = implemented via search operators in the query string
- **—** = not supported (model decides)
- **\*** = Search API path only (chat path uses prompt guidance)
- **†** = Responses API path only (Chat Completions path uses prompt guidance)

### 8.2 Provider-specific capabilities

| Provider | Location | Cache control | Content extraction | Rich data | Multi-search | Continuation |
|---|---|---|---|---|---|---|
| `brave` | — | — | extra_snippets (paid) | Stocks, crypto, weather, sports (paid) | — | — |
| `exa` | — | `maxAgeHours` (livecrawl) | highlights (4000 chars/result) | — | — | — |
| `tavily` | — | — | `includeRawContent`, `chunksPerSource` | — | — | — |
| `perplexity` | — | — | — | — | — | — |
| `parallel` | — | `maxAgeSeconds` (fetch_policy) | excerpts (5000 chars/result, 50K total) | — | — | — |
| `gemini` | — | — | — | — | — | dynamic retrieval threshold |
| `openai` | city, region, timezone | `externalWebAccess` | `searchContextSize` | — | — | — |
| `anthropic` | city, region, timezone | — | — | — | `maxUses` (up to N searches) | `pause_turn` loop (up to 5) |

### 8.3 Plan-gated features

| Provider | Feature | Requires |
|---|---|---|
| `brave` | `extra_snippets` (5 additional excerpts per result) | Paid Search plan |
| `brave` | Rich data callback (stocks, crypto, weather, sports) | Paid Search plan |
| `brave` | Higher rate limits (free: 1 req/sec, 2K/month) | Paid Search plan |
| `tavily` | `searchDepth: "advanced"` | 2 credits per query (vs 1 for basic) |
| `anthropic` | `web_search_20260209` dynamic filtering | Code execution tool must be enabled |

## 9. Output Formatting

The tool currently returns text in this shape:

```text
Search results for "query" (via openai):

Answer:
...

Sources:
- https://example.com

Results:
1. Title
   URL: https://example.com
   Published: 2026-03-01
   Snippet...
```

Formatting rules:

- show `Answer:` when a provider returned synthesized text
- show `Sources:` when citations were extracted
- show `Results:` when structured search results were returned
- show `No results returned.` when neither answer nor results are present

## 10. CLI

Currently implemented:

- `better-search status`
- `better-search setup`

Current behavior:

- `status` shows provider availability and credential source
- `setup` lets the user choose a default provider, shows detected providers, optionally captures a provider API key, writes the result into `~/.openclaw/openclaw.json`, and installs the bundled Better Search skill into OpenClaw's managed `skills/better-search` directory
- `setup` ensures:
  - `plugins.allow` contains `better-search`
  - `plugins.load.paths` contains the current plugin path
  - `plugins.entries["better-search"].enabled = true`
  - `plugins.entries["better-search"].config.provider` is set
  - `tools.deny` includes `web_search` when requested
  - the standalone skill package is copied into the OpenClaw state directory under `skills/better-search`

## 11. Validation

Current automated coverage:

- provider request-builder tests
- provider registry tests
- shared-default resolution tests

Current live validation status:

- Brave: validated
- Exa: validated
- Tavily: validated
- Perplexity: validated
- Parallel: validated
- Gemini: validated
- OpenAI: validated
- Anthropic: validated

## 12. Known Tradeoffs

1. Traditional-search providers are much faster, but they return result lists rather than a synthesized answer.
2. Gemini citations are usable but often come back as Google redirect URLs.
3. OpenAI and Anthropic run a separate model call from the agent's primary model; they do not require the session model to match the search provider.
4. Shared request options are normalized at the plugin layer, but not every provider can enforce every option natively.

## 13. Next Likely Work

1. Persist setup wizard changes into OpenClaw config files.
2. Add a checked-in benchmark harness.
3. Improve source-quality tuning for Tavily and Perplexity on official-docs-heavy queries.
4. Decide whether the tool should eventually return structured JSON instead of formatted text.
