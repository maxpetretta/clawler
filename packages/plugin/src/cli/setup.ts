import { cancel, confirm, intro, isCancel, note, outro, password, select } from "@clack/prompts"
import type { ClawlerConfig, ClawlerProviderSelection } from "../config"
import { listProviderStatuses } from "../providers/registry"
import { defaultPluginPath, installOpenClawSkill, persistSetupToOpenClawConfig } from "./openclaw-config"

type SetupWizardPromptApi = {
  cancel: typeof cancel
  confirm: typeof confirm
  intro: typeof intro
  isCancel: typeof isCancel
  note: typeof note
  outro: typeof outro
  password: typeof password
  select: typeof select
}

type SetupWizardDeps = {
  prompts: SetupWizardPromptApi
  listProviderStatuses: typeof listProviderStatuses
  persistSetupToOpenClawConfig: typeof persistSetupToOpenClawConfig
  installOpenClawSkill: typeof installOpenClawSkill
  defaultPluginPath: typeof defaultPluginPath
}

const SETUP_CANCELLED_MESSAGE = "Setup cancelled."
const PROVIDER_OPTIONS = [
  { value: "auto", label: "Auto detect", hint: "Use the first available provider key" },
  { value: "exa", label: "Exa", hint: "Neural search API" },
  { value: "tavily", label: "Tavily", hint: "Agent search API" },
  { value: "brave", label: "Brave", hint: "Traditional search index" },
  { value: "parallel", label: "Parallel", hint: "Search and extraction API" },
  { value: "perplexity", label: "Perplexity", hint: "LLM-native search" },
  { value: "openai", label: "OpenAI", hint: "Responses API web search" },
  { value: "anthropic", label: "Anthropic", hint: "Messages API web search" },
  { value: "gemini", label: "Gemini", hint: "Google grounding" },
] as const

const defaultSetupWizardDeps: SetupWizardDeps = {
  prompts: {
    cancel,
    confirm,
    intro,
    isCancel,
    note,
    outro,
    password,
    select,
  },
  listProviderStatuses,
  persistSetupToOpenClawConfig,
  installOpenClawSkill,
  defaultPluginPath,
}

export async function runSetupWizard(
  config: ClawlerConfig,
  deps: SetupWizardDeps = defaultSetupWizardDeps,
): Promise<void> {
  deps.prompts.intro("Clawler setup")

  const selectedProvider = await promptOrCancel<ClawlerProviderSelection>(
    deps.prompts,
    deps.prompts.select({
      message: "Choose a default provider",
      initialValue: config.provider,
      options: PROVIDER_OPTIONS,
    }),
  )
  if (selectedProvider === undefined) {
    return
  }

  const shouldDenyBuiltin = await promptOrCancel<boolean>(
    deps.prompts,
    deps.prompts.confirm({
      message: 'Write `tools.deny += ["web_search"]` to OpenClaw config?',
      initialValue: true,
    }),
  )
  if (shouldDenyBuiltin === undefined) {
    return
  }

  deps.prompts.note(formatProviderStatuses(deps.listProviderStatuses(config)), "Detected providers")

  const providerApiKey = await promptForApiKey(selectedProvider, deps.prompts)
  if (providerApiKey === undefined) {
    return
  }

  const shouldPersist = await promptOrCancel<boolean>(
    deps.prompts,
    deps.prompts.confirm({
      message: "Persist these changes to ~/.openclaw/openclaw.json?",
      initialValue: true,
    }),
  )
  if (shouldPersist === undefined) {
    return
  }

  if (!shouldPersist) {
    deps.prompts.cancel(SETUP_CANCELLED_MESSAGE)
    return
  }

  const configPath = await deps.persistSetupToOpenClawConfig({
    provider: selectedProvider,
    shouldDenyBuiltin,
    providerApiKey,
  })

  let installedSkillPath = ""
  let skillInstallError = ""

  try {
    const skillInstall = await deps.installOpenClawSkill({ configPath })
    installedSkillPath = skillInstall.installedPath
  } catch (error) {
    skillInstallError = `Failed to install Clawler skill: ${String(error)}`
  }

  deps.prompts.note(
    [
      `config: ${configPath}`,
      `plugin path: ${deps.defaultPluginPath()}`,
      `provider: ${selectedProvider}`,
      installedSkillPath ? `skill path: ${installedSkillPath}` : "skill path: install failed",
    ].join("\n"),
    "Persisted config",
  )

  if (skillInstallError) {
    deps.prompts.note(skillInstallError, "Skill install warning")
  }

  deps.prompts.outro(`Saved Clawler setup to ${configPath}`)
}

async function promptForApiKey(
  provider: ClawlerProviderSelection,
  prompts: SetupWizardPromptApi,
): Promise<string | undefined> {
  if (provider === "auto") {
    return ""
  }

  const shouldSaveKey = await promptOrCancel<boolean>(
    prompts,
    prompts.confirm({
      message: `Save ${provider} API key into OpenClaw config?`,
      initialValue: false,
    }),
  )
  if (shouldSaveKey === undefined) {
    return undefined
  }

  if (!shouldSaveKey) {
    return ""
  }

  const apiKey = await promptOrCancel<string>(
    prompts,
    prompts.password({
      message: `Enter ${provider} API key`,
      validate(value) {
        return value && value.trim().length > 0 ? undefined : "API key must not be empty."
      },
    }),
  )

  return apiKey?.trim()
}

function formatProviderStatuses(statuses: ReturnType<typeof listProviderStatuses>): string {
  return statuses
    .map(
      (status) =>
        `${status.available ? "available" : "missing"}  ${status.id}  ${status.source}  ${status.envVars.join(" | ")}`,
    )
    .join("\n")
}

async function promptOrCancel<T>(prompts: SetupWizardPromptApi, prompt: Promise<T | symbol>): Promise<T | undefined> {
  const value = await prompt

  if (prompts.isCancel(value)) {
    prompts.cancel(SETUP_CANCELLED_MESSAGE)
    return undefined
  }

  return value
}
