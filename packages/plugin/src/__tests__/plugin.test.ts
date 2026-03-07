import { describe, expect, test } from "bun:test"
import plugin from "../plugin"

describe("plugin definition", () => {
  test("registers CLI and tool with configured name", () => {
    const cliCalls: Array<{ commands?: string[] }> = []
    const toolCalls: Array<{ names: string[] }> = []
    plugin.register({
      pluginConfig: {
        toolName: "custom_search",
      },
      registerCli(_handler: unknown, meta: { commands?: string[] }) {
        cliCalls.push(meta)
      },
      registerTool(factory: () => { name: string }, meta: { names: string[] }) {
        toolCalls.push(meta)
        expect(factory().name).toBe("custom_search")
      },
    } as never)

    expect(plugin.id).toBe("better-search")
    expect(cliCalls).toEqual([{ commands: ["better-search"] }])
    expect(toolCalls).toEqual([{ names: ["custom_search"] }])
    expect(plugin.configSchema).toBeDefined()
  })
})
