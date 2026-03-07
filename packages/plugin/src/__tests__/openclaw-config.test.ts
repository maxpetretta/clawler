import { describe, expect, test } from "bun:test"
import { applySetupToOpenClawConfig } from "../cli/openclaw-config"

describe("OpenClaw config persistence", () => {
  test("adds Better Search plugin config without removing unrelated settings", () => {
    const next = applySetupToOpenClawConfig(
      {
        tools: {
          deny: ["browser"],
        },
        plugins: {
          allow: ["reclaw"],
          load: {
            paths: ["/Users/max/dev/reclaw/packages/plugin"],
          },
          entries: {
            reclaw: {
              enabled: true,
            },
          },
        },
      },
      {
        provider: "openai",
        shouldDenyBuiltin: true,
        providerApiKey: "openai-key",
        pluginPath: "/Users/max/dev/better-search/packages/plugin",
      },
    )

    expect(next).toMatchObject({
      tools: {
        deny: ["browser", "web_search"],
      },
      plugins: {
        allow: ["reclaw", "better-search"],
        load: {
          paths: ["/Users/max/dev/reclaw/packages/plugin", "/Users/max/dev/better-search/packages/plugin"],
        },
        entries: {
          reclaw: {
            enabled: true,
          },
          "better-search": {
            enabled: true,
            config: {
              provider: "openai",
              openai: {
                apiKey: "openai-key",
              },
            },
          },
        },
      },
    })
  })

  test("does not duplicate entries and supports auto provider without saving keys", () => {
    const next = applySetupToOpenClawConfig(
      {
        tools: {
          deny: ["web_search"],
        },
        plugins: {
          allow: ["better-search"],
          load: {
            paths: ["/Users/max/dev/better-search/packages/plugin"],
          },
          entries: {
            "better-search": {
              enabled: false,
              config: {
                provider: "exa",
              },
            },
          },
        },
      },
      {
        provider: "auto",
        shouldDenyBuiltin: true,
        pluginPath: "/Users/max/dev/better-search/packages/plugin",
      },
    )

    expect(next).toMatchObject({
      tools: {
        deny: ["web_search"],
      },
      plugins: {
        allow: ["better-search"],
        load: {
          paths: ["/Users/max/dev/better-search/packages/plugin"],
        },
        entries: {
          "better-search": {
            enabled: true,
            config: {
              provider: "auto",
            },
          },
        },
      },
    })
  })
})
