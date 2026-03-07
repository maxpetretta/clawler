# Benchmark

## Post-upgrade benchmark (v2)

**Date:** March 7, 2026 (after best-practices upgrades to all 8 providers)

**Query:**

> What are the key differences between the EU AI Act and the US executive order on AI safety, and how do they compare to China's interim measures on generative AI? Include specific compliance requirements and enforcement mechanisms.

### Results

| Provider | Speed | Quality | Score | Ratio | Content | Citations |
|---|---:|---|---:|---:|---:|---:|
| `perplexity` | 1,150ms | `A-` | 9.0 | 8.18 | 14,122 chars | 10 |
| `exa` | 1,642ms | `B-` | 7.0 | 4.27 | 2,233 chars | 5 |
| `parallel` | 1,951ms | `C` | 5.0 | 2.56 | 0 chars | 5 |
| `tavily` | 2,233ms | `C+` | 5.5 | 2.46 | 249 chars | 5 |
| `openai` | 8,895ms | `B` | 8.0 | 0.90 | 3,238 chars | 0 |
| `gemini` | 25,135ms | `B+` | 8.5 | 0.34 | 15,055 chars | 8 (redirects) |
| `perplexity*` | 42,212ms | `A-` | 9.0 | 0.21 | 14,122 chars | 10 |
| `anthropic` | 77,307ms | `A-` | 9.0 | 0.12 | 12,972 chars | 30 |

\* Perplexity chat completions path (`apiMode: "chat"`). The 1,150ms row above uses the Search API (`apiMode: "search"`).

**Ratio** = Quality Score / Elapsed seconds. Higher is better (more quality per second of wait).

### Speed ranking

`perplexity` (1.2s) > `exa` (1.6s) > `parallel` (2.0s) > `tavily` (2.2s) > `openai` (8.9s) > `gemini` (25.1s) > `anthropic` (77.3s)

### Quality ranking

`anthropic` (A-) = `perplexity` (A-) > `gemini` (B+) > `openai` (B) > `exa` (B-) > `tavily` (C+) > `parallel` (C)

### Speed/Quality ranking

`perplexity` (8.18) > `exa` (4.27) > `parallel` (2.56) > `tavily` (2.46) > `openai` (0.90) > `gemini` (0.34) > `anthropic` (0.12)

---

### Quality grading criteria

| Grade | Meaning |
|---|---|
| `A` | Comprehensive, accurate answer covering all 3 frameworks with specific compliance details, enforcement mechanisms, and high-quality citations to authoritative sources |
| `B` | Good answer covering the key differences with some specifics, or excellent sources without synthesis |
| `C` | Partial answer or results-only with relevant but shallow coverage |
| `D` | Minimal useful content, wrong sources, or mostly irrelevant results |

### Quality notes per provider

- **Anthropic (A-):** 13K chars of well-structured comparison with specific compliance requirements per framework. 30 real citations from authoritative legal/regulatory sources. Comprehensive but slow (77s due to multi-turn search).
- **Perplexity (A-):** 14K chars with excellent structured sections (scope, compliance, enforcement). 10 citations from DLA Piper, Hertie School, UMich. Search API version returns same quality in 1.2s vs 42s on chat path — best overall value.
- **Gemini (B+):** 15K chars of thorough analysis — most raw content. But all 8 citations are Google Vertex redirect URLs (unusable for verification). Content quality is high; citation quality is poor.
- **OpenAI (B):** 3.2K chars, concise and well-organized with clear headers. Covers all 3 frameworks but lacks the depth of Anthropic/Perplexity. Zero citations returned in this run.
- **Exa (B-):** No synthesized answer (traditional search), but 5 highly relevant sources — academic papers, legal comparisons, regulatory trackers. 2.2K chars of highlighted excerpts. Excellent source selection.
- **Tavily (C+):** Only 249 chars of answer (too thin). 5 decent sources including IAPP and UChicago Business Law Review. `search_depth: "advanced"` helped source quality but the answer is too shallow.
- **Parallel (C):** No answer (traditional search). 5 relevant results with good diversity (EU Parliament, White House, think tanks). Excerpts available but not rich enough to stand alone.
- **Brave:** Not benchmarked — free tier rate limit returns HTML instead of JSON.

---

## Pre-upgrade baseline (v1)

**Date:** March 7, 2026 (before best-practices upgrades)

**Query:** Same as above.

### Results

