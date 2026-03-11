# Benchmark

## Post-upgrade benchmark (final)

**Date:** March 7, 2026 (after best-practices upgrades to all 8 providers)

**Query:**

> What are the key differences between the EU AI Act and the US executive order on AI safety, and how do they compare to China's interim measures on generative AI? Include specific compliance requirements and enforcement mechanisms.

### Results

| Provider | Speed | Quality | Score | Ratio | Content | Citations |
|---|---:|---|---:|---:|---:|---:|
| `brave` | 389ms | `C` | 5.0 | 12.85 | 1,745 chars | 5 |
| `perplexity` | 505ms | `A-` | 9.0 | 17.82 | ~21,500 chars | 5 |
| `exa` | 1,507ms | `B` | 8.0 | 5.31 | 19,161 chars | 5 |
| `tavily` | ~1,800ms | `B-` | 7.0 | 3.89 | 6,476 chars | 5 |
| `parallel` | 2,046ms | `B` | 8.0 | 3.91 | 23,133 chars | 5 |
| `openai` | 13,139ms | `A` | 10.0 | 0.76 | 10,375 chars | 28 (+98 sources) |
| `gemini` | 24,743ms | `B+` | 8.5 | 0.34 | 12,256 chars | 5 (redirect URLs) |
| `anthropic` | 84,873ms | `A-` | 9.0 | 0.11 | 13,471 chars | 30 |

**Ratio** = Quality Score / Elapsed seconds. Higher = more quality per second of wait.

### Rankings

**By speed:** `brave` (389ms) > `perplexity` (505ms) > `exa` (1.5s) > `tavily` (~1.8s) > `parallel` (2.0s) > `openai` (13.1s) > `gemini` (24.7s) > `anthropic` (84.9s)

**By quality:** `openai` (A) > `anthropic` (A-) = `perplexity` (A-) > `gemini` (B+) > `exa` (B) = `parallel` (B) > `tavily` (B-) > `brave` (C)

**By speed/quality ratio:** `perplexity` (17.82) > `brave` (12.85) > `exa` (5.31) > `parallel` (3.91) > `tavily` (3.89) > `openai` (0.76) > `gemini` (0.34) > `anthropic` (0.11)

### Quality grading criteria

| Grade | Meaning |
|---|---|
| `A` | Comprehensive, accurate answer covering all 3 frameworks with specific compliance details, enforcement mechanisms, and high-quality citations to authoritative sources |
| `B` | Good answer covering the key differences with some specifics, or excellent sources without synthesis |
| `C` | Partial answer or results-only with relevant but shallow coverage |
| `D` | Minimal useful content, wrong sources, or mostly irrelevant results |

Weights: **completeness (30%)** + **accuracy of specifics (25%)** + **citation quality (25%)** + **structure/usability (20%)**

### Quality notes

