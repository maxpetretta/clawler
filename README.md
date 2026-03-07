# Better Search

> Universal web search for OpenClaw.

`better-search` is an OpenClaw plugin workspace focused on one job: replace the built-in `web_search` path with a provider-agnostic search tool that can route to traditional search APIs and model-native web search backends.

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
| [`better-search`](packages/plugin) | OpenClaw plugin package |
| [`@better-search/skill`](packages/skill) | ClawHub skill package |
| [`@better-search/website`](packages/website) | Astro website |

## Status

The repository is currently a product scaffold plus architecture draft. The implementation target lives in [`docs/SPEC.md`](docs/SPEC.md).
