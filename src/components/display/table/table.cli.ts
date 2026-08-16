/**
 * Pure terminal renderer and deterministic example states for Table.
 *
 * @module
 */

import { styleText, type TerminalTextStyle } from "../../../cli/ansi.ts";
import type { TerminalCapabilities } from "../../../cli/capabilities.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import {
  renderSemanticInlineContent,
  type SemanticInlineContent,
  wrapSemanticInlineContent,
} from "../../../cli/semantic-inline.ts";
import {
  measureText,
  padText,
  type TerminalAlignment,
  truncateText,
  wrapText,
} from "../../../cli/text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
} from "../../../cli/theme.ts";

/** Terminal Table layout policy. The responsive policy never truncates cells. */
export type TableCliLayout = "compact" | "responsive";

/** One legacy compact terminal Table cell. */
export type TableCliCell = string;

/** One legacy compact terminal Table column and its cell alignment. */
export interface TableCliColumn {
  readonly header: string;
  readonly align?: TerminalAlignment;
}

/** One responsive terminal Table cell with package-owned inline semantics. */
export type TableCliResponsiveCell = SemanticInlineContent;

/** One responsive terminal Table column with a rich semantic header. */
export interface TableCliResponsiveColumn {
  readonly header: SemanticInlineContent;
  readonly align?: TerminalAlignment;
}

interface TableCliOptions {
  readonly caption?: string;
  readonly striped?: boolean;
  readonly numeric?: boolean;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Legacy one-line string grid; omitting `layout` preserves this contract. */
export interface TableCliCompactProps extends TableCliOptions {
  readonly layout?: "compact";
  readonly columns: readonly TableCliColumn[];
  readonly rows: readonly (readonly TableCliCell[])[];
}

/** Rich, lossless Table input enabled only by the responsive discriminant. */
export interface TableCliResponsiveProps extends TableCliOptions {
  /**
   * Wrap without truncation and stack labelled records when a grid would not
   * leave four content cells per column.
   */
  readonly layout: "responsive";
  readonly columns: readonly TableCliResponsiveColumn[];
  readonly rows: readonly (readonly TableCliResponsiveCell[])[];
}

/** Inputs accepted by the terminal Table renderer. */
export type TableCliProps =
  | TableCliCompactProps
  | TableCliResponsiveProps;

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
  {
    name: "responsive-rich",
    props: {
      caption: "References",
      columns: [
        { header: [{ kind: "strong", content: "Topic" }] },
        { header: "Evidence" },
        { header: "Score", align: "end" },
      ],
      rows: [[
        ["Inline ", { kind: "code", text: "semantics" }],
        [{
          kind: "link",
          label: "Reference material",
          destination: "https://example.test/reference",
        }],
        "98",
      ], ["Empty values remain explicit", "", "0"]],
      striped: true,
      layout: "responsive",
      width: 48,
    },
  },
] as const;

