/**
 * Pure terminal renderer and deterministic example states for Anchor heading.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { withCliHeadingBoundary } from "../../../cli/heading-boundary.ts";
import { joinVertical } from "../../../cli/layout.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
} from "../../../cli/theme.ts";
import {
  renderTriangleSectionRule,
  type TriangleSectionRuleTreatment,
} from "../../../cli/triangles.ts";
import type { AnchorHeadingLevel } from "./anchor-heading.types.ts";

/** Inputs accepted by the terminal Anchor heading renderer. */
export interface AnchorHeadingCliProps {
  readonly id: string;
  readonly text: string;
  readonly level?: AnchorHeadingLevel;
  readonly showTarget?: boolean;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
  /** Full-width section-boundary treatment; defaults to `embedded`. */
  readonly treatment?: TriangleSectionRuleTreatment;
  /** Blank lines owned before this heading; defaults to one. */
  readonly leadingBlankLines?: number;
}

/** Deterministic Anchor heading states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<AnchorHeadingCliProps>[] = [
  {
    name: "strong-embedded",
    props: { id: "renderer-contract", text: "Renderer contract", level: 2 },
  },
  {
    name: "strong-underline",
    props: {
      id: "renderer-contract-underline",
      text: "Renderer contract",
      level: 2,
      treatment: "underline",
    },
  },
  {
    name: "quiet-sandwich",
    props: {
      id: "renderer-contract-sandwich",
      text: "Renderer contract",
      level: 2,
      treatment: "sandwich",
    },
  },
  {
    name: "nested-boundary",
    props: {
      id: "nested-contract",
      text: "Nested contract",
      level: 3,
      leadingBlankLines: 0,
    },
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
  const label = `${prefix}${props.text}`;
  const rule = renderTriangleSectionRule(label, {
    width,
    ...(props.theme === undefined ? {} : { theme: props.theme }),
    ...(props.treatment === undefined ? {} : { treatment: props.treatment }),
  }, capabilities);
  if (props.showTarget !== true) {
    return withCliHeadingBoundary(rule, props.leadingBlankLines);
  }
  const theme = terminalThemes[props.theme ?? "dark"];
  return withCliHeadingBoundary(
    joinVertical([
      rule,
      styleText(`#${props.id}`, {
        ...theme.typography.annotation,
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      }, capabilities),
    ]),
    props.leadingBlankLines,
  );
};

export default renderAnchorHeadingCli;
