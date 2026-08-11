/**
 * Pure terminal renderer and deterministic example states for Table.
 *
 * @module
 */

import { styleText, type TerminalTextStyle } from "../../../cli/ansi.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import {
  measureText,
  padText,
  type TerminalAlignment,
  truncateText,
} from "../../../cli/text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
} from "../../../cli/theme.ts";

/** One terminal Table column and its cell alignment. */
export interface TableCliColumn {
  readonly header: string;
  readonly align?: TerminalAlignment;
}

/** Inputs accepted by the terminal Table renderer. */
export interface TableCliProps {
  readonly columns: readonly TableCliColumn[];
  readonly rows: readonly (readonly string[])[];
  readonly caption?: string;
  readonly striped?: boolean;
  readonly numeric?: boolean;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Deterministic Table states rendered by `deno task catalogue:cli table`. */
export const cliExamples: readonly CliExample<TableCliProps>[] = [
  {
    name: "status",
    props: {
      caption: "Checks",
      columns: [{ header: "Name" }, { header: "State" }, { header: "Count" }],
      rows: [["Format", "Passed", "12"], ["Tests", "Queued", "3"]],
      striped: true,
      numeric: true,
      width: 40,
    },
  },
] as const;

function allocateWidths(
  natural: readonly number[],
  available: number,
): readonly number[] {
  const widths = natural.map(() => 1);
  let remaining = available - widths.length;
  let cursor = 0;
  while (
    remaining > 0 &&
    widths.some((width, index) => width < (natural[index] ?? 1))
  ) {
    const index = cursor % widths.length;
    cursor += 1;
    if ((widths[index] ?? 1) >= (natural[index] ?? 1)) continue;
    widths[index] = (widths[index] ?? 1) + 1;
    remaining -= 1;
  }
  while (remaining > 0) {
    const index = cursor % widths.length;
    cursor += 1;
    widths[index] = (widths[index] ?? 1) + 1;
    remaining -= 1;
  }
  return widths;
}

function frameGlyphs(unicode: boolean) {
  return unicode
    ? {
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
    }
    : {
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
    };
}

/** Render a box-drawn, width-aware terminal data table. */
const renderTableCli: CliRenderer<TableCliProps> = (props, capabilities) => {
  if (props.columns.length === 0) {
    throw new TypeError("table requires at least one column");
  }
  for (const [index, row] of props.rows.entries()) {
    if (row.length !== props.columns.length) {
      throw new TypeError(
        `table row ${
          index + 1
        } has ${row.length} cells for ${props.columns.length} columns`,
      );
    }
  }
  const values = [
    ...props.columns.map((column) => column.header),
    ...props.rows.flat(),
    ...(props.caption === undefined ? [] : [props.caption]),
  ];
  if (values.some((value) => value === "" || /[\p{Cc}\p{Cf}]/u.test(value))) {
    throw new TypeError("table content must be non-empty and control-free");
  }
  const minimumWidth = props.columns.length * 4 + 1;
  const requestedWidth = props.width ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < minimumWidth) {
    throw new TypeError(
      `table width must be a safe integer of at least ${minimumWidth}; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  if (width < minimumWidth) {
    throw new TypeError(
      `terminal width ${capabilities.columns} cannot hold this table`,
    );
  }
  const available = width - (props.columns.length + 1) -
    props.columns.length * 2;
  const natural = props.columns.map((column, index) =>
    Math.max(
      measureText(column.header),
      ...props.rows.map((row) => measureText(row[index] ?? "")),
    )
  );
  const columnWidths = allocateWidths(natural, available);
  const glyphs = frameGlyphs(capabilities.unicode);
  const theme = terminalThemes[props.theme ?? "dark"];
  const borderStyle = {
    ...theme.typography.muted,
    color: terminalThemeColor(theme, "--discern-color-border-strong"),
  };
  const border = (value: string): string =>
    styleText(value, borderStyle, capabilities);
  const rule = (
    left: string,
    join: string,
    right: string,
  ): string =>
    border(
      `${left}${
        columnWidths.map((columnWidth) =>
          glyphs.horizontal.repeat(columnWidth + 2)
        ).join(join)
      }${right}`,
    );
  const row = (
    cells: readonly string[],
    styles: readonly (TerminalTextStyle | undefined)[],
  ): string => {
    const rendered = cells.map((cell, index) => {
      const column = props.columns[index];
      const alignment = column?.align ??
        (props.numeric === true && index === props.columns.length - 1
          ? "end"
          : "start");
      const cellWidth = columnWidths[index] ?? 1;
      const value = padText(
        truncateText(
          cell,
          cellWidth,
          capabilities.unicode ? "…" : ".",
        ),
        cellWidth,
        alignment,
      );
      const style = styles[index];
      return style === undefined
        ? ` ${value} `
        : ` ${styleText(value, style, capabilities)} `;
    });
    return `${border(glyphs.vertical)}${
      rendered.join(border(glyphs.vertical))
    }${border(glyphs.vertical)}`;
  };
  const lines = [
    rule(glyphs.topLeft, glyphs.topJoin, glyphs.topRight),
    row(
      props.columns.map((column) => column.header),
      props.columns.map(() => theme.typography.strong),
    ),
    rule(glyphs.middleLeft, glyphs.middleJoin, glyphs.middleRight),
    ...props.rows.map((cells, index) =>
      row(
        cells,
        props.columns.map(() =>
          props.striped === true && index % 2 === 1
            ? theme.typography.muted
            : undefined
        ),
      )
    ),
    rule(glyphs.bottomLeft, glyphs.bottomJoin, glyphs.bottomRight),
  ];
  if (props.caption === undefined) return lines.join("\n");
  return `${
    styleText(
      truncateText(props.caption, width, capabilities.unicode ? "…" : "."),
      theme.typography.annotation,
      capabilities,
    )
  }\n${lines.join("\n")}`;
};

export default renderTableCli;
