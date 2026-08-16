/**
 * Pure terminal renderer and deterministic example states for Code block.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { graphemeWidth, measureText } from "../../../cli/text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
} from "../../../cli/theme.ts";

/** Width behavior for preformatted source in a terminal. */
export type CodeBlockWidthPolicy = "wrap" | "preserve";

/** Inputs accepted by the terminal Code block renderer. */
export interface CodeBlockCliProps {
  /** Literal source text. Newlines and tabs retain preformatted meaning. */
  readonly code: string;
  /** Optional source-language label. */
  readonly language?: string;
  /** Optional parser information shown beside the language label. */
  readonly info?: string;
  /** Wrap losslessly to the requested measure or preserve source-line width. */
  readonly widthPolicy?: CodeBlockWidthPolicy;
  /** Terminal Theme variant; defaults to dark. */
  readonly theme?: TerminalThemeVariant;
  /** Available measure in cells, bounded by terminal columns. */
  readonly maxWidth?: number;
}

/** Deterministic Code block states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<CodeBlockCliProps>[] = [
  {
    name: "typescript",
    props: {
      language: "ts",
      info: "module",
      code:
        "const values = [2, 3, 5];\nconst total = values.reduce((sum, value) => sum + value, 0);",
    },
  },
  {
    name: "preserved-width",
    props: {
      language: "text",
      code: "one uninterrupted source line remains copyable",
      widthPolicy: "preserve",
    },
  },
] as const;

const graphemeSegmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});

function graphemes(value: string): readonly string[] {
  return [...graphemeSegmenter.segment(value)].map((part) => part.segment);
}

function assertLabel(value: unknown, name: "language" | "info"): void {
  if (
    typeof value !== "string" || value === "" || value.trim() !== value ||
    /[\p{Cc}\p{Cf}]/u.test(value)
  ) {
    throw new TypeError(
      `code block ${name} must be non-empty, trimmed, and control-free`,
    );
  }
}

function visibleControl(character: string): string {
  const codePoint = character.codePointAt(0);
  if (codePoint === undefined) return "";
  return `\\u{${codePoint.toString(16).toUpperCase()}}`;
}

function makeControlsVisible(code: string): string {
  return code.replace(
    /[\p{Cc}\p{Cf}]/gu,
    (character) =>
      character === "\n" || character === "\t"
        ? character
        : visibleControl(character),
  );
}

/** Expand tabs relative to the source line, independently of the frame rail. */
function expandTabs(line: string): string {
  const parts = line.split("\t");
  let expanded = "";
  for (const [index, part] of parts.entries()) {
    expanded += part;
    if (index < parts.length - 1) {
      expanded += " ".repeat(4 - measureText(expanded) % 4);
    }
  }
  return expanded;
}

function hardWrap(line: string, columns: number): readonly string[] {
  if (line === "") return [""];
  const wrapped: string[] = [];
  let current = "";
  let width = 0;
  for (const grapheme of graphemes(line)) {
    const nextWidth = graphemeWidth(grapheme);
    if (current !== "" && width + nextWidth > columns) {
      wrapped.push(current);
      current = "";
      width = 0;
    }
    current += grapheme;
    width += nextWidth;
  }
  if (current !== "") wrapped.push(current);
  return wrapped;
}

/** Render literal source without trimming, numbering, executing, or truncating it. */
const renderCodeBlockCli: CliRenderer<CodeBlockCliProps> = (
  props,
  capabilities,
) => {
  if (typeof props.code !== "string") {
    throw new TypeError("code block code must be a string");
  }
  if (props.language !== undefined) assertLabel(props.language, "language");
  if (props.info !== undefined) assertLabel(props.info, "info");
  const widthPolicy = props.widthPolicy ?? "wrap";
  if (widthPolicy !== "wrap" && widthPolicy !== "preserve") {
    throw new TypeError(`unknown code block width policy: ${widthPolicy}`);
  }
  if (props.theme !== undefined && !(props.theme in terminalThemes)) {
    throw new TypeError(`unknown code block theme: ${props.theme}`);
  }
  const requestedWidth = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 4) {
    throw new TypeError(
      `code block width must be a safe integer of at least 4; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  if (width < 4) {
    throw new TypeError(
      `code block width must be a safe integer of at least 4; received ${width}`,
    );
  }

  const theme = terminalThemes[props.theme ?? "dark"];
  const railStyle = {
    ...theme.typography.muted,
    color: terminalThemeColor(theme, "--discern-color-ink-faint"),
  };
  const codeStyle = {
    color: terminalThemeColor(theme, "--discern-color-ink"),
  };
  const labelStyle = {
    ...theme.typography.annotation,
    color: terminalThemeColor(theme, "--discern-color-ink-muted"),
  };
  const rail = capabilities.unicode ? "│" : "|";
  const continuation = capabilities.unicode ? "›" : ">";
  const contentWidth = width - 2;
  const safeLines = makeControlsVisible(props.code).split("\n").map(expandTabs);
  const renderedLines = safeLines.flatMap((line) => {
    const chunks = widthPolicy === "preserve"
      ? [line]
      : hardWrap(line, contentWidth);
    return chunks.map((chunk, index) => {
      const marker = index === 0 ? rail : continuation;
      const prefix = styleText(marker, railStyle, capabilities);
      return chunk === ""
        ? prefix
        : `${prefix} ${styleText(chunk, codeStyle, capabilities)}`;
    });
  });

  const label = props.language === undefined
    ? props.info
    : props.info === undefined
    ? `[${props.language}]`
    : `[${props.language}] ${props.info}`;
  if (label === undefined) return renderedLines.join("\n");
  const labelLines = hardWrap(label, width).map((line) =>
    styleText(line, labelStyle, capabilities)
  );
  return [...labelLines, ...renderedLines].join("\n");
};

export default renderCodeBlockCli;
