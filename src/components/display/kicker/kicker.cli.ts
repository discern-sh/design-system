/**
 * Pure terminal renderer and deterministic example states for Kicker.
 *
 * @module
 */

import { renderStyledSpans } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { measureText, truncateText } from "../../../cli/text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./kicker.meta.ts";

/** Inputs accepted by the terminal Kicker renderer. */
export interface KickerCliProps {
  readonly text: string;
  readonly index?: string;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Kicker states rendered by `deno task catalogue:cli kicker`. */
export const cliExamples = defineCliExamples(
  meta,
  componentExampleVocabulary,
  [
    { name: "default", props: { text: "Foundations" } },
    { name: "indexed", props: { text: "Working agreement", index: "02" } },
  ] as const satisfies readonly CliExample<KickerCliProps>[],
);

/** Render an uppercase terminal annotation label with optional index. */
const renderKickerCli: CliRenderer<KickerCliProps> = (
  props,
  capabilities,
) => {
  for (const value of [props.text, props.index]) {
    if (value !== undefined && /[\p{Cc}\p{Cf}]/u.test(value)) {
      throw new TypeError("kicker content must be control-free");
    }
  }
  if (props.text === "") throw new TypeError("kicker text must be non-empty");
  const requestedWidth = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 1) {
    throw new TypeError(
      `kicker width must be a positive safe integer; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  const prefix = props.index === undefined || props.index === ""
    ? ""
    : `[${props.index}] `;
  const text = truncateText(
    props.text.toUpperCase(),
    Math.max(0, width - measureText(prefix)),
    capabilities.unicode ? "…" : ".",
  );
  const theme = terminalThemes[props.theme ?? "dark"];
  return renderStyledSpans([
    ...(prefix === "" ? [] : [{
      text: prefix,
      style: {
        ...theme.typography.strong,
        color: terminalToneColor(theme, "accent"),
      },
    }]),
    {
      text,
      style: {
        ...theme.typography.muted,
        color: terminalThemeColor(theme, "--discern-color-ink-faint"),
      },
    },
  ], capabilities);
};

export default renderKickerCli;
