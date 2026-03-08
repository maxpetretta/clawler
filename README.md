# Clawler

> Better web search for your Claw.

🔎 A web search plugin for OpenClaw. Clawler replaces the builtin `web_search` path with a provider-agnostic tool that can route across traditional search APIs and model-native search backends through one consistent interface.

## Install

```bash
openclaw plugin add clawler
openclaw clawler setup
```

`setup` selects a default provider, checks which credentials are available, optionally writes managed config into `~/.openclaw/openclaw.json`, and can deny the builtin `web_search` tool so your agent uses `search_web` instead.

## How It Works

```
Agent calls `search_web(query, options)`
                      ↓
            Provider resolver chooses explicit, configured, or auto-detected provider
                      ↓
            Provider executes web search with shared filters and provider-specific settings
                      ↓
            If the request errors and fallback is configured, try the next provider
                      ↓
            Normalize answer, results, snippets, and citations into one response format
                      ↓
            Cache the successful result and return formatted output to the agent
```

Clawler keeps the surface area small: one tool, shared search options, and a provider registry that hides API differences behind a single response shape.

### Providers

| Provider | Type |
|---|---|
| `anthropic` | AI-native web search with cited answers |
| `brave` | Traditional search index |
| `exa` | Neural search and page discovery |
| `gemini` | Google-grounded AI search |
| `openai` | Responses/chat web search |
| `parallel` | Search and extraction API |
| `perplexity` | Real-time answer-native search |
| `tavily` | Research-oriented hybrid search |

### Shared search features

Clawler applies one shared option model across providers where possible:

- **`provider`** — per-call provider override
- **`count`** — maximum results to return
- **`freshness`** — recency filters or date ranges
- **`country`** — region targeting
- **`search_lang`** — result language preference
- **`topic`** — domain/category hint
- **`include_domains` / `exclude_domains`** — domain allow/deny lists

### Fallback chain

When the primary provider fails because of timeout, API error, rate limiting, or missing credentials, Clawler can retry providers from an ordered fallback list.

```json
{
  "clawler": {
    "provider": "auto",
    "fallback": ["perplexity", "brave"]
  }
}
```

Fallback only triggers on errors. Empty results are treated as a valid response.

## CLI Reference

```bash
openclaw clawler setup          # interactive setup wizard
openclaw clawler status         # list provider credential status

openclaw plugin add clawler     # install the plugin into OpenClaw
```

The default tool name is `search_web`.

## Packages

| Package | Description |
|---|---|
| [`clawler`](packages/plugin) | OpenClaw plugin package (npm) |
| [`@clawler/skill`](packages/skill) | Agent skill package (ClawHub) |
| [`@clawler/website`](packages/website) | Landing page and docs site |

## Architecture

See [`docs/SPEC.md`](docs/SPEC.md) for the full plugin design, provider config schema, fallback behavior, and normalization rules.

## Benchmarks

See [`docs/BENCHMARK.md`](docs/BENCHMARK.md) for the latest provider comparison runs, response quality notes, and performance tradeoffs.

## Releasing

Run the local preflight before publishing:

```bash
bun run release:preflight
```

GitHub release publishing is automated via `.github/workflows/release.yml`.

## License

MIT
