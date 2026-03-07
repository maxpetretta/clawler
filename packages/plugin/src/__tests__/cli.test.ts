import { describe, expect, test } from "bun:test"
import { registerClawlerCli } from "../cli/commands"
import { renderProviderStatus } from "../cli/status"
import { resolveConfig } from "../config"

type FakeCommandNode = {
  name: string
  descriptionText?: string
  actionHandler?: (...args: unknown[]) => unknown
  children: FakeCommandNode[]
}

function createCommandNode(name: string): FakeCommandNode {
  return {
    name,
    children: [],
  }
}

function commandLike(node: FakeCommandNode) {
  return {
    command(name: string) {
      const child = createCommandNode(name)
      node.children.push(child)
      return commandLike(child)
    },
    description(text: string) {
      node.descriptionText = text
      return commandLike(node)
    },
    argument() {
      return commandLike(node)
    },
    option() {
      return commandLike(node)
    },
    action(handler: (...args: unknown[]) => unknown) {
      node.actionHandler = handler
      return commandLike(node)
    },
  }
}

describe("CLI helpers", () => {
  test("renders provider status table", () => {
    const output = renderProviderStatus(resolveConfig({ exa: { apiKey: "key" } }))
    expect(output).toContain("Provider      Status     Source  Credentials")
    expect(output).toContain("exa")
    expect(output).toContain("available")
  })

  test("registers setup and status commands", () => {
    const root = createCommandNode("root")
    const registerCliCalls: Array<{ commands?: string[] }> = []
    const api = {
      registerCli(handler: ({ program }: { program: unknown }) => void, meta: { commands?: string[] }) {
        registerCliCalls.push(meta)
        handler({ program: commandLike(root) })
      },
    }

    registerClawlerCli(api as never, resolveConfig({}))

    expect(registerCliCalls).toEqual([{ commands: ["clawler"] }])
    expect(root.children.map((child) => child.name)).toEqual(["clawler"])
    expect(root.children[0]?.children.map((child) => child.name)).toEqual(["setup", "status"])
  })
})
