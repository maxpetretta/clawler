# Benchmark

## Post-upgrade benchmark (final)

**Date:** March 7, 2026 (after best-practices upgrades to all 8 providers)

**Query:**

> What are the key differences between the EU AI Act and the US executive order on AI safety, and how do they compare to China's interim measures on generative AI? Include specific compliance requirements and enforcement mechanisms.

### Results

| Provider | Speed | Quality | Score | Ratio | Content | Citations |
|---|---:|---|---:|---:|---:|---:|
| `tavily` | 170ms | `B-` | 7.0 | 41.18 | 6,476 chars | 5 |
| `exa` | 230ms | `B` | 8.0 | 34.78 | 19,161 chars | 5 |
| `brave` | 389ms | `C` | 5.0 | 12.85 | 1,745 chars | 5 |
| `perplexity` | 505ms | `A-` | 9.0 | 17.82 | 54,419 chars | 5 |
| `parallel` | 2,046ms | `B` | 8.0 | 3.91 | 23,133 chars | 5 |
| `openai` | 13,139ms | `A` | 10.0 | 0.76 | 10,375 chars | 28 (+98 sources) |
| `gemini` | 24,743ms | `B+` | 8.5 | 0.34 | 12,256 chars | 5 (redirect URLs) |
| `anthropic` | 84,873ms | `A-` | 9.0 | 0.11 | 13,471 chars | 30 |

**Ratio** = Quality Score / Elapsed seconds. Higher = more quality per second of wait.

### Rankings

**By speed:** `tavily` (170ms) > `exa` (230ms) > `brave` (389ms) > `perplexity` (505ms) > `parallel` (2.0s) > `openai` (13.1s) > `gemini` (24.7s) > `anthropic` (84.9s)

**By quality:** `openai` (A) > `anthropic` (A-) = `perplexity` (A-) > `gemini` (B+) > `exa` (B) = `parallel` (B) > `tavily` (B-) > `brave` (C)

**By speed/quality ratio:** `tavily` (41.18) > `exa` (34.78) > `perplexity` (17.82) > `brave` (12.85) > `parallel` (3.91) > `openai` (0.76) > `gemini` (0.34) > `anthropic` (0.11)

### Quality grading criteria

| Grade | Meaning |
|---|---|
| `A` | Comprehensive, accurate answer covering all 3 frameworks with specific compliance details, enforcement mechanisms, and high-quality citations to authoritative sources |
| `B` | Good answer covering the key differences with some specifics, or excellent sources without synthesis |
| `C` | Partial answer or results-only with relevant but shallow coverage |
| `D` | Minimal useful content, wrong sources, or mostly irrelevant results |

Weights: **completeness (30%)** + **accuracy of specifics (25%)** + **citation quality (25%)** + **structure/usability (20%)**

### Quality notes

- **OpenAI (A, 10.0):** 10.4K chars with `tool_choice: { type: "web_search" }` forcing search. 28 inline url_citation annotations with title, URL, and character offsets + 98 background sources via `include: ["web_search_call.action.sources"]`. Well-structured markdown with clear framework headers. Most citations of any provider when including sources. **Note:** without `tool_choice`, gpt-4o may answer complex queries from training data and skip search entirely, returning 0 citations.
- **Perplexity (A-, 9.0):** 54.4K chars of rich snippet content from 5 results via the Search API (`/search` endpoint). Each result includes 5K-11K chars of page content. 5 citations to authoritative sources (EU Parliament, IAPP, regulatory comparison sites). Best content volume of any provider by far. The Chat Completions path (`/chat/completions`) returns a synthesized 14K-char answer with 8-10 citations but takes 28-37s instead of 505ms.
- **Anthropic (A-, 9.0):** 13.5K chars of well-structured comparison with specific compliance requirements per framework (risk categories, FRIA obligations, fines up to €35M/7% turnover). 30 real, deduplicated citations from authoritative legal/regulatory sources. Comprehensive but slow (85s due to multi-turn `pause_turn` continuation). Most real citations of any LLM provider.
- **Gemini (B+, 8.5):** 12.3K chars of thorough analysis covering all 3 frameworks in depth. But all 5 citations are `vertexaisearch.cloud.google.com` redirect URLs — these return 404 when fetched directly and only resolve in a browser with JavaScript. This is a Gemini API limitation, not a plugin bug. Content quality alone would be A-; unverifiable citations are a significant penalty.
- **Exa (B, 8.0):** No synthesized answer (traditional search). 19.2K chars of highlighted excerpts from 5 highly relevant sources — regulatory comparison sites, academic papers, legal analysis. Excellent source selection (regulations.ai, IAPP, programming-helper.com). Richest highlighted content among traditional search providers.
- **Parallel (B, 8.0):** No synthesized answer (traditional search). 23.1K chars of excerpts from 5 results. Good source diversity — EU Parliament, White House, think tanks, Plurus Strategies. Excerpts are extensive and well-extracted when using `excerpts.max_chars_per_result: 5000`. **Note:** the response uses `excerpts[]` (array), not `excerpt` (string) — callers must join the array.
- **Tavily (B-, 7.0):** 249 chars of generated answer + 6.2K chars of result content from 5 sources including IAPP and UChicago Business Law Review. The synthesized answer is thin, but `search_depth: "advanced"` with `chunks_per_source: 3` returns solid source content. Fastest provider at 170ms.
- **Brave (C, 5.0):** No synthesized answer (traditional search). 1.7K chars of descriptions from 5 relevant results. On free tier: `extra_snippets` returns empty, no rich data. Decent source relevance for pure keyword search. **Paid plan** would unlock up to 5 additional excerpt snippets per result and structured rich data (stocks, weather, sports).

