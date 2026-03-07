# Benchmark

## Post-upgrade benchmark (v2)

**Date:** March 7, 2026 (after best-practices upgrades to all 8 providers)

**Query:**

> What are the key differences between the EU AI Act and the US executive order on AI safety, and how do they compare to China's interim measures on generative AI? Include specific compliance requirements and enforcement mechanisms.

### Results

| Provider | Elapsed | Content | Citations | Status |
|---|---:|---:|---:|---|
| `perplexity` | 1,150ms | 0 chars | 5 | OK (Search API) |
| `exa` | 1,349ms | 15,396 chars | 5 | OK |
| `parallel` | 1,867ms | 0 chars | 5 | OK |
| `tavily` | 2,311ms | 219 chars | 5 | OK |
| `openai` | 10,440ms | 3,532 chars | 0 | OK |
| `gemini` | 21,427ms | 17,280 chars | 10 | OK |
| `anthropic` | 86,554ms | 14,247 chars | 65 | OK |
| `brave` | 465ms | 0 chars | 0 | ERR: rate limit (HTML response) |

### Speed ranking

`perplexity` (1.2s) > `exa` (1.3s) > `parallel` (1.9s) > `tavily` (2.3s) > `openai` (10.4s) > `gemini` (21.4s) > `anthropic` (86.6s)

---

## Pre-upgrade baseline (v1)

**Date:** March 7, 2026 (before best-practices upgrades)

**Query:** Same as above.

### Results

| Provider | Elapsed | Content | Citations | Status |
|---|---:|---:|---:|---|
| `brave` | 441ms | 0 chars | 0 | ERR: HTML response |
| `exa` | 1,405ms | 8,098 chars | 5 | OK |
| `tavily` | 2,616ms | 248 chars | 5 | OK |
| `parallel` | 3,026ms | 0 chars | 5 | OK |
| `openai` | 15,113ms | 3,232 chars | 0 | OK |
| `gemini` | 25,881ms | 13,810 chars | 38 | OK (redirect URLs) |
| `perplexity` | 36,615ms | 11,519 chars | 10 | OK |
| `anthropic` | 110,697ms | 17,695 chars | 50 | OK |

---

## Before vs After comparison

| Provider | Before | After | Speed Δ | Content Δ | Key upgrade |
|---|---:|---:|---|---|---|
| **Perplexity** | 36,615ms | 1,150ms | **30x faster** | 11.5K → 0* | Switched to Search API (`apiMode: "search"`) |
| **Exa** | 1,405ms | 1,349ms | Same | 8K → **15.4K** | `maxCharacters: 4000` highlights |
| **Parallel** | 3,026ms | 1,867ms | **1.6x faster** | Same | `mode: "one-shot"`, `maxCharsPerResult: 5000` |
| **Tavily** | 2,616ms | 2,311ms | Slight | Same | `chunksPerSource: 3`, query truncation |
| **OpenAI** | 15,113ms | 10,440ms | **1.5x faster** | Similar | `user_location`, typed annotations |
| **Gemini** | 25,881ms | 21,427ms | Slight | 13.8K → **17.3K** | Real URL extraction, `groundingSupports` |
| **Anthropic** | 110,697ms | 86,554ms | **22% faster** | 17.7K → 14.2K | 50 → **65 citations**, `maxTokens: 4096` |
| **Brave** | 441ms | 465ms | Same | ERR | Rate limited (free tier: 1 req/sec) |

\* Perplexity Search API returns citations + structured results instead of a long answer string. Content is in the `results[]` array, not `answer`.

---

## Takeaways

### Biggest wins
- **Perplexity** went from the slowest (36.6s) to the fastest (1.2s) — a 30x improvement from switching to the dedicated Search API.
- **Exa** nearly doubled content output (8K → 15.4K chars) from the `maxCharacters` highlights upgrade.
- **Anthropic** citation count jumped from 50 to 65 (better source extraction from `web_search_tool_result` blocks).

### Provider tiers (post-upgrade)

**Fast search (< 3s):** Perplexity, Exa, Parallel, Tavily
- Best for: quick lookups, structured results, agent workflows where latency matters.
- Perplexity and Exa are the standouts — Perplexity for speed + citations, Exa for content volume.

**Medium search (10-25s):** OpenAI, Gemini
- Best for: synthesized answers, complex multi-source questions.
- OpenAI gives concise answers; Gemini produces the most content (17K chars).

**Deep search (> 60s):** Anthropic
- Best for: exhaustive research with maximum citation coverage (65 citations).
- Slowest by far due to multi-turn `pause_turn` continuation loops.

### Known issues
- **Brave** fails on free tier when rate limited (returns HTML instead of JSON). `extra_snippets` and rich data require paid Search plan.
- **Perplexity** Search API returns 0 answer chars because content is structured differently — results are in the `results[]` array rather than as synthesized text.
- **Gemini** citation count dropped from 38 to 10 — but the 10 are real URLs vs 38 Google redirect URLs. Net improvement in quality.

### Recommended defaults
- **General use:** `perplexity` (fastest, good citations) or `exa` (richest content)
- **Complex questions:** `openai` (best concise synthesis) or `gemini` (most thorough)
- **Research/exhaustive:** `anthropic` (most citations, deepest search)
- **Budget:** `brave` on paid plan (cheapest per query, structured results)

---

## Methodology

- All providers called in parallel via `Promise.all()` to avoid serial timing bias.
- Same query and default config for both runs.
- "Content" = total character count of answer text or result excerpts (provider-dependent).
- "Citations" = deduplicated URL count from the provider's citation mechanism.
- Single query benchmark — results may vary across query types. A multi-query suite is planned.