- **OpenAI (A, 10.0):** 10.4K chars with `tool_choice: { type: "web_search" }` forcing search. 28 inline url_citation annotations with title, URL, and character offsets + 98 background sources via `include: ["web_search_call.action.sources"]`. Well-structured markdown with clear framework headers. Most citations of any provider when including sources. **Note:** without `tool_choice`, gpt-5-mini may answer complex queries from training data and skip search entirely, returning 0 citations.
- **Perplexity (A-, 9.0):** ~21.5K chars of rich snippet content from 5 results via the Search API (`/search` endpoint) with `max_tokens: 4000` and `max_tokens_per_page: 2000`. Each result includes 1.6K-12K chars of page content. 5 citations to authoritative sources (EU Parliament, IAPP, regulatory comparison sites). Top 1-2 results retain full quality; lower results get truncated but still useful. Without `max_tokens`/`max_tokens_per_page`, returns 54K+ chars which overwhelms agent context. The Chat Completions path (`/chat/completions`) returns a synthesized 14K-char answer with 8-10 citations but takes 28-37s instead of 505ms.
- **Anthropic (A-, 9.0):** 13.5K chars of well-structured comparison with specific compliance requirements per framework (risk categories, FRIA obligations, fines up to €35M/7% turnover). 30 real, deduplicated citations from authoritative legal/regulatory sources. Comprehensive but slow (85s due to multi-turn `pause_turn` continuation). Most real citations of any LLM provider.
- **Gemini (B+, 8.5):** 12.3K chars of thorough analysis covering all 3 frameworks in depth. But all 5 citations are `vertexaisearch.cloud.google.com` redirect URLs — these return 404 when fetched directly and only resolve in a browser with JavaScript. This is a Gemini API limitation, not a plugin bug. Content quality alone would be A-; unverifiable citations are a significant penalty.
- **Exa (B, 8.0):** No synthesized answer (traditional search). 19.2K chars of highlighted excerpts from 5 highly relevant sources — regulatory comparison sites, academic papers, legal analysis. Excellent source selection (regulations.ai, IAPP, programming-helper.com). Richest highlighted content among traditional search providers.
- **Parallel (B, 8.0):** No synthesized answer (traditional search). 23.1K chars of excerpts from 5 results. Good source diversity — EU Parliament, White House, think tanks, Plurus Strategies. Excerpts are extensive and well-extracted when using `excerpts.max_chars_per_result: 5000`. **Note:** the response uses `excerpts[]` (array), not `excerpt` (string) — callers must join the array.
- **Tavily (B-, 7.0):** 249 chars of generated answer + 6.2K chars of result content from 5 sources including IAPP and UChicago Business Law Review. The synthesized answer is thin, but `search_depth: "advanced"` with `chunks_per_source: 3` returns solid source content. Speed is ~1.5-2.5s with `auto_parameters: true` (see depth analysis below).
- **Brave (C, 5.0):** No synthesized answer (traditional search). 1.7K chars of descriptions from 5 relevant results. On free tier: `extra_snippets` returns empty, no rich data. Decent source relevance for pure keyword search. **Paid plan** would unlock up to 5 additional excerpt snippets per result and structured rich data (stocks, weather, sports).

---

## Tavily depth analysis

Tavily's `search_depth` and `auto_parameters` significantly affect speed and content shape. Tested on a similar query:

### With `auto_parameters: true` (default)

| Depth | Speed | Answer | Content | Notes |
|---|---:|---:|---:|---|
| `ultra-fast` | 1,550ms | 569 chars | 4,625 chars | Auto overrides depth; similar latency to all modes |
| `fast` | 2,330ms | 618 chars | 4,625 chars | Same content as ultra-fast |
| `basic` | 1,408ms | 721 chars | 4,917 chars | Slightly more content |
| `advanced` | 2,250ms | 864 chars | 6,986 chars | Best answer + content |

### With `auto_parameters: false`

| Depth | Speed | Answer | Content | Notes |
|---|---:|---:|---:|---|
| `ultra-fast` | 921ms | 283 chars | 12,245 chars | Fastest; NLP page summaries (most raw content) |
| `fast` | 1,126ms | 309 chars | 6,522 chars | Reranked chunks |
| `basic` | 1,558ms | 269 chars | 3,635 chars | NLP page summaries (less content than ultra-fast) |
| `advanced` | 3,973ms | 424 chars | 10,086 chars | Reranked chunks; slowest but thorough |

### Key findings

- **`auto_parameters: true` homogenizes latency** — all depths cluster at 1.4-2.3s regardless of requested depth. The auto analyzer adds overhead but produces better answers (569-864 chars vs 269-424 chars).
- **`auto_parameters` may auto-upgrade to `advanced`** (2 credits per query instead of 1). The docs warn about this cost implication.
- **`ultra-fast` with `auto_parameters: false`** is the fastest real mode (921ms) and paradoxically returns the most raw content (12.2K chars as NLP page summaries).
- **Content types differ by depth:** `basic`/`ultra-fast` return NLP page summaries; `fast`/`advanced` return reranked chunks. Chunks are more targeted but summaries may contain more total text.
- **The 170ms result in earlier benchmarks was a cache hit** — Tavily caches responses for identical queries. Real speed is 900ms-4s depending on depth and auto_parameters.

**Recommendation:** Keep `auto_parameters: true` as default (smarter query analysis, better answer quality). Set `auto_parameters: false` with `search_depth: "ultra-fast"` for lowest latency at the cost of answer quality.

---

## Perplexity token tuning

