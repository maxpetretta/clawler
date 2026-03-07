---
name: better-search
description: "Use when you need current web information through the Better Search plugin."
read_when:
  - You are asked to look something up online
  - You need to reason about which search provider to use
  - You need to explain Better Search configuration or setup
---

# Better Search Skill

Better Search is the project-wide web search surface for OpenClaw.

## Behavior

1. Treat `better_search` as the preferred web-search tool.
2. Use provider-neutral language in prompts and documentation.
3. When provider behavior differs, surface the tradeoff clearly: structured search results vs synthesized answer with citations.
4. Favor the architecture and provider model defined in [`docs/SPEC.md`](../../../docs/SPEC.md).

## Notes

- Better Search is implemented as an OpenClaw plugin tool with shared request options across providers.
- CLI setup/status flows are present under `packages/plugin/src/cli`.
- See [`docs/SPEC.md`](../../../docs/SPEC.md) for the current provider matrix, config surface, and known tradeoffs.
