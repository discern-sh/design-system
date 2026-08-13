/**
 * Capability-aware Unicode and ASCII terminal box drawing.
 *
 * @module
 */

import type { TerminalCapabilities } from "./capabilities.ts";
import { stripAnsi, styleText, type TerminalTextStyle } from "./ansi.ts";
import { measureText, padText, truncateText, wrapText } from "./text.ts";

function wrapBoxLine(line: string, width: number): readonly string[] {
  if (measureText(line) <= width) return [line];
  const plain = stripAnsi(line);
  const leadingSpaces = plain.match(/^ +/u)?.[0] ?? "";
  const indent = truncateText(leadingSpaces, Math.max(0, width - 1), "");
  const content = plain.slice(leadingSpaces.length);
  const contentWidth = Math.max(1, width - measureText(indent));
  return wrapText(content, contentWidth).map((value) => `${indent}${value}`);
}

/** Inputs for a bordered terminal text frame. */
export interface TerminalBoxOptions {
  readonly body: string;
  readonly title?: string;
  readonly width?: number;
  readonly padding?: number;
  readonly borderStyle?: TerminalTextStyle;
}

/** Render a width-bounded box using Unicode or intentional ASCII borders. */
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
  const title = options.title === undefined || options.title === ""
    ? ""
    : ` ${
      truncateText(
        options.title,
        Math.max(0, width - 6),
        capabilities.unicode ? "…" : ".",
      )
    } `;
  const topFill = glyphs.horizontal.repeat(
    Math.max(0, width - 2 - measureText(title)),
  );
  const borderStyle = options.borderStyle ?? {};
  const border = (value: string): string =>
    styleText(value, borderStyle, capabilities);
  const top = `${border(glyphs.topLeft)}${border(title)}${border(topFill)}${
    border(glyphs.topRight)
  }`;
  const bottom = border(
    `${glyphs.bottomLeft}${
      glyphs.horizontal.repeat(width - 2)
    }${glyphs.bottomRight}`,
  );
  const bodyLines = options.body.split("\n").flatMap((line) =>
    wrapBoxLine(line, innerWidth)
  );
  const content = (bodyLines.length === 0 ? [""] : bodyLines).map((line) =>
    `${border(glyphs.vertical)}${" ".repeat(padding)}${
      padText(line, innerWidth)
    }${" ".repeat(padding)}${border(glyphs.vertical)}`
  );
  return [top, ...content, bottom].join("\n");
}
