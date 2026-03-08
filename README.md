# Clawler

> Crawl the web. Fast.

`clawler` is an OpenClaw plugin workspace focused on one job: replace the built-in `web_search` path with a provider-agnostic search tool that can route to traditional search APIs and model-native web search backends.

This repository is intentionally scaffolded in the same shape as `reclaw`:

- `packages/plugin` — OpenClaw plugin package with the tool and Clack-backed CLI
- `packages/skill` — ClawHub skill package
- `packages/website` — Astro marketing/docs site

## Workspace

```bash
bun install
bun run web:dev
bun run lint
bun run smoke
```

## Packages

| Package | Description |
|---|---|
| [`clawler`](packages/plugin) | OpenClaw plugin package |
| [`@clawler/skill`](packages/skill) | ClawHub skill package |
| [`@clawler/website`](packages/website) | Astro website |

## Status

The plugin runtime is implemented and validated across all eight providers. Current behavior, config, and provider tradeoffs are documented in [`docs/SPEC.md`](docs/SPEC.md), and the latest comparison run is summarized in [`docs/BENCHMARK.md`](docs/BENCHMARK.md).