The Search API's `max_tokens` and `max_tokens_per_page` control content volume. Tested to find the sweet spot between content richness and agent context efficiency:

| max_tokens | per_page | Total chars | Avg/result | Quality signals (out of 25) |
|---:|---:|---:|---:|---:|
| 10,000 | 4,096 | 54,520 | 10,904 | 21 |
| 5,000 | 2,048 | 25,785 | 5,157 | — |
| **4,000** | **2,000** | **21,552** | **4,310** | **18** |
| 3,500 | 1,500 | 19,442 | 3,888 | 17 |
| 3,000 | 1,024 | 15,217 | 3,043 | — |
| 2,000 | 1,024 | 10,307 | 2,061 | — |

**4,000/2,000 was chosen as the default.** It returns ~21K chars (in line with Exa and Parallel), keeps 3-5K chars per result, and retains 18/25 quality signals vs 21/25 at the maximum. Source selection is identical across all settings — only snippet length changes.

Note: `max_tokens` is in tokens (~4 chars/token), not characters. The API default is 10,000 tokens which produces 50K+ chars.

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
| **Brave** | ERR* | 389ms | N/A | N/A → **C** | — → **12.85** | Fixed benchmark URL (plugin was always correct) |
| **Perplexity** | 36,615ms | **505ms** | **72x faster** | Same (A-) | 0.25 → **17.82** | Search API (`apiMode: "search"`) + `max_tokens` control |
| **Exa** | 1,405ms | 1,507ms | Same | B- → **B** | 4.98 → **5.31** | `maxCharacters: 4000` highlights (19K vs 8K content) |
| **Tavily** | 2,616ms | **~1,800ms** | Slight | D+ → **B-** | 1.34 → **3.89** | `chunksPerSource: 3`, include result content |
| **Parallel** | 3,026ms | 2,046ms | 1.5x faster | C- → **B** | 1.49 → **3.91** | `mode: "one-shot"`, `excerpts[]` array, 5K chars/result |
| **OpenAI** | 15,113ms | 13,139ms | Slight | B → **A** | 0.53 → **0.76** | `tool_choice`, `include: sources`, typed annotations |
| **Gemini** | 25,881ms | 24,743ms | Same | B → **B+** | 0.31 → 0.34 | `groundingSupports` extraction (citations still redirect) |
| **Anthropic** | 110,697ms | **84,873ms** | **1.3x faster** | Same (A-) | 0.08 → **0.11** | `maxTokens: 4096`, improved source extraction |

### Upgrade impact summary

- **Perplexity** had the largest speed improvement: 36.6s → 505ms (**72x faster**) by switching to the Search API. Content controlled via `max_tokens: 4000` / `max_tokens_per_page: 2000` (~21K chars; unbounded returns 54K+).
- **OpenAI** jumped from B to A by using `tool_choice: { type: "web_search" }` to ensure search triggers, plus `include: ["web_search_call.action.sources"]` for 98 background sources.
- **Tavily** jumped from D+ to B- by including result content alongside the thin answer. Speed is ~1.8s (the 170ms in earlier benchmarks was a Tavily response cache hit).
- **Parallel** went from C- to B — 23K chars of excerpts when reading the `excerpts[]` array correctly.
- **Exa** content grew from 8K to 19K chars with `maxCharacters: 4000` highlights.

### Benchmark corrections
- **Brave:** v1 benchmark used `api.brave.com` instead of `api.search.brave.com`. Plugin source was always correct.
- **OpenAI:** v1 benchmark didn't use `tool_choice` or `include: sources`. Without `tool_choice`, gpt-5-mini skips search for complex queries it can answer from training data.
- **Parallel:** v1 benchmark read `excerpt` (string) instead of `excerpts` (array), getting 0 chars.
- **Perplexity:** v1 benchmark used chat completions path. Plugin defaults to Search API.
- **Tavily:** 170ms result was a Tavily response cache hit from repeated identical queries. Real speed is ~1.5-2.5s with `auto_parameters: true`.
- **Exa:** 230ms result was likely edge cache. Typical speed is ~1.5s.

---

## Provider tiers (post-upgrade)

### Fast search (< 3s)
**Brave, Perplexity, Exa, Tavily, Parallel**

