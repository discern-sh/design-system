/**
 * Capability-aware Unicode and ASCII terminal box drawing, and the one
 * authority for frame glyphs.
 *
 * @module
 */

import type { TerminalCapabilities } from "./capabilities.ts";
import { styleText, type TerminalTextStyle } from "./ansi.ts";
import {
  fillStyledLine,
  measureText,
  padText,
  type TerminalAlignment,
  truncateText,
  wrapStyledTextPreservingIndent,
} from "./text.ts";

/**
 * Border treatment of a terminal frame. `light` draws square corners,
 * `rounded` draws rounded corners, and `none` keeps the frame's geometry —
 * its border rows and columns — as blank cells, so a filled panel and a
 * bordered one occupy exactly the same area.
 */
export type TerminalBoxStyle = "light" | "rounded" | "none";

/** Glyphs one drawn border style uses, including joins for ruled grids. */
export interface TerminalFrameGlyphs {
  readonly topLeft: string;
  readonly topJoin: string;
  readonly topRight: string;
  readonly middleLeft: string;
  readonly middleJoin: string;
  readonly middleRight: string;
  readonly bottomLeft: string;
  readonly bottomJoin: string;
  readonly bottomRight: string;
  readonly horizontal: string;
  readonly vertical: string;
}

const LIGHT_FRAME: TerminalFrameGlyphs = Object.freeze({
  topLeft: "┌",
  topJoin: "┬",
  topRight: "┐",
  middleLeft: "├",
  middleJoin: "┼",
  middleRight: "┤",
  bottomLeft: "└",
  bottomJoin: "┴",
  bottomRight: "┘",
  horizontal: "─",
  vertical: "│",
});

const ROUNDED_FRAME: TerminalFrameGlyphs = Object.freeze({
  ...LIGHT_FRAME,
  topLeft: "╭",
  topRight: "╮",
  bottomLeft: "╰",
  bottomRight: "╯",
});

const ASCII_FRAME: TerminalFrameGlyphs = Object.freeze({
  topLeft: "+",
  topJoin: "+",
  topRight: "+",
  middleLeft: "+",
  middleJoin: "+",
  middleRight: "+",
  bottomLeft: "+",
  bottomJoin: "+",
  bottomRight: "+",
  horizontal: "-",
  vertical: "|",
});

const BLANK_FRAME: TerminalFrameGlyphs = Object.freeze({
  topLeft: " ",
  topJoin: " ",
  topRight: " ",
  middleLeft: " ",
  middleJoin: " ",
  middleRight: " ",
  bottomLeft: " ",
  bottomJoin: " ",
  bottomRight: " ",
  horizontal: " ",
  vertical: " ",
});

/**
 * Resolve the frame glyphs for one border style. Without Unicode every
 * drawn style uses `+`, `-`, and `|`; `none` is blank in both repertoires.
 */
export function terminalFrameGlyphs(
  style: TerminalBoxStyle,
  unicode: boolean,
): TerminalFrameGlyphs {
  if (style === "none") return BLANK_FRAME;
  if (!unicode) return ASCII_FRAME;
  return style === "rounded" ? ROUNDED_FRAME : LIGHT_FRAME;
}

function wrapBoxLine(line: string, width: number): readonly string[] {
  if (measureText(line) <= width) return [line];
  return wrapStyledTextPreservingIndent(line, width);
}

/** Inputs for a bordered terminal text frame. */
export interface TerminalBoxOptions {
  readonly body: string;
  readonly title?: string;
  readonly width?: number;
  readonly padding?: number;
  /** Border treatment; defaults to `"light"`. */
  readonly style?: TerminalBoxStyle;
  /** Where the title sits in the upper border; defaults to `"start"`. */
  readonly titleAlign?: TerminalAlignment;
  /**
   * Style painted under the whole frame, borders and padding included —
   * usually a surface fill. Where the capabilities cannot paint it, the
   * frame renders unfilled.
   */
  readonly fill?: TerminalTextStyle;
  readonly borderStyle?: TerminalTextStyle;
  /** Optional status embedded in the lower border. */
  readonly bottomLabel?: string;
  /** Styling applied only to the lower-border status. */
  readonly bottomLabelStyle?: TerminalTextStyle;
}

