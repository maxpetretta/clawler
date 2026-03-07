export type CommandAction = (...args: unknown[]) => unknown

export type CommandLike = {
  command(name: string): CommandLike
  description(text: string): CommandLike
  argument(name: string, description?: string): CommandLike
  option(flags: string, description?: string): CommandLike
  action(handler: CommandAction): CommandLike
}
