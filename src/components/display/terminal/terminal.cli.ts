/**
 * Pure terminal renderer and deterministic example states for Terminal.
 *
 * @module
 */

import { stripAnsi } from "../../../cli/ansi.ts";
import { renderBox } from "../../../cli/box.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import {
  motifPassthrough,
  type TerminalMotifOptions,
} from "../../../cli/motif.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
} from "../../../cli/theme.ts";
import { renderMotifPattern } from "../../../cli/motifs.ts";

/** Inputs accepted by the terminal Terminal renderer. */
export interface TerminalCliProps extends TerminalMotifOptions {
  readonly body: string;
  readonly title?: string;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Deterministic Terminal states rendered by `deno task catalogue:cli terminal`. */
export const cliExamples: readonly CliExample<TerminalCliProps>[] = [
  {
    name: "command",
    props: { title: "Shell", body: "$ deno task verify\nAll checks passed" },
  },
  { name: "output", props: { body: "ready on http://localhost:8010" } },
] as const;

/** Render a reverse-phase, width-bounded Terminal session frame. */
const renderTerminalCli: CliRenderer<TerminalCliProps> = (
  props,
  capabilities,
) => {
  for (const value of [props.body.replaceAll("\n", ""), props.title]) {
    if (value !== undefined && /[\p{Cc}\p{Cf}]/u.test(value)) {
      throw new TypeError("terminal content must be control-free");
    }
  }
  const requestedWidth = props.width ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 5) {
    throw new TypeError(
      `terminal width must be a safe integer of at least 5; received ${requestedWidth}`,
    );
  }
  const theme = terminalThemes[props.theme ?? "dark"];
  const motif = stripAnsi(renderMotifPattern(
    {
      length: 3,
      direction: "reverse",
      ...(props.theme === undefined ? {} : { theme: props.theme }),
      ...motifPassthrough(props),
    },
    capabilities,
  ));
  return renderBox(
    {
      body: props.body,
      title: `${motif}${
        props.title === undefined || props.title === "" ? "" : ` ${props.title}`
      }`,
      width: requestedWidth,
      padding: 1,
      borderStyle: {
        ...theme.typography.muted,
        color: terminalThemeColor(theme, "--discern-color-border-strong"),
      },
    },
    capabilities,
  );
};

export default renderTerminalCli;
