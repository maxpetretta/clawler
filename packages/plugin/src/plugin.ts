import type { OpenClawPluginApi, OpenClawPluginDefinition } from "openclaw/plugin-sdk"
import { registerClawlerCli } from "./cli/commands"
import { clawlerConfigSchema, resolveConfig } from "./config"
import { createClawlerTool } from "./tool"

const clawlerPlugin: OpenClawPluginDefinition = {
  id: "clawler",
  name: "Clawler",
  description: "Crawl the web. Fast.",
  kind: "tool",
  configSchema: clawlerConfigSchema,
  register(api: OpenClawPluginApi) {
    const config = resolveConfig(api.pluginConfig)

    registerClawlerCli(api, config)

    api.registerTool(() => createClawlerTool(config), { names: [config.toolName] })
  },
}

export default clawlerPlugin
