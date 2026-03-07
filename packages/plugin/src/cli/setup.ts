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

  const selectedProvider = await deps.prompts.select({
    message: "Choose a default provider",
    initialValue: config.provider,
    options: [
      { value: "auto", label: "Auto detect", hint: "Use the first available provider key" },
      { value: "exa", label: "Exa", hint: "Neural search API" },
      { value: "tavily", label: "Tavily", hint: "Agent search API" },
      { value: "brave", label: "Brave", hint: "Traditional search index" },
      { value: "parallel", label: "Parallel", hint: "Search and extraction API" },
      { value: "perplexity", label: "Perplexity", hint: "LLM-native search" },
      { value: "openai", label: "OpenAI", hint: "Responses API web search" },
      { value: "anthropic", label: "Anthropic", hint: "Messages API web search" },
      { value: "gemini", label: "Gemini", hint: "Google grounding" },
    ],
  })

  if (deps.prompts.isCancel(selectedProvider)) {
    deps.prompts.cancel("Setup cancelled.")
    return
  }

  const shouldDenyBuiltin = await deps.prompts.confirm({
    message: 'Write `tools.deny += ["web_search"]` to OpenClaw config?',
    initialValue: true,
  })

  if (deps.prompts.isCancel(shouldDenyBuiltin)) {
    deps.prompts.cancel("Setup cancelled.")
    return
  }

  const statuses = deps
    .listProviderStatuses(config)
    .map(
      (status) =>
        `${status.available ? "available" : "missing"}  ${status.id}  ${status.source}  ${status.envVars.join(" | ")}`,
    )
    .join("\n")

  deps.prompts.note(statuses, "Detected providers")

  const providerApiKey = await promptForApiKey(selectedProvider, deps.prompts)
  if (providerApiKey === undefined) {
    deps.prompts.cancel("Setup cancelled.")
    return
  }

  const shouldPersist = await deps.prompts.confirm({
    message: "Persist these changes to ~/.openclaw/openclaw.json?",
    initialValue: true,
  })

  if (deps.prompts.isCancel(shouldPersist) || !shouldPersist) {
    deps.prompts.cancel("Setup cancelled.")
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

  const shouldSaveKey = await prompts.confirm({
    message: `Save ${provider} API key into OpenClaw config?`,
    initialValue: false,
  })

  if (prompts.isCancel(shouldSaveKey)) {
    return undefined
  }

  if (!shouldSaveKey) {
    return ""
  }

  const apiKey = await prompts.password({
    message: `Enter ${provider} API key`,
    validate(value) {
      return value && value.trim().length > 0 ? undefined : "API key must not be empty."
    },
  })

  if (prompts.isCancel(apiKey)) {
    return undefined
  }

  return apiKey.trim()
}
