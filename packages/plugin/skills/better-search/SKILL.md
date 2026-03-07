---
name: better-search
description: "Use when searching the web, choosing a provider, or reasoning about search provider tradeoffs."
read_when:
  - The task needs current information from the web
  - You need to choose between search providers
  - You need to explain how Better Search should be configured
---

# Better Search

Better Search is an OpenClaw plugin that exposes a single web search tool with multiple provider backends behind it.

## Core rules

1. Prefer the configured provider if one is explicitly selected.
2. If the provider is `auto`, use the first available provider by priority.
3. Assume the built-in `web_search` tool is denied and `better_search` is the canonical web-search surface.
4. Preserve normalized output so callers do not need provider-specific parsing.

## Current scaffold

The repository is currently in the scaffolding/spec phase. Provider modules and CLI wiring exist, but provider execution is not implemented yet. Use [`docs/SPEC.md`](../../../../docs/SPEC.md) as the source of truth for architecture.
