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
    -> resolve configured or auto-detected provider
    -> execute provider request
    -> normalize provider response
    -> format response text for the agent
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
  count: 5,
  freshness: "pd | pw | pm | py | YYYY-MM-DDtoYYYY-MM-DD",
  country: "us",
  search_lang: "en",
  topic: "general | news | finance",
  include_domains: ["example.com"],
  exclude_domains: ["example.com"]
}
```

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

### 6.3 Provider-specific config

#### Brave

```json5
{
  brave: {
    apiKey: "..."
  }
}
```

#### Exa

```json5
{
  exa: {
    apiKey: "...",
    type: "auto" // neural | fast | auto | deep | deep-reasoning | instant
  }
}
```

#### Tavily

```json5
{
  tavily: {
    apiKey: "...",
    searchDepth: "advanced", // basic | advanced | fast | ultra-fast
    includeAnswer: true,     // true | false | basic | advanced
    autoParameters: true
  }
}
```

#### Perplexity

```json5
{
  perplexity: {
    apiKey: "...",
    baseUrl: "https://api.perplexity.ai",
    model: "sonar-pro"
  }
}
```

#### Parallel

```json5
{
  parallel: {
    apiKey: "...",
    mode: "fast", // fast | standard
    maxCharsPerResult: 1500
  }
}
```

#### Gemini

```json5
{
  gemini: {
    apiKey: "...",
    model: "gemini-2.5-flash"
  }
}
```

#### OpenAI

```json5
{
  openai: {
    apiKey: "...",
    apiMode: "auto", // auto | responses | chat_completions_search
    model: "gpt-5-mini",
    chatCompletionsModel: "gpt-5-search-api",
    reasoningEffort: "low", // low | medium | high
    searchContextSize: "medium", // low | medium | high
    includeSources: true,
    externalWebAccess: true
  }
}
```

#### Anthropic

```json5
{
  anthropic: {
    apiKey: "...",
    model: "claude-sonnet-4-6",
    toolVersion: "web_search_20260209", // web_search_20250305 | web_search_20260209
    maxUses: 5,
    directOnly: true
  }
}
```

## 7. Provider Implementation Notes

### 7.1 Brave

- Endpoint: `GET https://api.search.brave.com/res/v1/web/search`
- Native controls:
  - `count`
  - `freshness`
  - `country`
  - `search_lang`
- Domain filters are implemented by query rewriting with `site:` and `-site:`

### 7.2 Exa

- Endpoint: `POST https://api.exa.ai/search`
- Native controls:
  - `type`
  - `numResults`
  - `category`
  - `startPublishedDate` / `endPublishedDate`
  - `includeDomains` / `excludeDomains`

### 7.3 Tavily

- Endpoint: `POST https://api.tavily.com/search`
- Current defaults:
  - `searchDepth: "advanced"`
  - `includeAnswer: true`
  - `autoParameters: true`
- Native controls:
  - `topic`
  - `time_range` or explicit dates
  - `include_domains` / `exclude_domains`
  - `country`

### 7.4 Perplexity

- Endpoint: `POST {baseUrl}/chat/completions`
- Native controls:
  - recency filters
  - domain filter / exclude-domain mode
- Can run directly against Perplexity or through OpenRouter fallback

### 7.5 Parallel

- Endpoint: `POST https://api.parallel.ai/v1beta/search`
- Required beta header:
  - `parallel-beta: search-extract-2025-10-10`
- Native controls:
  - `mode`
  - `source_policy.include_domains`
  - `source_policy.exclude_domains`
  - `source_policy.after_date`
  - `excerpts.max_chars_per_result`

### 7.6 Gemini

- Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- Tooling:
  - `tools: [{ google_search: {} }]`
- Native shared filters are limited
- Shared options are mostly passed as prompt guidance
- Citations currently come back as Google grounding redirect URLs

### 7.7 OpenAI

- Primary endpoints:
  - `POST /v1/chat/completions` with `gpt-5-search-api`
  - `POST /v1/responses` with `tools: [{ type: "web_search" }]`
- Default mode is adaptive:
  - use Chat Completions search model for ordinary search requests
  - switch to Responses API when native controls are needed, currently:
    - `includeDomains`
    - `excludeDomains`
    - `country`
- Current defaults:
  - `apiMode: "auto"`
  - `model: "gpt-5-mini"`
  - `chatCompletionsModel: "gpt-5-search-api"`
  - `reasoningEffort: "low"`
  - `searchContextSize: "medium"`
- Native controls on Responses path:
  - `filters.allowed_domains`
  - `filters.blocked_domains`
  - `user_location.country`
  - `include: ["web_search_call.action.sources"]`

### 7.8 Anthropic

- Endpoint: `POST https://api.anthropic.com/v1/messages`
- Tooling:
  - `web_search_20250305`
  - `web_search_20260209`
- Current defaults:
  - `toolVersion: "web_search_20260209"`
  - `maxUses: 5`
  - `directOnly: true`
- When `directOnly` is enabled on `web_search_20260209`, Better Search sends:
  - `allowed_callers: ["direct"]`
- Better Search also handles `pause_turn` responses by issuing the required follow-up request

## 8. Shared Option Capability Matrix

| Provider | Freshness | Country | Search Lang | Topic | Allow list | Deny list |
|---|---|---|---|---|---|---|
| `brave` | Native | Native | Native | Prompt only | Query rewrite | Query rewrite |
| `exa` | Native | Prompt only | Prompt only | Native | Native | Native |
| `tavily` | Native | Native | Prompt only | Native | Native | Native |
| `perplexity` | Native | Prompt only | Prompt only | Prompt only | Native | Native |
| `parallel` | Native | Prompt only | Prompt only | Prompt only | Native | Native |
| `gemini` | Prompt only | Prompt only | Prompt only | Prompt only | Prompt only | Prompt only |
| `openai` | Prompt only | Native on Responses | Prompt only | Prompt only | Native on Responses | Native on Responses |
| `anthropic` | Prompt only | Native | Prompt only | Prompt only | Native | Native |

`Prompt only` means Better Search injects guidance into the query or prompt because the provider does not expose a matching structured control in the implemented API path.

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
- `setup` lets the user choose a default provider, shows detected providers, optionally captures a provider API key, and writes the result into `~/.openclaw/openclaw.json`
- `setup` ensures:
  - `plugins.allow` contains `better-search`
  - `plugins.load.paths` contains the current plugin path
  - `plugins.entries["better-search"].enabled = true`
  - `plugins.entries["better-search"].config.provider` is set
  - `tools.deny` includes `web_search` when requested

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
