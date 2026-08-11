/**
 * Pure terminal renderer and deterministic example states for Code listing.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { TerminalCapabilities } from "../../../cli/capabilities.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import {
  measureText,
  padText,
  truncateText,
  wrapText,
} from "../../../cli/text.ts";
import {
  type TerminalColor,
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
} from "../../../cli/theme.ts";

/** Inputs accepted by the terminal Code listing renderer. */
export interface CodeListingCliProps {
  readonly title?: string;
  readonly filename?: string;
  readonly language?: string;
  readonly code: string;
  readonly highlightLines?: readonly number[];
  readonly caption?: string;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Code listing states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<CodeListingCliProps>[] = [
  {
    name: "typescript",
    props: {
      filename: "brief.ts",
      language: "ts",
      code: 'const brief = {\n  scope: "editorial",\n  status: "ready",\n};',
      highlightLines: [2],
      caption: "A small, deterministic input.",
    },
  },
] as const;

function renderListingFrame(
  lines: readonly string[],
  title: string,
  width: number,
  borderColor: TerminalColor,
  capabilities: TerminalCapabilities,
): string {
  const glyphs = capabilities.unicode
    ? {
      topLeft: "┌",
      topRight: "┐",
      bottomLeft: "└",
      bottomRight: "┘",
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
  const framedTitle = title === "" ? "" : ` ${
    truncateText(
      title,
      Math.max(0, width - 6),
      capabilities.unicode ? "…" : ".",
    )
  } `;
  const border = (value: string): string =>
    styleText(value, { color: borderColor }, capabilities);
  const top = `${border(glyphs.topLeft)}${border(framedTitle)}${
    border(glyphs.horizontal.repeat(width - 2 - measureText(framedTitle)))
  }${border(glyphs.topRight)}`;
  const innerWidth = width - 4;
  const content = lines.map((line) =>
    `${border(glyphs.vertical)} ${padText(line, innerWidth)} ${
      border(glyphs.vertical)
    }`
  );
  const bottom = border(
    `${glyphs.bottomLeft}${
      glyphs.horizontal.repeat(width - 2)
    }${glyphs.bottomRight}`,
  );
  return [top, ...content, bottom].join("\n");
}

/** Render one line-numbered, width-bounded source listing without highlighting. */
const renderCodeListingCli: CliRenderer<CodeListingCliProps> = (
  props,
  capabilities,
) => {
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 9) {
    throw new TypeError(
      `code listing width must be a safe integer of at least 9; received ${requested}`,
    );
  }
  const width = Math.min(requested, capabilities.columns);
  const rawLines = props.code.trimEnd().split("\n");
  const lines = rawLines.length === 0 ? [""] : rawLines;
  const digits = String(lines.length).length;
  const innerWidth = width - 4;
  const prefixWidth = digits + 2;
  const marker = capabilities.unicode ? "›" : ">";
  const highlighted = new Set(props.highlightLines ?? []);
  const body = lines.map((line, index) => {
    const number = index + 1;
    const prefix = `${highlighted.has(number) ? marker : " "}${
      String(number).padStart(digits)
    } `;
    const code = truncateText(
      line.replaceAll("\t", "  "),
      Math.max(1, innerWidth - prefixWidth),
      capabilities.unicode ? "…" : ".",
    );
    return `${prefix}${code}`;
  }).join("\n");
  const context = props.filename ?? props.title;
  const title = [
    context,
    props.language === undefined ? undefined : `[${props.language}]`,
  ]
    .filter((value): value is string => value !== undefined)
    .join(" ");
  const theme = terminalThemes[props.theme ?? "dark"];
  const frame = renderListingFrame(
    body.split("\n"),
    title,
    width,
    terminalThemeColor(theme, "--discern-color-ink-faint"),
    capabilities,
  );
  if (props.caption === undefined) return frame;
  return joinVertical([
    frame,
    styleText(
      wrapText(`Caption: ${props.caption}`, width).join("\n"),
      {
        ...theme.typography.annotation,
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      },
      capabilities,
    ),
  ]);
};

export default renderCodeListingCli;
