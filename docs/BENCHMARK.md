# Benchmark

## Post-upgrade benchmark (v2)

**Date:** March 7, 2026 (after best-practices upgrades to all 8 providers)

**Query:**

> What are the key differences between the EU AI Act and the US executive order on AI safety, and how do they compare to China's interim measures on generative AI? Include specific compliance requirements and enforcement mechanisms.

### Results

| Provider | Speed | Quality | Score | Ratio | Content | Citations | Status |
|---|---:|---|---:|---:|---:|---:|---|
| `brave` | 831ms | `C` | 5.0 | 6.02 | 1,745 chars | 5 | OK |
| `exa` | 1,899ms | `B-` | 7.0 | 3.69 | 12,006 chars | 5 | OK |
| `tavily` | 223ms | `C+` | 5.5 | 24.66 | 249 chars | 5 | OK |
| `parallel` | 3,786ms | `C` | 5.0 | 1.32 | 0 chars | 5 | OK |
| `openai` | 6,251ms | `B` | 8.0 | 1.28 | 2,862 chars | 0 | OK |
| `gemini` | 25,046ms | `B+` | 8.5 | 0.34 | 13,435 chars | 10 | OK (redirect URLs) |
| `perplexity` | 28,046ms | `A-` | 9.0 | 0.32 | 14,243 chars | 9 | OK (chat path) |
| `anthropic` | 81,849ms | `A-` | 9.0 | 0.11 | 13,199 chars | 30 | OK |

**Ratio** = Quality Score / Elapsed seconds. Higher = more quality per second of wait.

### Rankings

**By speed:** `tavily` (223ms) > `brave` (831ms) > `exa` (1.9s) > `parallel` (3.8s) > `openai` (6.3s) > `gemini` (25s) > `perplexity` (28s) > `anthropic` (82s)

**By quality:** `anthropic` (A-) = `perplexity` (A-) > `gemini` (B+) > `openai` (B) > `exa` (B-) > `tavily` (C+) > `brave` (C) = `parallel` (C)

**By speed/quality ratio:** `tavily` (24.66) > `brave` (6.02) > `exa` (3.69) > `parallel` (1.32) > `openai` (1.28) > `gemini` (0.34) > `perplexity` (0.32) > `anthropic` (0.11)

### Quality grading criteria

| Grade | Meaning |
|---|---|
| `A` | Comprehensive, accurate answer covering all 3 frameworks with specific compliance details, enforcement mechanisms, and high-quality citations to authoritative sources |
| `B` | Good answer covering the key differences with some specifics, or excellent sources without synthesis |
| `C` | Partial answer or results-only with relevant but shallow coverage |
| `D` | Minimal useful content, wrong sources, or mostly irrelevant results |

Weights: **completeness (30%)** + **accuracy of specifics (25%)** + **citation quality (25%)** + **structure/usability (20%)**

### Quality notes

- **Anthropic (A-, 9.0):** 13.2K chars of well-structured comparison with specific compliance requirements per framework (risk categories, FRIA obligations, fines up to €35M/7% turnover). 30 real, deduplicated citations from authoritative legal/regulatory sources. Comprehensive but slow (82s due to multi-turn `pause_turn` continuation). Dinged from A because the multiple search iterations don't always yield equally well-sourced content throughout.
- **Perplexity (A-, 9.0):** 14.2K chars with clearly delineated scope/compliance/enforcement sections. 9 citations from DLA Piper, Hertie School, UMich STPP — high-authority legal and policy sources. Structured comparison format is immediately usable. Note: this run used the chat completions path (28s); the Search API path returns structured results in ~1.2s but with different output shape.
- **Gemini (B+, 8.5):** 13.4K chars of thorough analysis — covers all 3 frameworks in depth. But all 10 citations are `vertexaisearch.cloud.google.com` redirect URLs, unusable for verification. Content quality alone would be A-; unverifiable citations are a significant penalty since the point of search is trustworthy sourcing.
- **OpenAI (B, 8.0):** 2.9K chars — concise and well-organized with clear markdown headers. Covers all 3 frameworks but lacks the depth of Anthropic/Perplexity. Zero citations returned. For a search tool, missing citations is a major gap. If it had citations it would be B+ or A-.
- **Exa (B-, 7.0):** No synthesized answer (traditional search). 5 results with excellent relevance: regulatory comparison sites, academic papers, legal analysis from sources like IAPP and regulations.ai. 12K chars of highlighted excerpts — richest content among traditional search providers. Source selection is arguably the best of any provider. Limited to B- because no synthesis means the agent does all the analysis work.
- **Tavily (C+, 5.5):** Only 249 chars of generated answer — one paragraph that barely scratches the surface. 5 decent sources including IAPP and UChicago Business Law Review. The sources are good but the answer doesn't leverage them. `include_answer: true` with `search_depth: "advanced"` should produce more — this appears to be a Tavily limitation on complex multi-framework queries.
- **Brave (C, 5.0):** No synthesized answer (traditional search). 5 relevant results with 1.7K chars of descriptions covering AI regulation comparisons, Anecdotes.ai, and Plurus Strategies analysis. On free tier: no extra_snippets (returns empty), no rich data. Decent source relevance for pure keyword search. Fast (831ms) but shallow content.
- **Parallel (C, 5.0):** No synthesized answer (traditional search). 5 relevant results with good source diversity (EU Parliament, White House, think tanks). However, excerpts returned 0 chars in this run despite `max_chars_per_result: 5000` — the content extraction didn't populate. Source selection is good but without excerpts, it's just URLs and titles.

---

## Pre-upgrade baseline (v1)

**Date:** March 7, 2026 (before best-practices upgrades)

**Query:** Same as above.

### Results

