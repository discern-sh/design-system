/**
 * Terminal-fact banner printed at every review boundary so manual
 * observations carry the columns, rows, and capability context needed to
 * reproduce them.
 *
 * @module
 */

import type { TerminalCapabilities } from "../../src/cli/mod.ts";
import type { TerminalIO } from "../../src/cli/interactive/mod.ts";

/** Describe one capability set as a single reproducibility line. */
export function describeCapabilities(
  capabilities: TerminalCapabilities,
  rows?: number,
): string {
  const separator = capabilities.unicode ? " · " : " | ";
  const facts = [
    `columns ${capabilities.columns}`,
    ...(rows === undefined ? [] : [`rows ${rows}`]),
    `unicode ${capabilities.unicode ? "yes" : "no"}`,
    `colour ${capabilities.colorDepth}`,
    `ansi-control ${
      capabilities.ansiControl === undefined
        ? "assumed"
        : capabilities.ansiControl
        ? "yes"
        : "no"
    }`,
  ];
  return facts.join(separator);
}

/** Current terminal facts for the given interactive terminal. */
export function renderTerminalFacts(io: TerminalIO): string {
  return `Terminal: ${describeCapabilities(io.capabilities(), io.size().rows)}`;
}
