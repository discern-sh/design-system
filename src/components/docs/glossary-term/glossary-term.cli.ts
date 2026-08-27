/**
 * Pure terminal renderer and deterministic example states for Glossary term.
 *
 * @module
 */

import { renderStyledSpans } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { measureText, truncateText, wrapText } from "../../../cli/text.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./glossary-term.meta.ts";

/** Inputs accepted by the terminal Glossary term renderer. */
export interface GlossaryTermCliProps {
  readonly term: string;
  readonly definition: string;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

const cliExampleImplementations = [{
  name: "default",
  props: {
    term: "reading measure",
    definition:
      "A line-length boundary that keeps continuous prose comfortable to scan.",
  },
}] as const satisfies readonly CliExample<GlossaryTermCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Glossary term states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<GlossaryTermCliProps>[] =
  cliExampleImplementations;

/** Render a marked term followed by its always-visible terminal definition. */
const renderGlossaryTermCli: CliRenderer<GlossaryTermCliProps> = (
  props,
  capabilities,
) => {
  if (props.term.trim() === "" || props.definition.trim() === "") {
    throw new TypeError("glossary term and definition must be non-empty");
  }
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 8) {
    throw new TypeError(
      `glossary term width must be a safe integer of at least 8; received ${requested}`,
    );
  }
  const width = Math.min(requested, capabilities.columns);
  const term = truncateText(
    props.term,
    Math.max(1, Math.floor(width / 2)),
    capabilities.unicode ? "…" : ".",
  );
  const separator = capabilities.unicode ? " — " : " - ";
  const prefixWidth = measureText(term) + measureText(separator);
  const definition = wrapText(
    props.definition,
    Math.max(1, width - prefixWidth),
  );
  const theme = terminalThemes[props.theme ?? "dark"];
  const first = renderStyledSpans([
    {
      text: term,
      style: {
        ...theme.typography.strong,
        color: terminalToneColor(theme, "accent"),
        underline: true,
      },
    },
    { text: separator },
    { text: definition[0] ?? "" },
  ], capabilities);
  const continuation = definition.slice(1).map((line) =>
    `${" ".repeat(prefixWidth)}${line}`
  );
  return [first, ...continuation].join("\n");
};

export default renderGlossaryTermCli;
