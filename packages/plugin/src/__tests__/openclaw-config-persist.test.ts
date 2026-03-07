import { describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  defaultOpenClawConfigPath,
  defaultOpenClawStateDir,
  defaultPluginPath,
  defaultSkillPackagePath,
  installOpenClawSkill,
  persistSetupToOpenClawConfig,
  resolveOpenClawSkillInstallPath,
} from "../cli/openclaw-config"

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
    expect(defaultOpenClawStateDir("/tmp/home")).toBe("/tmp/home/.openclaw")
    expect(defaultPluginPath()).toContain("/packages/plugin")
    expect(defaultSkillPackagePath()).toContain("/packages/skill/better-search")
  })

  test("installs the standalone Better Search skill into the managed OpenClaw skills directory", async () => {
    const dir = await mkdtemp(join(tmpdir(), "better-search-skill-"))
    const configPath = join(dir, "openclaw.json")
    const sourcePath = join(dir, "source-skill")
    const installedPath = resolveOpenClawSkillInstallPath(dir)

    await mkdir(sourcePath, { recursive: true })
    await writeFile(join(sourcePath, "SKILL.md"), "# Better Search\n", "utf8")
    await mkdir(installedPath, { recursive: true })
    await writeFile(join(installedPath, "SKILL.md"), "old skill\n", "utf8")

    const result = await installOpenClawSkill({
      configPath,
      skillSourcePath: sourcePath,
    })

    expect(result).toEqual({
      installedPath,
      sourcePath,
    })
    expect(await readFile(join(installedPath, "SKILL.md"), "utf8")).toContain("# Better Search")
  })

  test("throws when HOME is not available", () => {
    expect(() => defaultOpenClawConfigPath("")).toThrow(
      "HOME is not set, so the OpenClaw config path could not be determined.",
    )
  })
})
