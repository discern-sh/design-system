/**
 * Pure terminal renderer and deterministic example states for Cluster.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { wrapInlineCluster } from "../../../cli/layout.ts";
import { padText } from "../../../cli/text.ts";
import {
  type TerminalSpacingTokenName,
  terminalThemes,
  type TerminalThemeVariant,
} from "../../../cli/theme.ts";
import type { SpaceStep } from "../space.ts";
import type { ClusterAlign, ClusterJustify } from "./cluster.types.ts";

/** Inputs accepted by the terminal Cluster renderer. */
export interface ClusterCliProps {
  readonly items: readonly string[];
  readonly gap?: SpaceStep;
  readonly align?: ClusterAlign;
  readonly justify?: ClusterJustify;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Deterministic Cluster states rendered by `deno task catalogue:cli cluster`. */
export const cliExamples: readonly CliExample<ClusterCliProps>[] = [
  {
    name: "actions",
    props: { items: ["Save", "Preview", "Cancel"], width: 24 },
  },
  {
    name: "centred",
    props: { items: ["One", "Two", "Three"], justify: "center", width: 20 },
  },
] as const;

/** Wrap terminal items using the foundation Cluster combinator and Token gap. */
const renderClusterCli: CliRenderer<ClusterCliProps> = (
  props,
  capabilities,
) => {
  if (props.items.some((item) => item === "" || /[\p{Cc}\p{Cf}]/u.test(item))) {
    throw new TypeError("cluster items must be non-empty and control-free");
  }
  const requestedWidth = props.width ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 1) {
    throw new TypeError(
      `cluster width must be a positive safe integer; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  const step = props.gap ?? 3;
  const gap = step === 0 ? 0 : terminalThemes[props.theme ?? "dark"].spacing[
    `--discern-space-${step}` as TerminalSpacingTokenName
  ] ?? 1;
  const wrapped = wrapInlineCluster(props.items, { columns: width, gap });
  const justify = props.justify ?? "start";
  if (justify === "start" || justify === "between") return wrapped;
  return wrapped.split("\n").map((line) =>
    padText(line, width, justify === "center" ? "center" : "end").trimEnd()
  ).join("\n");
};

export default renderClusterCli;
