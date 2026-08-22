/**
 * Capability-aware Unicode and ASCII terminal box drawing.
 *
 * @module
 */

import type { TerminalCapabilities } from "./capabilities.ts";
import { styleText, type TerminalTextStyle } from "./ansi.ts";
import {
  measureText,
  padText,
  truncateText,
  wrapStyledTextPreservingIndent,
} from "./text.ts";

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
  readonly borderStyle?: TerminalTextStyle;
  /** Optional status embedded in the lower border. */
  readonly bottomLabel?: string;
  /** Styling applied only to the lower-border status. */
  readonly bottomLabelStyle?: TerminalTextStyle;
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
  const bottomLabel = options.bottomLabel === undefined ||
      options.bottomLabel === ""
    ? ""
    : ` ${
      truncateText(
        options.bottomLabel,
        Math.max(0, width - 5),
        capabilities.unicode ? "…" : ".",
      )
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
  return [top, ...content, bottom].join("\n");
}
