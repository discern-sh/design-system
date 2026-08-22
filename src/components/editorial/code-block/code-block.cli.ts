/**
 * Pure terminal renderer and deterministic example states for Code block.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { graphemeWidth, measureText, truncateText } from "../../../cli/text.ts";
import { makeSourceControlsVisible } from "../../../cli/visible-text.ts";
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

/** Render literal source inside a specimen frame without truncating it. */
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
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 5) {
    throw new TypeError(
      `code block width must be a safe integer of at least 5; received ${requestedWidth}`,
    );
  }
  const boundedWidth = Math.min(requestedWidth, capabilities.columns);
  if (boundedWidth < 5) {
    throw new TypeError(
      `code block width must be a safe integer of at least 5; received ${boundedWidth}`,
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
  const glyphs = capabilities.unicode
    ? {
      topLeft: "╭",
      topRight: "╮",
      bottomLeft: "╰",
      bottomRight: "╯",
      horizontal: "─",
      vertical: "│",
    }
    : {
      topLeft: "+",
      topRight: "+",
      bottomLeft: "+",
      bottomRight: "+",
      horizontal: "-",
      vertical: "|",
    };
  const safeLines = makeSourceControlsVisible(props.code, {
    preserveLineFeeds: true,
    preserveTabs: true,
  }).split("\n").map(expandTabs);
  const label = props.language === undefined
    ? props.info
    : props.info === undefined
    ? props.language
    : `${props.language}${capabilities.unicode ? " · " : " - "}${props.info}`;
  const preservedSourceWidth = Math.max(
    1,
    ...safeLines.map((line) => measureText(line)),
  );
  const frameWidth = widthPolicy === "preserve"
    ? Math.max(
      boundedWidth,
      preservedSourceWidth + 3,
      label === undefined ? 0 : measureText(label) + 5,
    )
    : boundedWidth;
  const contentWidth = frameWidth - 3;
  const renderedLines = safeLines.flatMap((line) => {
    const chunks = widthPolicy === "preserve"
      ? [line]
      : hardWrap(line, contentWidth);
    return chunks.map((chunk, index) => {
      const marker = index === 0 ? " " : capabilities.unicode ? "›" : ">";
      const markerText = marker === " "
        ? marker
        : styleText(marker, railStyle, capabilities);
      const padding = " ".repeat(contentWidth - measureText(chunk));
      return `${
        styleText(glyphs.vertical, railStyle, capabilities)
      }${markerText}${styleText(chunk, codeStyle, capabilities)}${padding}${
        styleText(glyphs.vertical, railStyle, capabilities)
      }`;
    });
  });
  const titleCapacity = Math.max(0, frameWidth - 5);
  const visibleLabel = label === undefined || titleCapacity === 0
    ? ""
    : truncateText(
      label,
      titleCapacity,
      capabilities.unicode ? "…" : ".",
    );
  const border = (value: string): string =>
    styleText(value, railStyle, capabilities);
  const top = visibleLabel === ""
    ? border(
      `${glyphs.topLeft}${
        glyphs.horizontal.repeat(frameWidth - 2)
      }${glyphs.topRight}`,
    )
    : `${border(`${glyphs.topLeft}${glyphs.horizontal} `)}${
      styleText(visibleLabel, labelStyle, capabilities)
    }${
      border(
        ` ${
          glyphs.horizontal.repeat(frameWidth - 5 - measureText(visibleLabel))
        }${glyphs.topRight}`,
      )
    }`;
  const bottom = border(
    `${glyphs.bottomLeft}${
      glyphs.horizontal.repeat(frameWidth - 2)
    }${glyphs.bottomRight}`,
  );
  return [top, ...renderedLines, bottom].join("\n");
};

export default renderCodeBlockCli;
