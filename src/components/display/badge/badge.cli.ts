/**
 * Pure terminal renderer and deterministic example states for Badge.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { measureText, truncateText } from "../../../cli/text.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import type { BadgeTone } from "./badge.types.ts";

/** Inputs accepted by the terminal Badge renderer. */
export interface BadgeCliProps {
  readonly label: string;
  readonly tone?: BadgeTone;
  readonly dot?: boolean;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Badge states rendered by `deno task catalogue:cli badge`. */
export const cliExamples: readonly CliExample<BadgeCliProps>[] = [
  { name: "accent", props: { label: "Active", dot: true } },
  { name: "neutral", props: { label: "Queued", tone: "neutral" } },
  { name: "success", props: { label: "Passed", tone: "success", dot: true } },
  { name: "warning", props: { label: "Review", tone: "warning", dot: true } },
  { name: "danger", props: { label: "Failed", tone: "danger", dot: true } },
] as const;

/** Render one width-bounded terminal Badge with semantic Token-derived colour. */
const renderBadgeCli: CliRenderer<BadgeCliProps> = (
  props,
  capabilities,
) => {
  if (props.label === "" || /[\p{Cc}\p{Cf}]/u.test(props.label)) {
    throw new TypeError("badge label must be non-empty and control-free");
  }
  const requestedWidth = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 3) {
    throw new TypeError(
      `badge width must be a safe integer of at least 3; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  if (width < 3) {
    throw new TypeError(
      `terminal width ${capabilities.columns} cannot hold a badge`,
    );
  }
  const prefix = props.dot === true
    ? `${capabilities.unicode ? "●" : "*"} `
    : "";
  const labelWidth = width - 2 - measureText(prefix);
  if (labelWidth < 1) {
    throw new TypeError(
      `badge width ${width} cannot hold its requested marker`,
    );
  }
  const label = truncateText(
    props.label,
    labelWidth,
    capabilities.unicode ? "…" : ".",
  );
  const theme = terminalThemes[props.theme ?? "dark"];
  const frame = `[${prefix}${label}]`;
  return styleText(
    frame,
    {
      ...theme.typography.strong,
      color: terminalToneColor(theme, props.tone ?? "accent"),
    },
    capabilities,
  );
};

export default renderBadgeCli;
