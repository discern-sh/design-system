/**
 * Pure terminal renderer and deterministic example states for Anchor heading.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { truncateText } from "../../../cli/text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
} from "../../../cli/theme.ts";
import { renderTriangleSectionRule } from "../../../cli/triangles.ts";
import type { AnchorHeadingLevel } from "./anchor-heading.types.ts";

/** Inputs accepted by the terminal Anchor heading renderer. */
export interface AnchorHeadingCliProps {
  readonly id: string;
  readonly text: string;
  readonly level?: AnchorHeadingLevel;
  readonly showTarget?: boolean;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Anchor heading states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<AnchorHeadingCliProps>[] = [
  {
    name: "section",
    props: { id: "renderer-contract", text: "Renderer contract", level: 2 },
  },
] as const;

/** Render a documentation heading as a labeled package triangle rule. */
const renderAnchorHeadingCli: CliRenderer<AnchorHeadingCliProps> = (
  props,
  capabilities,
) => {
  if (props.id.trim() === "" || props.text.trim() === "") {
    throw new TypeError("anchor heading id and text must be non-empty");
  }
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 10) {
    throw new TypeError(
      `anchor heading width must be a safe integer of at least 10; received ${requested}`,
    );
  }
  const width = Math.min(requested, capabilities.columns);
  const level = props.level ?? 2;
  const prefix = `${"#".repeat(level)} `;
  const label = `${prefix}${
    truncateText(
      props.text,
      Math.max(1, width - prefix.length - 6),
      capabilities.unicode ? "…" : ".",
    )
  }`;
  const rule = renderTriangleSectionRule(label, {
    width,
    ...(props.theme === undefined ? {} : { theme: props.theme }),
  }, capabilities);
  if (props.showTarget !== true) return rule;
  const theme = terminalThemes[props.theme ?? "dark"];
  return joinVertical([
    rule,
    styleText(`#${props.id}`, {
      ...theme.typography.annotation,
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
    }, capabilities),
  ]);
};

export default renderAnchorHeadingCli;
