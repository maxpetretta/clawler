import type { BetterSearchConfig } from "../config"
import { listProviderStatuses } from "../providers/registry"

export function renderProviderStatus(config: BetterSearchConfig): string {
  const lines = listProviderStatuses(config).map((status) => {
    const availability = status.available ? "available" : "missing"
    return `${status.id.padEnd(12)} ${availability.padEnd(10)} ${status.source.padEnd(7)} ${status.envVars.join(", ")}`
  })

  return ["Provider      Status     Source  Credentials", ...lines].join("\n")
}