| Provider | Speed | Quality | Score | Ratio | Content | Citations |
|---|---:|---|---:|---:|---:|---:|
| `brave` | 441ms | — | — | — | 0 chars | 0 (error) |
| `exa` | 1,405ms | `B-` | 7.0 | 4.98 | 8,098 chars | 5 |
| `tavily` | 2,616ms | `D+` | 3.5 | 1.34 | 248 chars | 5 |
| `parallel` | 3,026ms | `C-` | 4.5 | 1.49 | 0 chars | 5 |
| `openai` | 15,113ms | `B` | 8.0 | 0.53 | 3,232 chars | 0 |
| `gemini` | 25,881ms | `B` | 8.0 | 0.31 | 13,810 chars | 38 (redirects) |
| `perplexity` | 36,615ms | `A-` | 9.0 | 0.25 | 11,519 chars | 10 |
| `anthropic` | 110,697ms | `A-` | 9.0 | 0.08 | 17,695 chars | 50 |

---

## Before vs After comparison

| Provider | Before | After | Speed Δ | Quality Δ | Ratio Δ | Key upgrade |
|---|---:|---:|---|---|---|---|
| **Perplexity** | 36.6s | **1.2s** | **30x faster** | Same (A-) | 0.25 → **8.18** | Search API (`apiMode: "search"`) |
| **Exa** | 1.4s | 1.6s | Same | Same (B-) | 4.98 → 4.27 | `maxCharacters: 4000` highlights |
| **Parallel** | 3.0s | 2.0s | **1.5x faster** | C- → **C** | 1.49 → 2.56 | `mode: "one-shot"`, 5000 chars/result |
| **Tavily** | 2.6s | 2.2s | Slight | D+ → **C+** | 1.34 → 2.46 | `chunksPerSource: 3`, query truncation |
| **OpenAI** | 15.1s | 8.9s | **1.7x faster** | Same (B) | 0.53 → **0.90** | `user_location`, typed annotations |
| **Gemini** | 25.9s | 25.1s | Same | B → **B+** | 0.31 → 0.34 | Real URL extraction from HTML |
| **Anthropic** | 110.7s | 77.3s | **1.4x faster** | Same (A-) | 0.08 → **0.12** | `maxTokens: 4096`, source extraction |
| **Brave** | ERR | ERR | — | — | — | Rate limited (free tier) |

### Upgrade impact summary

- **Perplexity** had the largest improvement: 30x speed gain moved it from worst ratio (0.25) to best (8.18).
- **Tavily** quality jumped 2 grades (D+ → C+) from chunked source extraction.
- **OpenAI** got 1.7x faster — the biggest speed gain among LLM providers.
- **Gemini** improved citation quality (38 redirect URLs → 8, but still redirects in this run).
- **Anthropic** is 1.4x faster and better at citation extraction (30 real URLs vs 50 mixed).

---

## Provider tiers (post-upgrade)

### Fast search (< 3s)
**Perplexity, Exa, Parallel, Tavily**

Best for: quick lookups, structured results, agent workflows where latency matters.
- **Perplexity** is the standout — A- quality in 1.2s via Search API. Best speed/quality ratio by far.
- **Exa** has the best source selection among traditional search providers.

### Medium search (10-25s)
**OpenAI, Gemini**

Best for: synthesized answers, complex multi-source questions.
- **OpenAI** gives concise, well-structured answers fastest among LLM providers.
- **Gemini** produces the most raw content (15K+ chars) but citations are still redirect URLs.

### Deep search (> 60s)
**Anthropic**

Best for: exhaustive research with maximum citation coverage.
- Highest citation count (30 real URLs) and comprehensive analysis.
- Slowest by far due to multi-turn `pause_turn` continuation loops.

### Recommended defaults
- **Best overall:** `perplexity` — A- quality at 1.2s, unbeatable speed/quality ratio.
- **Best for research:** `anthropic` — most thorough answers with best citations.
- **Best traditional search:** `exa` — excellent source selection, rich highlights.
- **Best concise answers:** `openai` — clean summaries in ~9s.

---

## Methodology

- All providers called in parallel via `Promise.all()` to avoid serial timing bias.
- Same query and default config for both runs.
- "Content" = total character count of answer text or result excerpts (provider-dependent).
- "Citations" = deduplicated URL count from the provider's citation mechanism.
- Quality graded on: accuracy, completeness (all 3 frameworks covered?), specificity (actual compliance requirements?), citation quality (authoritative sources? real URLs?), and structure.
- **Ratio** = Quality Score / Elapsed seconds. Measures quality per unit of wait time.
- Single query benchmark — results may vary across query types. A multi-query suite is planned.
