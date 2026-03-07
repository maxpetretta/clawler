import type { BetterSearchConfig } from "../config"
import { anthropicProvider } from "./anthropic"
import { braveProvider } from "./brave"
import { exaProvider } from "./exa"
import { geminiProvider } from "./gemini"
import { openaiProvider } from "./openai"
import { parallelProvider } from "./parallel"
import { perplexityProvider } from "./perplexity"
import { providerCredentialSource } from "./shared"
import { tavilyProvider } from "./tavily"
import type { ProviderId, ProviderStatus, SearchProvider } from "./types"

export const providersInPriorityOrder = [
  exaProvider,
  tavilyProvider,
  braveProvider,
  parallelProvider,
  perplexityProvider,
  openaiProvider,
  anthropicProvider,
  geminiProvider,
] as const satisfies readonly SearchProvider[]

export function listProviderStatuses(
  config: BetterSearchConfig,
  env: Record<string, string | undefined> = process.env,
): ProviderStatus[] {
  return providersInPriorityOrder.map((provider) => {
    const source = providerCredentialSource(config, provider.id, env)

    return {
      id: provider.id,
      name: provider.name,
      available: provider.isAvailable(config, env),
      envVars: provider.envVars,
      source,
    }
  })
}

export function getProviderById(id: ProviderId): SearchProvider {
  const provider = providersInPriorityOrder.find((entry) => entry.id === id)

  if (!provider) {
    throw new Error(`Unknown provider: ${id}`)
  }

  return provider
}

export function resolveProvider(
  config: BetterSearchConfig,
  env: Record<string, string | undefined> = process.env,
): SearchProvider {
  if (config.provider !== "auto") {
    const explicitProvider = getProviderById(config.provider)

    if (!explicitProvider.isAvailable(config, env)) {
      throw new Error(
        `Configured provider "${explicitProvider.id}" is unavailable. Expected one of: ${explicitProvider.envVars.join(", ")}`,
      )
    }

    return explicitProvider
  }

  const detectedProvider = providersInPriorityOrder.find((provider) => provider.isAvailable(config, env))

  if (!detectedProvider) {
    throw new Error(
      "No search provider credentials found. Configure Better Search or set one of the supported provider API keys.",
    )
  }

  return detectedProvider
}
