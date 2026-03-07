import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { BetterSearchProviderSelection } from "../config"

type OpenClawJson = Record<string, unknown>

export type SetupPersistenceInput = {
  provider: BetterSearchProviderSelection
  shouldDenyBuiltin: boolean
  providerApiKey?: string
  pluginPath?: string
}

export function defaultOpenClawConfigPath(homeDir = process.env.HOME): string {
  if (!homeDir || homeDir.length === 0) {
    throw new Error("HOME is not set, so the OpenClaw config path could not be determined.")
  }

  return join(homeDir, ".openclaw", "openclaw.json")
}

export function defaultPluginPath(): string {
  return fileURLToPath(new URL("../..", import.meta.url))
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