---

## Pre-upgrade baseline (v1)

**Date:** March 7, 2026 (before best-practices upgrades)

**Query:** Same as above.

### Results

| Provider | Speed | Quality | Score | Ratio | Content | Citations |
|---|---:|---|---:|---:|---:|---:|
| `brave` | 441ms | — | — | — | 0 chars | 0 (benchmark URL bug) |
| `exa` | 1,405ms | `B-` | 7.0 | 4.98 | 8,098 chars | 5 |
| `tavily` | 2,616ms | `D+` | 3.5 | 1.34 | 248 chars | 5 |
| `parallel` | 3,026ms | `C-` | 4.5 | 1.49 | 0 chars | 5 |
| `openai` | 15,113ms | `B` | 8.0 | 0.53 | 3,232 chars | 0 (search not triggered) |
| `gemini` | 25,881ms | `B` | 8.0 | 0.31 | 13,810 chars | 38 (all redirect URLs) |
| `perplexity` | 36,615ms | `A-` | 9.0 | 0.25 | 11,519 chars | 10 |
| `anthropic` | 110,697ms | `A-` | 9.0 | 0.08 | 17,695 chars | 50 |

---

## Before vs After comparison

| Provider | Before | After | Speed Δ | Quality Δ | Ratio Δ | Key change |
|---|---:|---:|---|---|---|---|
| **Tavily** | 2,616ms | **170ms** | **15x faster** | D+ → **B-** | 1.34 → **41.18** | `chunksPerSource: 3`, include result content |
| **Exa** | 1,405ms | **230ms** | **6x faster** | B- → **B** | 4.98 → **34.78** | `maxCharacters: 4000` highlights |
| **Brave** | ERR* | 389ms | N/A | N/A → **C** | — → **12.85** | Fixed benchmark URL (plugin was always correct) |
| **Perplexity** | 36,615ms | **505ms** | **72x faster** | Same (A-) | 0.25 → **17.82** | Search API (`apiMode: "search"`) |
| **Parallel** | 3,026ms | 2,046ms | 1.5x faster | C- → **B** | 1.49 → **3.91** | `mode: "one-shot"`, `excerpts[]` array, 5K chars/result |
| **OpenAI** | 15,113ms | 13,139ms | Slight | B → **A** | 0.53 → **0.76** | `tool_choice`, `include: sources`, typed annotations |
| **Gemini** | 25,881ms | 24,743ms | Same | B → **B+** | 0.31 → 0.34 | `groundingSupports` extraction (citations still redirect) |
| **Anthropic** | 110,697ms | **84,873ms** | **1.3x faster** | Same (A-) | 0.08 → **0.11** | `maxTokens: 4096`, improved source extraction |

### Upgrade impact summary

