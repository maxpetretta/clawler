import type { OpenClawPluginApi, OpenClawPluginDefinition } from "openclaw/plugin-sdk"
import { registerBetterSearchCli } from "./cli/commands"
import { betterSearchConfigSchema, resolveConfig } from "./config"
import { createBetterSearchTool } from "./tool"

const betterSearchPlugin: OpenClawPluginDefinition = {
  id: "better-search",
  name: "Better Search",
  description: "Unified search providers for OpenClaw",
  kind: "tool",
  configSchema: betterSearchConfigSchema,
  register(api: OpenClawPluginApi) {
    const config = resolveConfig(api.pluginConfig)

    registerBetterSearchCli(api, config)

    api.registerTool(() => createBetterSearchTool(config), { names: [config.toolName] })
  },
}

export default betterSearchPlugin