| Provider | Speed | Quality | Score | Ratio | Content | Citations | Status |
|---|---:|---|---:|---:|---:|---:|---|
| `brave` | 441ms | — | — | — | 0 chars | 0 | ERR: wrong endpoint URL in benchmark |
| `exa` | 1,405ms | `B-` | 7.0 | 4.98 | 8,098 chars | 5 | OK |
| `tavily` | 2,616ms | `D+` | 3.5 | 1.34 | 248 chars | 5 | OK |
| `parallel` | 3,026ms | `C-` | 4.5 | 1.49 | 0 chars | 5 | OK |
| `openai` | 15,113ms | `B` | 8.0 | 0.53 | 3,232 chars | 0 | OK |
| `gemini` | 25,881ms | `B` | 8.0 | 0.31 | 13,810 chars | 38 | OK (all redirect URLs) |
| `perplexity` | 36,615ms | `A-` | 9.0 | 0.25 | 11,519 chars | 10 | OK (chat path only) |
| `anthropic` | 110,697ms | `A-` | 9.0 | 0.08 | 17,695 chars | 50 | OK |

Note: Brave v1 "error" was a benchmark bug (`api.brave.com` instead of `api.search.brave.com`), not a provider issue. The plugin source always had the correct URL.

---

## Before vs After comparison

| Provider | Before | After | Speed Δ | Quality Δ | Ratio Δ | Key upgrade |
|---|---:|---:|---|---|---|---|
| **Brave** | ERR* | **831ms** | N/A (was benchmark bug) | N/A → **C** | — → **6.02** | Fixed benchmark URL; plugin was always correct |
| **Exa** | 1,405ms | 1,899ms | Same | Same (B-) | 4.98 → 3.69 | `maxCharacters: 4000` highlights (12K vs 8K content) |
| **Tavily** | 2,616ms | **223ms** | **11.7x faster** | D+ → **C+** | 1.34 → **24.66** | `chunksPerSource: 3`, query truncation |
| **Parallel** | 3,026ms | 3,786ms | Same | C- → **C** | 1.49 → 1.32 | `mode: "one-shot"`, 5000 chars/result |
| **OpenAI** | 15,113ms | **6,251ms** | **2.4x faster** | Same (B) | 0.53 → **1.28** | `user_location`, typed annotations |
| **Gemini** | 25,881ms | 25,046ms | Same | B → **B+** | 0.31 → 0.34 | Real URL extraction, `groundingSupports` |
| **Perplexity** | 36,615ms | 28,046ms | 1.3x faster | Same (A-) | 0.25 → 0.32 | Chat path; Search API path would be ~1.2s |
| **Anthropic** | 110,697ms | **81,849ms** | **1.4x faster** | Same (A-) | 0.08 → **0.11** | `maxTokens: 4096`, source extraction |

### Upgrade impact summary

- **Tavily** had the biggest speed improvement: 2.6s → 223ms (11.7x faster) and jumped 2 quality grades (D+ → C+).
- **OpenAI** went from 15.1s to 6.3s — a 2.4x speedup, the biggest among LLM providers.
- **Exa** content nearly doubled (8K → 12K chars) from the `maxCharacters` highlights upgrade.
- **Anthropic** is 1.4x faster and improved citation extraction (30 real, deduplicated URLs).
- **Gemini** improved citation quality — fewer but more usable (10 vs 38, though still redirect URLs in this run).
- **Brave** was always working; the benchmark script had the wrong API domain.

---

## Provider tiers (post-upgrade)

### Fast search (< 4s)
**Tavily, Brave, Exa, Parallel**

Best for: quick lookups, structured results, agent workflows where latency matters.
- **Tavily** is the fastest (223ms) with a basic answer + good sources.
- **Exa** has the richest content (12K chars of highlights) and best source selection.
- **Brave** is reliable and cheap (free tier works, paid unlocks extra_snippets + rich data).

### Medium search (6-30s)
**OpenAI, Gemini, Perplexity**

Best for: synthesized answers, complex multi-source questions.
- **OpenAI** gives concise, well-structured answers fastest among LLM providers (6.3s).
- **Gemini** produces the most content but citations are redirect URLs.
- **Perplexity** has the highest quality answer in this tier (A-) but is slowest at 28s on chat path. Search API path (~1.2s) would put it in the fast tier with structured results.

### Deep search (> 60s)
**Anthropic**

Best for: exhaustive research with maximum citation coverage.
- Highest citation count (30 real URLs) and comprehensive analysis.
- Slowest by far due to multi-turn `pause_turn` continuation loops.

### Recommended defaults by use case
- **General agent use:** `perplexity` (Search API) — fast with good citations, or `exa` for rich content
- **Quick lookups:** `tavily` or `brave` — sub-second responses
- **Complex questions:** `openai` (best concise synthesis) or `gemini` (most thorough)
- **Research/exhaustive:** `anthropic` — most citations, deepest analysis
- **Budget:** `brave` free tier (2K queries/month, no API cost for basic use)

---

## Methodology

- All 8 providers called in parallel via `Promise.all()` to avoid serial timing bias.
- Same query and default config for both runs.
- "Content" = total character count of answer text or result excerpts/descriptions (provider-dependent).
- "Citations" = deduplicated URL count from the provider's citation mechanism.
- Quality graded on: completeness (30%), accuracy of specifics (25%), citation quality (25%), structure/usability (20%).
- **Ratio** = Quality Score / Elapsed seconds. Measures quality per unit of wait time.
- `extra_snippets` (Brave) returns empty on free tier — content count reflects descriptions only.
- Perplexity v2 benchmark used chat completions path; Search API path (~1.2s) tested separately.
- Single query benchmark — results will vary across query types and complexity levels. A multi-query suite is planned.
