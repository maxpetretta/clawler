import { describe, expect, test } from "bun:test"
import { applySetupToOpenClawConfig } from "../cli/openclaw-config"

describe("OpenClaw config persistence", () => {
  test("adds Clawler plugin config without removing unrelated settings", () => {
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
        pluginPath: "/Users/max/dev/clawler/packages/plugin",
      },
    )

    expect(next).toMatchObject({
      tools: {
        deny: ["browser", "web_search"],
      },
      plugins: {
        allow: ["reclaw", "clawler"],
        load: {
          paths: ["/Users/max/dev/reclaw/packages/plugin", "/Users/max/dev/clawler/packages/plugin"],
        },
        entries: {
          reclaw: {
            enabled: true,
          },
          "clawler": {
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
          allow: ["clawler"],
          load: {
            paths: ["/Users/max/dev/clawler/packages/plugin"],
          },
          entries: {
            "clawler": {
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
        pluginPath: "/Users/max/dev/clawler/packages/plugin",
      },
    )

    expect(next).toMatchObject({
      tools: {
        deny: ["web_search"],
      },
      plugins: {
        allow: ["clawler"],
        load: {
          paths: ["/Users/max/dev/clawler/packages/plugin"],
        },
        entries: {
          "clawler": {
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
