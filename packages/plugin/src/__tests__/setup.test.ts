import { beforeEach, describe, expect, test } from "bun:test"
import { runSetupWizard } from "../cli/setup"
import { resolveConfig } from "../config"

const CANCEL = Symbol("cancel")

type PromptValue = boolean | string | symbol

type FakeDeps = Parameters<typeof runSetupWizard>[1]

function createDeps() {
  const selectValues: PromptValue[] = []
  const confirmValues: PromptValue[] = []
  const passwordValues: PromptValue[] = []
  const cancelMessages: string[] = []
  const noteCalls: Array<{ title?: string; message?: string }> = []
  const outroMessages: string[] = []
  const persistCalls: Array<Record<string, unknown>> = []

    const deps: FakeDeps = {
      prompts: {
        intro() {
          // No-op for test coverage.
        },
      outro(message?: string) {
        outroMessages.push(message ?? "")
      },
      note(message?: string, title?: string) {
        noteCalls.push({ title, message })
      },
      cancel(message?: string) {
        cancelMessages.push(message ?? "")
      },
      isCancel(value: unknown) {
        return value === CANCEL
      },
      select: async () => selectValues.shift() ?? CANCEL,
      confirm: async () => confirmValues.shift() ?? CANCEL,
      password: async () => passwordValues.shift() ?? CANCEL,
    },
    listProviderStatuses() {
      return [
        {
          id: "openai",
          name: "OpenAI",
          available: true,
          envVars: ["OPENAI_API_KEY"],
          source: "env",
        },
      ]
    },
    persistSetupToOpenClawConfig(input) {
      persistCalls.push(input as Record<string, unknown>)
      return Promise.resolve("/tmp/openclaw.json")
    },
    defaultPluginPath() {
      return "/plugin/path"
    },
  }

  return {
    deps,
    selectValues,
    confirmValues,
    passwordValues,
    cancelMessages,
    noteCalls,
    outroMessages,
    persistCalls,
  }
}

describe("runSetupWizard", () => {
  let state: ReturnType<typeof createDeps>

  beforeEach(() => {
    state = createDeps()
  })

  test("persists wizard selections into the OpenClaw config flow", async () => {
    state.selectValues.push("openai")
    state.confirmValues.push(true, true, true)
    state.passwordValues.push("openai-key")

    await runSetupWizard(resolveConfig({}), state.deps)

    expect(state.persistCalls).toEqual([
      {
        provider: "openai",
        shouldDenyBuiltin: true,
        providerApiKey: "openai-key",
      },
    ])
    expect(state.noteCalls.map((entry) => entry.title)).toEqual(["Detected providers", "Persisted config"])
    expect(state.outroMessages).toEqual(["Saved Better Search setup to /tmp/openclaw.json"])
  })

  test("cancels immediately when provider selection is canceled", async () => {
    state.selectValues.push(CANCEL)

    await runSetupWizard(resolveConfig({}), state.deps)

    expect(state.cancelMessages).toEqual(["Setup cancelled."])
  })

  test("cancels when deny confirmation is canceled", async () => {
    state.selectValues.push("openai")
    state.confirmValues.push(CANCEL)

    await runSetupWizard(resolveConfig({}), state.deps)

    expect(state.cancelMessages).toEqual(["Setup cancelled."])
  })

  test("cancels when the API-key save confirmation is canceled", async () => {
    state.selectValues.push("openai")
    state.confirmValues.push(true, CANCEL)

    await runSetupWizard(resolveConfig({}), state.deps)

    expect(state.cancelMessages).toEqual(["Setup cancelled."])
  })

  test("supports skipping API-key persistence for explicit providers", async () => {
    state.selectValues.push("openai")
    state.confirmValues.push(true, false, false)

    await runSetupWizard(resolveConfig({}), state.deps)

    expect(state.cancelMessages).toEqual(["Setup cancelled."])
  })

  test("cancels when the API key prompt is canceled", async () => {
    state.selectValues.push("openai")
    state.confirmValues.push(true, true)
    state.passwordValues.push(CANCEL)

    await runSetupWizard(resolveConfig({}), state.deps)

    expect(state.cancelMessages).toEqual(["Setup cancelled."])
  })

  test("cancels when the user declines persistence after selecting auto mode", async () => {
    state.selectValues.push("auto")
    state.confirmValues.push(true, false)

    await runSetupWizard(resolveConfig({}), state.deps)

    expect(state.cancelMessages).toEqual(["Setup cancelled."])
  })
})
