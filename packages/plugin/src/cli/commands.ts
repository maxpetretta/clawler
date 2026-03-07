import type { OpenClawPluginApi } from "openclaw/plugin-sdk"
import type { BetterSearchConfig } from "../config"
import type { CommandLike } from "./command-like"
import { runSetupWizard } from "./setup"
import { renderProviderStatus } from "./status"

function registerBetterSearchCommands(program: unknown, config: BetterSearchConfig): void {
  const root = program as CommandLike
  const betterSearch = root.command("better-search").description("Manage Better Search providers and setup")

  betterSearch
    .command("setup")
    .description("Interactive setup wizard")
    .action(async () => {
      await runSetupWizard(config)
    })

  betterSearch
    .command("status")
    .description("Show provider credential status")
    .action(() => {
      console.log(renderProviderStatus(config))
    })
}

export function registerBetterSearchCli(api: OpenClawPluginApi, config: BetterSearchConfig): void {
  api.registerCli(
    ({ program }) => {
      registerBetterSearchCommands(program, config)
    },
    { commands: ["better-search"] },
  )
}
