/**
 * Pure terminal renderer and deterministic example states for Heading.
 *
 * @module
 */

import { renderStyledSpans } from "../../../cli/ansi.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { withCliHeadingBoundary } from "../../../cli/heading-boundary.ts";
import { measureText, truncateText } from "../../../cli/text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import type { HeadingLevel } from "./heading.types.ts";

/** Inputs accepted by the terminal Heading renderer. */
export interface HeadingCliProps {
  readonly text: string;
  readonly accent?: string;
  readonly level?: HeadingLevel;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
  /** Blank lines owned before this heading; defaults to one. */
  readonly leadingBlankLines?: number;
}

/** Deterministic Heading states rendered by `deno task catalogue:cli heading`. */
export const cliExamples: readonly CliExample<HeadingCliProps>[] = [
  { name: "primary", props: { text: "Build with confidence", level: 1 } },
  { name: "accent", props: { text: "Rules that", accent: "travel", level: 2 } },
  { name: "minor", props: { text: "Implementation notes", level: 4 } },
  {
    name: "nested-boundary",
    props: { text: "Nested section", level: 3, leadingBlankLines: 0 },
  },
] as const;

/** Render one semantic terminal heading with an optional accent segment. */
const renderHeadingCli: CliRenderer<HeadingCliProps> = (
  props,
  capabilities,
) => {
  for (const value of [props.text, props.accent]) {
    if (value !== undefined && /[\p{Cc}\p{Cf}]/u.test(value)) {
      throw new TypeError("heading content must be control-free");
    }
  }
  if (props.text === "") throw new TypeError("heading text must be non-empty");
  const requestedWidth = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 3) {
    throw new TypeError(
      `heading width must be a safe integer of at least 3; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  const level = props.level ?? 2;
  const prefix = `${"#".repeat(level)} `;
  const contentWidth = Math.max(1, width - measureText(prefix));
  const accent = props.accent === undefined || props.accent === ""
    ? ""
    : ` ${props.accent}`;
  const visibleAccent = truncateText(
    accent,
    contentWidth,
    capabilities.unicode ? "…" : ".",
  );
  const textWidth = Math.max(0, contentWidth - measureText(visibleAccent));
  const text = truncateText(
    props.text,
    textWidth,
    capabilities.unicode ? "…" : ".",
  );
  const theme = terminalThemes[props.theme ?? "dark"];
  const heading = renderStyledSpans([
    {
      text: prefix,
      style: {
        ...theme.typography.muted,
        color: terminalThemeColor(theme, "--discern-color-ink-faint"),
      },
    },
    { text, style: theme.typography.display },
    ...(visibleAccent === "" ? [] : [{
      text: visibleAccent,
      style: {
        ...theme.typography.emphasis,
        color: terminalToneColor(theme, "accent"),
      },
    }]),
  ], capabilities);
  return withCliHeadingBoundary(heading, props.leadingBlankLines);
};

export default renderHeadingCli;
