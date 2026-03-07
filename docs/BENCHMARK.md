# Benchmark

## Latest full run

Date: March 7, 2026

Query:

> As of March 7, 2026, summarize the official web-search tooling offered by OpenAI, Anthropic, and Google for developers. Include endpoint names, major search controls, and how citations are exposed.

Raw artifact:

- `/tmp/better-search-bench/all-providers-after-tavily.json`

## Results

| Provider | Speed | Quality | Quality Score | Speed/Quality Ratio |
|---|---:|---|---:|---:|
| `openai` | 13.9s | `B+` | 8.5 | 0.61 |
| `anthropic` | 28.1s | `B-` | 7.0 | 0.25 |
| `gemini` | 10.1s | `B` | 8.0 | 0.79 |
| `exa` | 1.3s | `B-` | 7.0 | 5.25 |
| `brave` | 0.9s | `C-` | 4.5 | 5.23 |
| `parallel` | 1.6s | `C-` | 4.5 | 2.73 |
| `perplexity` | 5.1s | `D` | 3.0 | 0.59 |
| `tavily` | 3.0s | `D-` | 2.2 | 0.74 |

## Raw run summary

| Provider | Elapsed | Answer Length | Citations | Results |
|---|---:|---:|---:|---:|
| `brave` | 861ms | 0 | 0 | 5 |
| `exa` | 1334ms | 0 | 0 | 5 |
| `tavily` | 2963ms | 158 | 5 | 5 |
| `perplexity` | 5110ms | 1290 | 8 | 8 |
| `parallel` | 1648ms | 0 | 0 | 5 |
| `gemini` | 10139ms | 3807 | 16 | 0 |
| `openai` | 13932ms | 9343 | 6 | 0 |
| `anthropic` | 28077ms | 2837 | 5 | 0 |

## Takeaways

- Best overall synthesized answer: `openai`
- Best speed among answer-generating providers: `gemini`
- Best traditional retrieval: `exa`
- Best quality-per-second on this exact metric: `exa`, with `brave` very close behind
- Tavily improved after the advanced-mode patch, but remained low quality on this query because its sources were weak and mostly non-primary

## Caveats

- This was a single-query benchmark, not a full benchmark suite.
- The ratio column favors very fast retrieval providers over slower answer-synthesizing providers.
- `exa`, `brave`, and `parallel` are not directly apples-to-apples with `openai`, `anthropic`, `gemini`, and `perplexity`, because the former mostly return result lists while the latter attempt to answer the question.
