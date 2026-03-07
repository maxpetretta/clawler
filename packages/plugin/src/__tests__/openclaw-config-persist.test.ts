import { describe, expect, test } from "bun:test"
import { mkdtemp, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { defaultOpenClawConfigPath, defaultPluginPath, persistSetupToOpenClawConfig } from "../cli/openclaw-config"

describe("persistSetupToOpenClawConfig", () => {
  test("writes a new OpenClaw config file when none exists", async () => {
    const dir = await mkdtemp(join(tmpdir(), "better-search-test-"))
    const configPath = join(dir, "openclaw.json")

    await persistSetupToOpenClawConfig(
      {
        provider: "exa",
        shouldDenyBuiltin: true,
        providerApiKey: "key",
        pluginPath: "/plugin/path",
      },
      configPath,
    )

    const saved = JSON.parse(await readFile(configPath, "utf8")) as Record<string, unknown>
    expect(saved).toMatchObject({
      tools: { deny: ["web_search"] },
      plugins: {
        allow: ["better-search"],
        load: { paths: ["/plugin/path"] },
        entries: {
          "better-search": {
            enabled: true,
            config: {
              provider: "exa",
              exa: { apiKey: "key" },
            },
          },
        },
      },
    })
  })

  test("computes default paths from HOME and module location", () => {
    expect(defaultOpenClawConfigPath("/tmp/home")).toBe("/tmp/home/.openclaw/openclaw.json")
    expect(defaultPluginPath()).toContain("/packages/plugin")
  })

  test("throws when HOME is not available", () => {
    expect(() => defaultOpenClawConfigPath("")).toThrow(
      "HOME is not set, so the OpenClaw config path could not be determined.",
    )
  })
})
