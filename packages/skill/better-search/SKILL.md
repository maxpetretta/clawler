---
name: better-search
description: "Use when you need current web information through the Better Search plugin."
read_when:
  - You are asked to look something up online
  - You need to reason about which search provider to use
  - You need to explain Better Search configuration or setup
---

# Better Search Skill

Better Search is the canonical web-search surface for this project. Prefer it over OpenClaw's built-in `web_search` tool when the plugin is installed.

## Setup

If Better Search is available in the current OpenClaw environment:

1. Run the setup flow if the plugin CLI is available:
   - `openclaw better-search setup`
2. Choose a default provider and configure credentials.
3. Allow the setup flow to deny the built-in `web_search` tool when you want Better Search to be the canonical search surface.
4. Verify availability:
   - `openclaw better-search status`

If the setup CLI is not available, make sure OpenClaw is configured so:

- the Better Search plugin is installed and enabled
- a default provider is selected
- the provider API key is available through plugin config or environment variables
- `tools.deny` includes `web_search` when you want to force use of `better_search`

## Tool

The default tool name is `better_search`.

Use it with:

```json
{
  "query": "latest OpenAI web search docs",
  "count": 5,
  "freshness": "pm",
  "country": "us",
  "search_lang": "en",
  "topic": "general",
  "include_domains": ["developers.openai.com"],
  "exclude_domains": ["example.com"]
}
```

Supported parameters:

- `query`: required search string
- `count`: max number of results to request
- `freshness`: relative or explicit date filter such as `pd`, `pw`, `pm`, `py`, or `YYYY-MM-DDtoYYYY-MM-DD`
- `country`: country hint such as `us`
- `search_lang`: language hint such as `en`
- `topic`: provider-level topical hint such as `general`, `news`, or `finance`
- `include_domains`: allow-list domains
- `exclude_domains`: deny-list domains

## Usage Rules

1. Treat `better_search` as the preferred search tool.
2. Use provider-neutral instructions unless the user explicitly wants a provider comparison or a specific backend.
3. For technical or doc-heavy queries, use domain allow-lists when official sources matter.
4. If the query needs a synthesized answer with citations, prefer answer-native providers such as OpenAI, Anthropic, Gemini, Tavily, or Perplexity.
5. If the query mainly needs fast retrieval of links, traditional search providers such as Exa, Brave, or Parallel can be enough.

## Provider Notes

- `auto` picks the first available configured provider.
- API keys can come from plugin config or environment variables.
- Shared filters are applied at the plugin level and translated per provider when native support exists.
- Some providers enforce domain filters natively; others treat them as best-effort guidance.