function boxStyle(style: TerminalBoxStyle | undefined): TerminalBoxStyle {
  const resolved = style ?? "light";
  if (resolved !== "light" && resolved !== "rounded" && resolved !== "none") {
    throw new TypeError(`unknown box style: ${String(style)}`);
  }
  return resolved;
}

function titleRow(
  title: string,
  width: number,
  align: TerminalAlignment,
  horizontal: string,
): { readonly before: string; readonly after: string } {
  const room = Math.max(0, width - 2 - measureText(title));
  const before = align === "start"
    ? 0
    : align === "end"
    ? room
    : Math.floor(room / 2);
  return {
    before: horizontal.repeat(before),
    after: horizontal.repeat(room - before),
  };
}

/**
 * Render a width-bounded box using Unicode or intentional ASCII borders.
 * Over-wide body lines wrap with their styling and indentation intact, so
 * no content is lost to the frame.
 */
export function renderBox(
  options: TerminalBoxOptions,
  capabilities: TerminalCapabilities,
): string {
  const padding = options.padding ?? 1;
  if (!Number.isSafeInteger(padding) || padding < 0) {
    throw new TypeError(
      `box padding must be a non-negative safe integer; received ${padding}`,
    );
  }
  const requestedWidth = options.width ?? capabilities.columns;
  if (
    !Number.isSafeInteger(requestedWidth) || requestedWidth < 2 * padding + 3
  ) {
    throw new TypeError(
      `box width must be a safe integer of at least ${
        2 * padding + 3
      }; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  const innerWidth = width - 2 - 2 * padding;
  if (innerWidth < 1) {
    throw new TypeError(
      `terminal width ${capabilities.columns} is too narrow for a box`,
    );
  }
  const glyphs = terminalFrameGlyphs(
    boxStyle(options.style),
    capabilities.unicode,
  );
  const ellipsis = capabilities.unicode ? "…" : ".";
  const title = options.title === undefined || options.title === ""
    ? ""
    : ` ${truncateText(options.title, Math.max(0, width - 6), ellipsis)} `;
  const borderStyle = options.borderStyle ?? {};
  const border = (value: string): string =>
    styleText(value, borderStyle, capabilities);
  const titleFill = titleRow(
    title,
    width,
    options.titleAlign ?? "start",
    glyphs.horizontal,
  );
  const top = `${border(glyphs.topLeft)}${border(titleFill.before)}${
    border(title)
  }${border(titleFill.after)}${border(glyphs.topRight)}`;
  const bottomLabel = options.bottomLabel === undefined ||
      options.bottomLabel === ""
    ? ""
    : ` ${
      truncateText(options.bottomLabel, Math.max(0, width - 5), ellipsis)
    } `;
  const bottomFillWidth = Math.max(
    0,
    width - 2 - measureText(bottomLabel),
  );
  const bottomLeadingFill = glyphs.horizontal.repeat(
    Math.floor(bottomFillWidth / 2),
  );
  const bottomTrailingFill = glyphs.horizontal.repeat(
    Math.ceil(bottomFillWidth / 2),
  );
  const bottom = bottomLabel === ""
    ? border(
      `${glyphs.bottomLeft}${
        glyphs.horizontal.repeat(width - 2)
      }${glyphs.bottomRight}`,
    )
    : `${border(glyphs.bottomLeft)}${border(bottomLeadingFill)}${
      styleText(
        bottomLabel,
        options.bottomLabelStyle ?? borderStyle,
        capabilities,
      )
    }${border(bottomTrailingFill)}${border(glyphs.bottomRight)}`;
  const bodyLines = options.body.split("\n").flatMap((line) =>
    wrapBoxLine(line, innerWidth)
  );
  const content = (bodyLines.length === 0 ? [""] : bodyLines).map((line) =>
    `${border(glyphs.vertical)}${" ".repeat(padding)}${
      padText(line, innerWidth)
    }${" ".repeat(padding)}${border(glyphs.vertical)}`
  );
  const rows = [top, ...content, bottom];
  const fill = options.fill;
  return (fill === undefined
    ? rows
    : rows.map((row) => fillStyledLine(row, width, fill, capabilities)))
    .join("\n");
}