Best for: quick lookups, structured results, agent workflows where latency matters.
- **Perplexity** (505ms) has rich content (~21K chars) and the best speed/quality ratio overall.
- **Brave** (389ms) is the fastest and cheapest (free tier works) but shallowest content.
- **Exa** (~1.5s) has excellent source selection and 19K chars of highlights.
- **Tavily** (~1.8s) provides answer + result content; good for hybrid use cases.
- **Parallel** (2.0s) provides 23K chars of well-extracted excerpts.

### LLM search (10-85s)
**OpenAI, Gemini, Anthropic**

Best for: synthesized answers, complex multi-source questions, research.
- **OpenAI** (13s) gives the best synthesized answer with most citations (28 inline + 98 sources). Requires `tool_choice` for reliable search triggering.
- **Gemini** (25s) produces thorough analysis but citations are redirect URLs — a known API limitation.
- **Anthropic** (85s) provides exhaustive research with 30 real citations via multi-turn search. Slowest but most thorough.

### Recommended configuration

```jsonc
{
  "provider": "perplexity",  // or "auto" to use first available key
  "fallback": ["exa", "brave"]
}
```

### Recommended providers by use case
- **Best overall (default):** `perplexity` — A- quality at 505ms with ~21K chars of content
- **Fastest:** `brave` (389ms) for basic results, `perplexity` (505ms) for rich content
- **Best synthesized answer:** `openai` with `tool_choice` — A quality, 28 citations
- **Best for research:** `anthropic` — most real citations, deepest analysis
- **Best source selection:** `exa` — highest relevance highlights, ~17K chars
- **Budget / no API keys:** `brave` free tier (2K queries/month, no API cost)

---

## Known provider limitations

| Provider | Limitation | Impact | Workaround |
|---|---|---|---|
| **Gemini** | All citations are `vertexaisearch.cloud.google.com` redirect URLs | URLs return 404 when fetched; only resolve in browser JS | None — Gemini API limitation. Real URLs not available via REST API. |
| **OpenAI** | gpt-5-mini may skip search for complex queries answerable from training data | Returns 0 citations when search doesn't trigger | Use `tool_choice: { type: "web_search" }` to force search (plugin default). |
| **Brave** | `extra_snippets` and rich data require paid Search plan | Free tier returns descriptions only (no extra excerpts) | Upgrade to paid plan ($5/month) for richer results |
| **Anthropic** | Multi-turn `pause_turn` adds 40-80s per query | Slowest provider by far | Reduce `maxUses` to limit search iterations |
| **Tavily** | `auto_parameters: true` may auto-upgrade to `advanced` depth | 2 credits per query instead of 1 | Set `auto_parameters: false` + explicit `search_depth` to control cost |
| **Tavily** | Response caching on identical queries | Benchmark speeds may appear faster than real-world | Use unique queries for benchmarking; expect ~1.5-2.5s typical |
| **Perplexity** | Search API date filters require MM/DD/YYYY format | YYYY-MM-DD format silently fails or is ignored | Fixed in plugin v2: uses `toUsDate()` for correct format |

---

## Methodology

- All 8 providers called in parallel via `Promise.all()` to avoid serial timing bias.
- Same query and default config for all providers.
- "Content" = total character count of answer text + result snippets/excerpts/descriptions (provider-dependent).
- "Citations" = deduplicated URL count. For OpenAI, inline `url_citation` annotations only (sources shown separately).
- Quality graded on: completeness (30%), accuracy of specifics (25%), citation quality (25%), structure/usability (20%).
- **Ratio** = Quality Score / Elapsed seconds. Measures quality per unit of wait time.
- OpenAI uses `tool_choice: { type: "web_search" }` to force search and `include: ["web_search_call.action.sources"]`.
- Perplexity uses the Search API (`/search`) with `max_tokens: 4000` and `max_tokens_per_page: 2000` (~21K chars output).
- Tavily speed corrected from cache-hit anomaly; representative speed is ~1.8s with `auto_parameters: true`.
- Exa speed corrected from edge-cache anomaly; typical speed is ~1.5s.
- Single query benchmark — results will vary across query types. A multi-query suite is planned.
