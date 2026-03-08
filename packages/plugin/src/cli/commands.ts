import type { OpenClawPluginApi } from "openclaw/plugin-sdk"
import type { ClawlerConfig } from "../config"
import type { CommandLike } from "./command-like"
import { runSetupWizard } from "./setup"
import { renderProviderStatus } from "./status"

function registerClawlerCommands(program: unknown, config: ClawlerConfig): void {
  const root = program as CommandLike
  const clawler = root.command("clawler").description("Better web search for your Claw.")

  clawler
    .command("setup")
    .description("Interactive setup wizard")
    .action(async () => {
      await runSetupWizard(config)
    })

  clawler
    .command("status")
    .description("Show provider credential status")
    .action(() => {
      console.log(renderProviderStatus(config))
    })
}

export function registerClawlerCli(api: OpenClawPluginApi, config: ClawlerConfig): void {
  api.registerCli(
    ({ program }) => {
      registerClawlerCommands(program, config)
    },
    { commands: ["clawler"] },
  )
}
