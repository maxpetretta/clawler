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

1. Install the local plugin:
   - `openclaw plugins install -l /Users/max/dev/better-search/packages/plugin`
2. Run the setup wizard:
   - `openclaw better-search setup`
3. During setup:
   - choose a default provider
   - optionally save that provider's API key into OpenClaw config
   - allow the wizard to add `web_search` to `tools.deny`
4. Verify the installation:
   - `openclaw better-search status`
   - `openclaw plugins info better-search`

The setup flow installs both:
- the Better Search plugin config in `~/.openclaw/openclaw.json`
- the Better Search skill into OpenClaw's managed `skills/better-search` directory

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