- **Perplexity** had the largest speed improvement: 36.6s → 505ms (**72x faster**) by switching to the Search API. Also the richest content at 54K chars.
- **Tavily** went from 2.6s to 170ms (**15x faster**) and jumped from D+ to B- by including result content alongside the answer.
- **OpenAI** jumped from B to A by using `tool_choice: { type: "web_search" }` to ensure search triggers, plus `include: ["web_search_call.action.sources"]` for 98 background sources.
- **Parallel** went from C- to B — 23K chars of excerpts when reading the `excerpts[]` array correctly.
- **Exa** went from 1.4s to 230ms and content grew from 8K to 19K chars.

### Benchmark bug fixes
- **Brave:** v1 benchmark used `api.brave.com` instead of `api.search.brave.com`. Plugin source was always correct.
- **OpenAI:** v1 benchmark didn't use `tool_choice` or `include: sources`. Without `tool_choice`, gpt-4o skips search for complex queries it can answer from training data.
- **Parallel:** v1 benchmark read `excerpt` (string) instead of `excerpts` (array), getting 0 chars.
- **Perplexity:** v1 benchmark used chat completions path. Plugin defaults to Search API.

---

## Provider tiers (post-upgrade)

### Fast search (< 3s)
**Tavily, Exa, Brave, Perplexity, Parallel**

Best for: quick lookups, structured results, agent workflows where latency matters.
- **Perplexity** (505ms) has the richest content (54K chars) and best overall value.
- **Exa** (230ms) has excellent source selection and 19K chars of highlights.
- **Tavily** (170ms) is the fastest with decent answer + result content.
- **Parallel** (2.0s) provides 23K chars of well-extracted excerpts.
- **Brave** (389ms) is reliable and cheapest (free tier works).

### LLM search (10-85s)
**OpenAI, Gemini, Anthropic**

Best for: synthesized answers, complex multi-source questions, research.
- **OpenAI** (13s) gives the best synthesized answer with most citations (28 inline + 98 sources). Requires `tool_choice` for reliable search triggering.
- **Gemini** (25s) produces thorough analysis but citations are redirect URLs — a known API limitation.
- **Anthropic** (85s) provides exhaustive research with 30 real citations via multi-turn search. Slowest but most thorough.

### Recommended defaults by use case
- **Best overall:** `perplexity` — A- quality at 505ms with 54K chars of content
- **Fastest:** `tavily` (170ms) or `exa` (230ms)
- **Best synthesized answer:** `openai` with `tool_choice` — A quality, 28 citations
- **Best for research:** `anthropic` — most real citations, deepest analysis
- **Budget:** `brave` free tier (2K queries/month, no API cost)

---

## Known provider limitations

| Provider | Limitation | Impact | Workaround |
|---|---|---|---|
| **Gemini** | All citations are `vertexaisearch.cloud.google.com` redirect URLs | URLs return 404 when fetched; only resolve in browser JS | None — Gemini API limitation. Real URLs not available via REST API. |
| **OpenAI** | gpt-4o may skip search for complex queries answerable from training data | Returns 0 citations when search doesn't trigger | Use `tool_choice: { type: "web_search" }` to force search. Plugin should set this. |
| **Brave** | `extra_snippets` and rich data require paid Search plan | Free tier returns descriptions only (no extra excerpts) | Upgrade to paid plan ($5/month) for richer results |
| **Anthropic** | Multi-turn `pause_turn` adds 40-80s per query | Slowest provider by far | Reduce `maxUses` to limit search iterations |

---

## Methodology

- All 8 providers called in parallel via `Promise.all()` to avoid serial timing bias.
- Same query and default config for all providers.
- "Content" = total character count of answer text + result snippets/excerpts/descriptions (provider-dependent).
- "Citations" = deduplicated URL count. For OpenAI, inline `url_citation` annotations only (sources shown separately).
- Quality graded on: completeness (30%), accuracy of specifics (25%), citation quality (25%), structure/usability (20%).
- **Ratio** = Quality Score / Elapsed seconds. Measures quality per unit of wait time.
- OpenAI uses `tool_choice: { type: "web_search" }` to force search and `include: ["web_search_call.action.sources"]`.
- Perplexity uses the Search API (`/search`) not Chat Completions (`/chat/completions`).
- Single query benchmark — results will vary across query types. A multi-query suite is planned.
