import { describe, expect, test } from "bun:test"
import { resolveConfig } from "../config"
import { getProviderById, listProviderStatuses, resolveProvider } from "../providers/registry"

describe("provider registry", () => {
  test("auto mode chooses the first available provider by priority", () => {
    const config = resolveConfig({})
    const provider = resolveProvider(config, {
      TAVILY_API_KEY: "tavily",
      BRAVE_API_KEY: "brave",
    })

    expect(provider.id).toBe("tavily")
  })

  test("explicit provider selection is respected", () => {
    const config = resolveConfig({ provider: "openai" })
    const provider = resolveProvider(config, {
      OPENAI_API_KEY: "openai",
      EXA_API_KEY: "exa",
    })

    expect(provider.id).toBe("openai")
  })

  test("per-call provider override wins over the configured default", () => {
    const config = resolveConfig({ provider: "openai" })
    const provider = resolveProvider(
      config,
      {
        OPENAI_API_KEY: "openai",
        EXA_API_KEY: "exa",
      },
      "exa",
    )

    expect(provider.id).toBe("exa")
  })

  test("status list reflects missing and available credentials", () => {
    const statuses = listProviderStatuses(resolveConfig({}), {
      EXA_API_KEY: "exa",
    })

    expect(statuses.find((status) => status.id === "exa")?.available).toBe(true)
    expect(statuses.find((status) => status.id === "brave")?.available).toBe(false)
  })

  test("throws for unknown providers and unavailable explicit providers", () => {
    expect(() => getProviderById("unknown" as never)).toThrow("Unknown provider: unknown")
    expect(() => resolveProvider(resolveConfig({ provider: "openai" }), {})).toThrow(
      'Configured provider "openai" is unavailable. Expected one of: OPENAI_API_KEY',
    )
    expect(() => resolveProvider(resolveConfig({ provider: "exa" }), {}, "openai")).toThrow(
      'Requested provider "openai" is unavailable. Expected one of: OPENAI_API_KEY',
    )
  })

  test("throws when no providers are available in auto mode", () => {
    expect(() => resolveProvider(resolveConfig({}), {})).toThrow(
      "No search provider credentials found. Configure Better Search or set one of the supported provider API keys.",
    )
  })
})
