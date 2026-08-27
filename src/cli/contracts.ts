/**
 * Shared contracts for pure component CLI renderers and their example frames.
 *
 * @module
 */

import type { TerminalCapabilities } from "./capabilities.ts";
import type { TerminalMotifOptions } from "./motif.ts";
import type { TerminalThemeVariant } from "./theme.ts";

/** Theme and motif defaults that can be bound across pure CLI renderers. */
export interface CliPresentationOptions extends TerminalMotifOptions {
  readonly theme?: TerminalThemeVariant;
}

/** Pure renderer signature implemented by every rendered CLI component. */
export type CliRenderer<Props> = (
  props: Readonly<Props>,
  capabilities: TerminalCapabilities,
) => string;

/** One named, deterministic input frame shown by the CLI catalogue loop. */
export interface CliExample<Props, Name extends string = string> {
  readonly name: Name;
  readonly props: Readonly<Props>;
  /** Optional deterministic posture replacing selected Catalogue capabilities. */
  readonly capabilities?: Readonly<Partial<TerminalCapabilities>>;
}

/**
 * Resolve one named example's optional posture against the reviewing terminal.
 */
export function resolveCliExampleCapabilities<
  Example extends {
    readonly capabilities?: Readonly<Partial<TerminalCapabilities>>;
  },
>(
  example: Example,
  capabilities: TerminalCapabilities,
): TerminalCapabilities {
  const resolved = example.capabilities === undefined
    ? capabilities
    : { ...capabilities, ...example.capabilities };
  if (
    ![undefined, true, false].includes(resolved.ansiControl) ||
    !["none", "ansi16", "ansi256", "truecolor"].includes(
      resolved.colorDepth,
    ) ||
    !Number.isSafeInteger(resolved.columns) ||
    resolved.columns < 1 ||
    ![undefined, true, false].includes(resolved.hyperlinks) ||
    ![undefined, true, false].includes(resolved.mouseTracking) ||
    typeof resolved.unicode !== "boolean"
  ) {
    throw new TypeError(
      "CLI example capabilities must be valid terminal facts",
    );
  }
  return resolved;
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
  | CliExemptRegistryEntry
  | CliRenderedRegistryEntry;
