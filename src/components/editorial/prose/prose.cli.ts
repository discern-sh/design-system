/**
 * Pure terminal renderer and deterministic example states for Prose.
 *
 * @module
 */

import { renderStyledSpans, styleText } from "../../../cli/ansi.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { wrapText } from "../../../cli/text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
} from "../../../cli/theme.ts";
import type { ProseMeasure } from "./prose.types.ts";

/** Inputs accepted by the terminal Prose renderer. */
export interface ProseCliProps {
  readonly text: string;
  readonly dropCap?: boolean;
  readonly lead?: boolean;
  readonly measure?: ProseMeasure;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Prose states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<ProseCliProps>[] = [
  {
    name: "lead",
    props: {
      text:
        "Good long-form design gives the first paragraph enough presence to open the argument.\n\nThe rest settles into a calm reading measure.",
      lead: true,
      dropCap: true,
    },
  },
] as const;

const MEASURE_COLUMNS: Readonly<Record<ProseMeasure, number>> = {
  narrow: 48,
  default: 68,
  wide: 88,
};

/** Render plain prose at a comfortable, capability-bounded reading measure. */
const renderProseCli: CliRenderer<ProseCliProps> = (props, capabilities) => {
  if (props.text.trim() === "") {
    throw new TypeError("prose text must be non-empty");
  }
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 1) {
    throw new TypeError(
      `prose width must be a positive safe integer; received ${requested}`,
    );
  }
  const measure = props.measure ?? "default";
  const width = Math.min(
    requested,
    capabilities.columns,
    MEASURE_COLUMNS[measure],
  );
  const lines = wrapText(props.text, width);
  const theme = terminalThemes[props.theme ?? "dark"];
  if (lines.length === 0) return "";
  const first = lines[0] ?? "";
  const renderedFirst = props.dropCap === true && first !== ""
    ? renderStyledSpans([
      {
        text: first[0]?.toLocaleUpperCase() ?? "",
        style: {
          ...theme.typography.display,
          color: terminalThemeColor(theme, "--discern-color-accent-700"),
        },
      },
      {
        text: first.slice(1),
        ...(props.lead === true ? { style: theme.typography.emphasis } : {}),
      },
    ], capabilities)
    : props.lead === true
    ? styleText(first, theme.typography.emphasis, capabilities)
    : first;
  return [renderedFirst, ...lines.slice(1)].join("\n");
};

export default renderProseCli;
