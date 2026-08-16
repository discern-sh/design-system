/**
 * Low-level vertical, inline-cluster, and column terminal layout combinators.
 *
 * @module
 */

import { measureText, padText, truncateText, wrapText } from "./text.ts";

/** Options for joining terminal blocks vertically. */
export interface VerticalJoinOptions {
  readonly spacing?: number;
}

/** Join non-empty blocks with a fixed number of blank lines. */
export function joinVertical(
  blocks: readonly string[],
  options: VerticalJoinOptions = {},
): string {
  const spacing = options.spacing ?? 0;
  if (!Number.isSafeInteger(spacing) || spacing < 0) {
    throw new TypeError(
      `vertical spacing must be a non-negative safe integer; received ${spacing}`,
    );
  }
  return blocks.filter((block) => block !== "").join("\n".repeat(spacing + 1));
}

/** Options for wrapping a cluster of single-line terminal items. */
export interface InlineClusterOptions {
  readonly columns: number;
  readonly gap?: number;
}

/** Wrap single-line items as an inline cluster inside a terminal width. */
export function wrapInlineCluster(
  items: readonly string[],
  options: InlineClusterOptions,
): string {
  if (!Number.isSafeInteger(options.columns) || options.columns < 1) {
    throw new TypeError(
      `cluster columns must be a positive safe integer; received ${options.columns}`,
    );
  }
  const gap = options.gap ?? 1;
  if (!Number.isSafeInteger(gap) || gap < 0) {
    throw new TypeError(
      `cluster gap must be a non-negative safe integer; received ${gap}`,
    );
  }
  const separator = " ".repeat(gap);
  const lines: string[] = [];
  let current = "";
  for (const source of items) {
    const item = truncateText(source.replaceAll("\n", " "), options.columns);
    const candidate = current === "" ? item : `${current}${separator}${item}`;
    if (measureText(candidate) <= options.columns) current = candidate;
    else {
      if (current !== "") lines.push(current);
      current = item;
    }
  }
  if (current !== "") lines.push(current);
  return lines.join("\n");
}

/** Options for placing text blocks in equal-width terminal columns. */
export interface ColumnLayoutOptions {
  readonly columns: number;
  readonly gap?: number;
}

/** Wrap and place blocks in equal-width columns without exceeding the frame. */
export function layoutColumns(
  blocks: readonly string[],
  options: ColumnLayoutOptions,
): string {
  if (blocks.length === 0) return "";
  if (!Number.isSafeInteger(options.columns) || options.columns < 1) {
    throw new TypeError(
      `layout columns must be a positive safe integer; received ${options.columns}`,
    );
  }
  const gap = options.gap ?? 2;
  if (!Number.isSafeInteger(gap) || gap < 0) {
    throw new TypeError(
      `column gap must be a non-negative safe integer; received ${gap}`,
    );
  }
  const gapsWidth = gap * (blocks.length - 1);
  const available = options.columns - gapsWidth;
  const columnWidth = Math.floor(available / blocks.length);
  if (columnWidth < 1) {
    throw new TypeError(
      `${options.columns} cells cannot hold ${blocks.length} columns with gap ${gap}`,
    );
  }
  const columns = blocks.map((block) =>
    block.split("\n").flatMap((line) => wrapText(line, columnWidth))
  );
  const rows = Math.max(...columns.map((column) => column.length));
  return Array.from(
    { length: rows },
    (_, row) =>
      columns.map((column, index) => {
        const value = column[row] ?? "";
        return index === columns.length - 1
          ? value
          : padText(value, columnWidth);
      }).join(" ".repeat(gap)).trimEnd(),
  ).join("\n");
}
