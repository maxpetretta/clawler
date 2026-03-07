import type { SearchResult } from "./providers/types"

export function formatSearchResult(result: SearchResult): string {
  const header = `Search results for "${result.query}" (via ${result.provider}):`
  const sections: string[] = [header]

  if (result.answer) {
    sections.push("")
    sections.push("Answer:")
    sections.push(result.answer.trim())
  }

  if (result.citations && result.citations.length > 0) {
    sections.push("")
    sections.push("Sources:")
    sections.push(...result.citations.map((citation) => `- ${citation}`))
  }

  if (result.results && result.results.length > 0) {
    sections.push("")
    sections.push(result.answer ? "Results:" : "Search results:")
    sections.push(
      ...result.results.map((entry, index) => {
        const lines = [`${index + 1}. ${entry.title}`, `   URL: ${entry.url}`]

        if (entry.publishedDate) {
          lines.push(`   Published: ${entry.publishedDate}`)
        }

        if (entry.snippet.length > 0) {
          lines.push(`   ${entry.snippet}`)
        }

        return lines.join("\n")
      }),
    )
  }

  if ((!result.answer || result.answer.length === 0) && (!result.results || result.results.length === 0)) {
    sections.push("")
    sections.push("No results returned.")
  }

  return sections.join("\n")
}