function allocateWidths(
  natural: readonly number[],
  available: number,
  minimum = 1,
): readonly number[] {
  const widths = natural.map(() => minimum);
  let remaining = available - widths.length * minimum;
  let cursor = 0;
  while (
    remaining > 0 &&
    widths.some((width, index) => width < (natural[index] ?? minimum))
  ) {
    const index = cursor % widths.length;
    cursor += 1;
    if ((widths[index] ?? minimum) >= (natural[index] ?? minimum)) continue;
    widths[index] = (widths[index] ?? minimum) + 1;
    remaining -= 1;
  }
  while (remaining > 0) {
    const index = cursor % widths.length;
    cursor += 1;
    widths[index] = (widths[index] ?? minimum) + 1;
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

function columnAlignment(
  props: Readonly<TableCliProps>,
  index: number,
): TerminalAlignment {
  return props.columns[index]?.align ??
    (props.numeric === true && index === props.columns.length - 1
      ? "end"
      : "start");
}

function assertStringCell(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new TypeError(
      'semantic table content requires layout: "responsive"',
    );
  }
}

/** Preserve the original Table contract byte-for-byte behind the default. */
function renderCompactTable(
  props: Readonly<TableCliCompactProps>,
  capabilities: TerminalCapabilities,
): string {
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
  for (const column of props.columns) assertStringCell(column.header);
  for (const cell of props.rows.flat()) assertStringCell(cell);
  const columns = props.columns;
  const rows = props.rows;
  const values = [
    ...columns.map((column) => column.header),
    ...rows.flat(),
    ...(props.caption === undefined ? [] : [props.caption]),
  ];
  if (values.some((value) => value === "" || /[\p{Cc}\p{Cf}]/u.test(value))) {
    throw new TypeError("table content must be non-empty and control-free");
  }
  const minimumWidth = columns.length * 4 + 1;
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
  const available = width - (columns.length + 1) - columns.length * 2;
  const natural = columns.map((column, index) =>
    Math.max(
      measureText(column.header),
      ...rows.map((row) => measureText(row[index] ?? "")),
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
      const alignment = columnAlignment(props, index);
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
      columns.map((column) => column.header),
      columns.map(() => theme.typography.strong),
    ),
    rule(glyphs.middleLeft, glyphs.middleJoin, glyphs.middleRight),
    ...rows.map((cells, index) =>
      row(
        cells,
        columns.map(() =>
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
}

const RESPONSIVE_MINIMUM_WIDTH = 4;
const GRID_MINIMUM_CELL_WIDTH = 4;

function isExplicitlyEmpty(content: SemanticInlineContent): boolean {
  return content === "" || (Array.isArray(content) && content.length === 0);
}

function responsiveWidth(
  requested: number | undefined,
  capabilities: TerminalCapabilities,
): number {
  const desired = requested ?? capabilities.columns;
  if (
    !Number.isSafeInteger(desired) || desired < RESPONSIVE_MINIMUM_WIDTH
  ) {
    throw new TypeError(
      `responsive table width must be a safe integer of at least ${RESPONSIVE_MINIMUM_WIDTH}; received ${desired}`,
    );
  }
  if (
    !Number.isSafeInteger(capabilities.columns) ||
    capabilities.columns < RESPONSIVE_MINIMUM_WIDTH
  ) {
    throw new TypeError(
      `terminal columns must be a safe integer of at least ${RESPONSIVE_MINIMUM_WIDTH}; received ${capabilities.columns}`,
    );
  }
  return Math.min(desired, capabilities.columns);
}

function semanticOptions(
  props: Readonly<TableCliOptions>,
  baseRole: "body" | "strong" | "muted" | "annotation",
) {
  return {
    ...(props.theme === undefined ? {} : { theme: props.theme }),
    baseRole,
  } as const;
}

function renderResponsiveContent(
  content: SemanticInlineContent,
  width: number,
  props: Readonly<TableCliResponsiveProps>,
  capabilities: TerminalCapabilities,
  role: "body" | "strong" | "muted",
): readonly string[] {
  if (isExplicitlyEmpty(content)) return [""];
  return wrapSemanticInlineContent(
    content,
    width,
    capabilities,
    semanticOptions(props, role),
  );
}

function validateResponsiveShape(
  props: Readonly<TableCliResponsiveProps>,
): readonly (readonly TableCliResponsiveCell[])[] {
  if (!Array.isArray(props.columns) || !Array.isArray(props.rows)) {
    throw new TypeError("responsive table columns and rows must be arrays");
  }
  for (const [index, column] of props.columns.entries()) {
    if (
      typeof column !== "object" || column === null || Array.isArray(column)
    ) {
      throw new TypeError(
        `responsive table column ${index + 1} must be an object`,
      );
    }
    if (
      column.align !== undefined && column.align !== "start" &&
      column.align !== "center" && column.align !== "end"
    ) {
      throw new TypeError(
        `responsive table column ${
          index + 1
        } has unknown alignment ${column.align}`,
      );
    }
    if (!isExplicitlyEmpty(column.header)) {
      renderSemanticInlineContent(
        column.header,
        {
          colorDepth: "none",
          columns: Number.MAX_SAFE_INTEGER,
          hyperlinks: false,
          unicode: true,
        },
      );
    }
  }
  return props.rows.map((row, rowIndex) => {
    if (!Array.isArray(row)) {
      throw new TypeError(
        `responsive table row ${rowIndex + 1} must be an array`,
      );
    }
    if (row.length > props.columns.length) {
      throw new TypeError(
        `responsive table row ${
          rowIndex + 1
        } has ${row.length} cells for ${props.columns.length} columns`,
      );
    }
    return Array.from(
      { length: props.columns.length },
      (_, columnIndex) => row[columnIndex] ?? "",
    );
  });
}

function responsiveCaption(
  props: Readonly<TableCliResponsiveProps>,
  capabilities: TerminalCapabilities,
  width: number,
): readonly string[] {
  if (props.caption === undefined) return [];
  if (
    props.caption === "" || /[\p{Cc}\p{Cf}]/u.test(props.caption)
  ) {
    throw new TypeError("table caption must be non-empty and control-free");
  }
  const theme = terminalThemes[props.theme ?? "dark"];
  return wrapText(props.caption, width).map((line) =>
    styleText(line, theme.typography.annotation, capabilities)
  );
}

function fallbackHeader(index: number): string {
  return `Column ${index + 1}`;
}

function richHeader(
  column: TableCliResponsiveColumn,
  index: number,
): SemanticInlineContent {
  return isExplicitlyEmpty(column.header)
    ? fallbackHeader(index)
    : column.header;
}

function renderResponsiveGrid(
  props: Readonly<TableCliResponsiveProps>,
  rows: readonly (readonly TableCliResponsiveCell[])[],
  capabilities: TerminalCapabilities,
  width: number,
): string {
  const columnCount = props.columns.length;
  const structuralWidth = columnCount * 3 + 1;
  const available = width - structuralWidth;
  const renderedValues = props.columns.map((column, columnIndex) => [
    renderSemanticInlineContent(
      richHeader(column, columnIndex),
      capabilities,
      semanticOptions(props, "strong"),
    ),
    ...rows.map((row, rowIndex) => {
      const cell = row[columnIndex] ?? "";
      return isExplicitlyEmpty(cell) ? "" : renderSemanticInlineContent(
        cell,
        capabilities,
        semanticOptions(
          props,
          props.striped === true && rowIndex % 2 === 1 ? "muted" : "body",
        ),
      );
    }),
  ]);
  const natural = renderedValues.map((values) =>
    Math.max(GRID_MINIMUM_CELL_WIDTH, ...values.map(measureText))
  );
  const columnWidths = allocateWidths(
    natural,
    available,
    GRID_MINIMUM_CELL_WIDTH,
  );
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
  const rowLines = (
    cells: readonly TableCliResponsiveCell[],
    role: "body" | "strong" | "muted",
  ): readonly string[] => {
    const wrapped = cells.map((cell, index) =>
      renderResponsiveContent(
        cell,
        columnWidths[index] ?? GRID_MINIMUM_CELL_WIDTH,
        props,
        capabilities,
        role,
      )
    );
    const height = Math.max(...wrapped.map((lines) => lines.length));
    return Array.from({ length: height }, (_, lineIndex) => {
      const rendered = wrapped.map((lines, columnIndex) => {
        const cellWidth = columnWidths[columnIndex] ?? GRID_MINIMUM_CELL_WIDTH;
        const line = lines[lineIndex] ?? "";
        return ` ${
          padText(line, cellWidth, columnAlignment(props, columnIndex))
        } `;
      });
      return `${border(glyphs.vertical)}${
        rendered.join(border(glyphs.vertical))
      }${border(glyphs.vertical)}`;
    });
  };
  const headerCells = props.columns.map((column, index) =>
    richHeader(column, index)
  );
  const lines = [
    rule(glyphs.topLeft, glyphs.topJoin, glyphs.topRight),
    ...rowLines(headerCells, "strong"),
  ];
  if (rows.length > 0) {
    lines.push(rule(glyphs.middleLeft, glyphs.middleJoin, glyphs.middleRight));
    for (const [index, cells] of rows.entries()) {
      if (index > 0) {
        lines.push(
          rule(glyphs.middleLeft, glyphs.middleJoin, glyphs.middleRight),
        );
      }
      lines.push(
        ...rowLines(
          cells,
          props.striped === true && index % 2 === 1 ? "muted" : "body",
        ),
      );
    }
  }
  lines.push(rule(glyphs.bottomLeft, glyphs.bottomJoin, glyphs.bottomRight));
  return lines.join("\n");
}

function alignedLine(
  value: string,
  width: number,
  alignment: TerminalAlignment,
): string {
  return padText(value, width, alignment).trimEnd();
}

function renderStackedLabel(
  column: TableCliResponsiveColumn,
  index: number,
  props: Readonly<TableCliResponsiveProps>,
  capabilities: TerminalCapabilities,
  width: number,
): readonly string[] {
  const lines = renderResponsiveContent(
    richHeader(column, index),
    width - 1,
    props,
    capabilities,
    "strong",
  );
  const alignment = columnAlignment(props, index);
  return lines.map((line, lineIndex) =>
    alignedLine(
      `${line}${lineIndex === lines.length - 1 ? ":" : ""}`,
      width,
      alignment,
    )
  );
}

function renderStackedValue(
  content: SemanticInlineContent,
  columnIndex: number,
  rowIndex: number,
  props: Readonly<TableCliResponsiveProps>,
  capabilities: TerminalCapabilities,
  width: number,
): readonly string[] {
  const cellWidth = width - 2;
  const role = props.striped === true && rowIndex % 2 === 1 ? "muted" : "body";
  const lines = isExplicitlyEmpty(content)
    ? renderResponsiveContent(
      capabilities.unicode ? "∅" : "(empty)",
      cellWidth,
      props,
      capabilities,
      role,
    )
    : renderResponsiveContent(
      content,
      cellWidth,
      props,
      capabilities,
      role,
    );
  return lines.map((line) =>
    `  ${alignedLine(line, cellWidth, columnAlignment(props, columnIndex))}`
  );
}

function renderResponsiveStack(
  props: Readonly<TableCliResponsiveProps>,
  rows: readonly (readonly TableCliResponsiveCell[])[],
  capabilities: TerminalCapabilities,
  width: number,
): string {
  if (rows.length === 0) {
    return props.columns.flatMap((column, index) =>
      renderStackedLabel(column, index, props, capabilities, width)
    ).join("\n");
  }
  return rows.map((row, rowIndex) =>
    props.columns.flatMap((column, columnIndex) => [
      ...renderStackedLabel(column, columnIndex, props, capabilities, width),
      ...renderStackedValue(
        row[columnIndex] ?? "",
        columnIndex,
        rowIndex,
        props,
        capabilities,
        width,
      ),
    ]).join("\n")
  ).join("\n\n");
}

function renderResponsiveTable(
  props: Readonly<TableCliResponsiveProps>,
  capabilities: TerminalCapabilities,
): string {
  const width = responsiveWidth(props.width, capabilities);
  const rows = validateResponsiveShape(props);
  const caption = responsiveCaption(props, capabilities, width);
  if (props.columns.length === 0) {
    if (rows.some((row) => row.length > 0)) {
      throw new TypeError(
        "a zero-column responsive table cannot contain cells",
      );
    }
    return caption.join("\n");
  }
  const minimumGridWidth = props.columns.length *
      (GRID_MINIMUM_CELL_WIDTH + 3) + 1;
  const table = width >= minimumGridWidth
    ? renderResponsiveGrid(props, rows, capabilities, width)
    : renderResponsiveStack(props, rows, capabilities, width);
  return [...caption, table].filter((line) => line !== "").join("\n");
}

/**
 * Render a box-drawn compact table, or an explicitly lossless responsive
 * table that wraps rich cells and projects narrow rows as labelled records.
 */
const renderTableCli: CliRenderer<TableCliProps> = (props, capabilities) => {
  const runtimeLayout = (props as { readonly layout?: unknown }).layout;
  if (
    runtimeLayout !== undefined && runtimeLayout !== "compact" &&
    runtimeLayout !== "responsive"
  ) {
    throw new TypeError(`unknown table layout: ${runtimeLayout}`);
  }
  if (props.layout === "responsive") {
    return renderResponsiveTable(props, capabilities);
  }
  return renderCompactTable(props, capabilities);
};

export default renderTableCli;
