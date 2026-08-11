/**
 * Shared contracts for pure component CLI renderers and their example frames.
 *
 * @module
 */

import type { TerminalCapabilities } from "./capabilities.ts";

/** Pure renderer signature implemented by every rendered CLI component. */
export type CliRenderer<Props> = (
  props: Readonly<Props>,
  capabilities: TerminalCapabilities,
) => string;

/** One named, deterministic input frame shown by the CLI catalogue loop. */
export interface CliExample<Props> {
  readonly name: string;
  readonly props: Readonly<Props>;
}

/** Generated registry entry for a component whose CLI stance is not decided. */
export interface CliPendingRegistryEntry {
  readonly stance: "pending";
}

/** Generated registry entry for a component intentionally absent from CLI. */
export interface CliExemptRegistryEntry {
  readonly stance: "exempt";
  readonly reason: string;
}

/** Generated registry entry for a component with a pure CLI renderer module. */
export interface CliRenderedRegistryEntry {
  readonly stance: "rendered";
  readonly modulePath: `../components/${string}.cli.ts`;
}

/** One generated per-component CLI stance. */
export type CliComponentRegistryEntry =
  | CliPendingRegistryEntry
  | CliExemptRegistryEntry
  | CliRenderedRegistryEntry;
