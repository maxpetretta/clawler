export const siteName = "Clawler"
export const siteUrl = "https://clawler.sh"
export const siteDomain = "clawler.sh"

export const pageTitle = "Clawler | Crawl the web. Fast."
export const pageDescription =
  "OpenClaw plugin that reaches across eight search providers - Anthropic, Brave, Exa, Gemini, OpenAI, Parallel, Perplexity, and Tavily - with a single tool."

export const heroTitleLead = "Crawl the web."
export const heroTitleAccent = "Fast."
export const heroTitle = `${heroTitleLead} ${heroTitleAccent}`
export const heroSubtitle =
  "Your OpenClaw agent gets one built-in search engine. Clawler gives it eight - from fast link retrieval to AI-powered answers - without changing a single prompt."

export const ogImageAlt = `${siteName} opengraph card`

export type ProviderInfo = {
  id: string
  label: string
  color: string
  type: string
  desc: string
}

export const providers: ProviderInfo[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    color: "#d4a27f",
    type: "AI answer",
    desc: "Claude searches the web for you. Deep research mode with citations and careful source evaluation.",
  },
  {
    id: "brave",
    label: "Brave",
    color: "#fb542b",
    type: "Fast links",
    desc: "Independent, fast web search. Great for quick factual lookups and getting a list of relevant pages.",
  },
  {
    id: "exa",
    label: "Exa",
    color: "#5b8df9",
    type: "Smart links",
    desc: "Neural search that understands what you mean, not just what you typed. Finds the exact page you need.",
  },
  {
    id: "gemini",
    label: "Gemini",
    color: "#4285f4",
    type: "AI answer",
    desc: "Google-powered search with AI summaries. Taps into Google's index through the Gemini API.",
  },
  {
    id: "openai",
    label: "OpenAI",
    color: "#19c37d",
    type: "AI answer",
    desc: "Uses GPT to search the web and reason through results. Returns a full answer with cited sources.",
  },
  {
    id: "parallel",
    label: "Parallel",
    color: "#a78bfa",
    type: "Fast links",
    desc: "Searches multiple sources at once and returns structured excerpts. Fast and comprehensive.",
  },
  {
    id: "perplexity",
    label: "Perplexity",
    color: "#22b8cf",
    type: "AI answer",
    desc: "Real-time answers grounded in current web results. Great when you need up-to-the-minute information.",
  },
  {
    id: "tavily",
    label: "Tavily",
    color: "#0bc98c",
    type: "Hybrid",
    desc: "Research-grade search that returns both an AI answer and structured results with sources. Built for thorough lookups.",
  },
]
