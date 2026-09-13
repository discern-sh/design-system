import type { AgentStatus } from "../agent-avatar/agent-avatar.types.ts";

/** Visible operational status, retaining the existing done vocabulary. */
export function fleetStatusLabel(status: AgentStatus): string {
  return status === "done"
    ? "Complete"
    : status[0]!.toUpperCase() + status.slice(1);
}
