import { cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { BetterSearchProviderSelection } from "../config"

type OpenClawJson = Record<string, unknown>
export const OPENCLAW_SKILLS_DIRNAME = "skills"
export const BETTER_SEARCH_SKILL_SLUG = "better-search"

export type SetupPersistenceInput = {
  provider: BetterSearchProviderSelection
  shouldDenyBuiltin: boolean
  providerApiKey?: string
  pluginPath?: string
}

export function defaultOpenClawConfigPath(homeDir = process.env.HOME): string {
  const explicitConfigPath = process.env.OPENCLAW_CONFIG_PATH
  if (explicitConfigPath && explicitConfigPath.length > 0) {
    return explicitConfigPath
  }

  if (!homeDir || homeDir.length === 0) {
    throw new Error("HOME is not set, so the OpenClaw config path could not be determined.")
  }

  return join(homeDir, ".openclaw", "openclaw.json")
}

export function defaultPluginPath(): string {
  return fileURLToPath(new URL("../..", import.meta.url))
}

export function defaultOpenClawStateDir(homeDir = process.env.HOME): string {
  const explicitStateDir = process.env.OPENCLAW_STATE_DIR
  if (explicitStateDir && explicitStateDir.length > 0) {
    return explicitStateDir
  }

  return dirname(defaultOpenClawConfigPath(homeDir))
}

export function defaultSkillPackagePath(): string {
  return fileURLToPath(new URL("../../../skill/better-search", import.meta.url))
}

export function resolveOpenClawSkillInstallPath(stateDir = defaultOpenClawStateDir()): string {
  return join(stateDir, OPENCLAW_SKILLS_DIRNAME, BETTER_SEARCH_SKILL_SLUG)
}

export function applySetupToOpenClawConfig(
  document: OpenClawJson,
  { provider, shouldDenyBuiltin, providerApiKey, pluginPath = defaultPluginPath() }: SetupPersistenceInput,
): OpenClawJson {
  const next = structuredClone(document)
  const plugins = ensureRecord(next, "plugins")
  const allow = ensureStringArray(plugins, "allow")
  appendUnique(allow, "better-search")

  const load = ensureRecord(plugins, "load")
  const paths = ensureStringArray(load, "paths")
  appendUnique(paths, pluginPath)

  const entries = ensureRecord(plugins, "entries")
  const pluginEntry = ensureRecord(entries, "better-search")
  pluginEntry.enabled = true

  const pluginConfig = ensureRecord(pluginEntry, "config")
  pluginConfig.provider = provider

  if (providerApiKey && provider !== "auto") {
    const providerConfig = ensureRecord(pluginConfig, provider)
    providerConfig.apiKey = providerApiKey
  }

  if (shouldDenyBuiltin) {
    const tools = ensureRecord(next, "tools")
    const deny = ensureStringArray(tools, "deny")
    appendUnique(deny, "web_search")
  }

  return next
}

export async function persistSetupToOpenClawConfig(
  input: SetupPersistenceInput,
  configPath = defaultOpenClawConfigPath(),
): Promise<string> {
  let current: OpenClawJson = {}

  try {
    current = JSON.parse(await readFile(configPath, "utf8")) as OpenClawJson
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : undefined
    if (code !== "ENOENT") {
      throw new Error(`Failed to read OpenClaw config at ${configPath}: ${String(error)}`)
    }
  }

  const next = applySetupToOpenClawConfig(current, input)
  await mkdir(dirname(configPath), { recursive: true })
  const tempPath = `${configPath}.tmp`
  await writeFile(tempPath, `${JSON.stringify(next, null, 2)}\n`, "utf8")
  await rename(tempPath, configPath)
  return configPath
}

export type InstallOpenClawSkillInput = {
  configPath?: string
  skillSourcePath?: string
}

export type InstallOpenClawSkillResult = {
  installedPath: string
  sourcePath: string
}

export async function installOpenClawSkill({
  configPath = defaultOpenClawConfigPath(),
  skillSourcePath = defaultSkillPackagePath(),
}: InstallOpenClawSkillInput = {}): Promise<InstallOpenClawSkillResult> {
  const stateDir = dirname(configPath)
  const installedPath = resolveOpenClawSkillInstallPath(stateDir)

  await mkdir(join(stateDir, OPENCLAW_SKILLS_DIRNAME), { recursive: true })
  await rm(installedPath, { recursive: true, force: true })
  await cp(skillSourcePath, installedPath, { recursive: true, force: true })

  return {
    installedPath,
    sourcePath: skillSourcePath,
  }
}

function ensureRecord(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key]

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  const created: Record<string, unknown> = {}
  record[key] = created
  return created
}

function ensureStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key]

  if (Array.isArray(value)) {
    const strings = value.filter((entry): entry is string => typeof entry === "string")
    record[key] = strings
    return strings
  }

  const created: string[] = []
  record[key] = created
  return created
}

function appendUnique(values: string[], value: string): void {
  if (!values.includes(value)) {
    values.push(value)
  }
}
