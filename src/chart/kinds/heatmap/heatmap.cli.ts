/**
 * Pure faithful-tier terminal projection for validated heatmap charts.
 *
 * The frame draws one shade swatch per stated cell, and the declared bins
 * are the frame's whole resolution — which is what earns the kind's
 * `faithful` honesty tier: the legend beneath the grid states every declared
 * bin edge, the largest and smallest stated values print exactly, and
 * nothing is resampled or re-binned. The Unicode swatch is the shade ramp
 * `░▒▓█`; the ASCII pairing prints the exact bin index digit, preserving
 * per-cell bin identity where shading is only perceptually approximate. A
 * declared gap renders the declared-gap glyph, never a blank, so a gap stays
 * distinct from zero in every repertoire, and colour only ever tints the
 * glyphs — density and digits carry the bin without it.
 */

import { styleText } from "../../../cli/ansi.ts";
import type {
  ChartKindCliDeclineCode,
  ChartKindCliProjection,
  ChartKindCliProjectorContext,
} from "../../../cli/chart-kinds.ts";
import { chartKindCliDecline } from "../../../cli/chart-kinds.ts";
import { chartFrameLabelMinimumWidth } from "../../../cli/chart-frame.ts";
import { renderBox } from "../../../cli/box.ts";
import {
  DECLARED_GAP_GLYPH,
  rampGlyph,
  SHADE_RAMP,
} from "../../../cli/glyph-ramps.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { composeCliBlocks } from "../../../cli/rhythm.ts";
import { measureText, padText } from "../../../cli/text.ts";
import {
  type TerminalTheme,
  terminalThemeColor,
  terminalThemes,
  terminalToneColor,
} from "../../../cli/theme.ts";
import { heatmapExtremeLines } from "./heatmap.description.ts";
import type {
  ValidatedHeatmapCell,
  ValidatedHeatmapChart,
} from "./heatmap.spec.ts";

const LABEL_GAP = 2;
const COLUMN_GAP = 1;

/**
 * Deterministic swatch width in cells. Two glyphs make neighbouring shade
 * bins legible where a single cell reads ambiguous, while still fitting the
 * fourteen-column budget inside an eighty-column frame. Wide column labels
 * widen their own column; the swatch stays two cells everywhere so equal
 * bins carry equal ink in every column.
 */
const CELL_WIDTH = 2;

function decline(
  code: ChartKindCliDeclineCode,
  fact: number,
  limit: number,
): ChartKindCliProjection {
  return chartKindCliDecline(code, fact, limit);
}

interface HeatmapPresentation {
  readonly spec: ValidatedHeatmapChart;
  readonly theme: TerminalTheme;
  readonly capabilities: ChartKindCliProjectorContext["capabilities"];
  readonly inner: number;
  readonly labelColumn: number;
  readonly columnWidths: readonly number[];
}

function shadeSwatch(
  presentation: HeatmapPresentation,
  bin: NonNullable<ValidatedHeatmapCell["bin"]>,
): string {
  const member = SHADE_RAMP[bin];
  if (member === undefined) {
    throw new TypeError(`heatmap bin ${bin} has no shade glyph`);
  }
  return styleText(
    rampGlyph(member, presentation.capabilities.unicode).repeat(CELL_WIDTH),
    { color: terminalToneColor(presentation.theme, "accent") },
    presentation.capabilities,
  );
}

function gapSwatch(presentation: HeatmapPresentation): string {
  return styleText(
    rampGlyph(DECLARED_GAP_GLYPH, presentation.capabilities.unicode),
    {
      color: terminalThemeColor(
        presentation.theme,
        "--discern-color-ink-faint",
      ),
      ...presentation.theme.typography.annotation,
    },
    presentation.capabilities,
  );
}

function cellSwatch(
  presentation: HeatmapPresentation,
  cell: ValidatedHeatmapCell,
): string {
  return cell.bin === null
    ? gapSwatch(presentation)
    : shadeSwatch(presentation, cell.bin);
}

function headerLine(presentation: HeatmapPresentation): string {
  const { spec, labelColumn, columnWidths } = presentation;
  const headers = spec.columns.map((column, index) =>
    padText(column.label, columnWidths[index] ?? CELL_WIDTH)
  );
  return `${" ".repeat(labelColumn + LABEL_GAP)}${
    headers.join(" ".repeat(COLUMN_GAP))
  }`.trimEnd();
}

function gridRows(presentation: HeatmapPresentation): readonly string[] {
  const { spec, labelColumn, columnWidths } = presentation;
  return spec.rows.map((row, rowIndex) => {
    const cells = spec.columns.map((_column, columnIndex) => {
      const cell = spec.cells[rowIndex * spec.columns.length + columnIndex];
      if (cell === undefined) {
        throw new TypeError(
          `heatmap cell ${rowIndex},${columnIndex} lies outside the validated grid`,
        );
      }
      return padText(
        cellSwatch(presentation, cell),
        columnWidths[columnIndex] ?? CELL_WIDTH,
      );
    });
    return `${padText(row.label, labelColumn)}${" ".repeat(LABEL_GAP)}${
      cells.join(" ".repeat(COLUMN_GAP))
    }`.trimEnd();
  });
}

interface LegendItem {
  readonly rendered: string;
  readonly width: number;
}

function legendItems(
  presentation: HeatmapPresentation,
): readonly LegendItem[] {
  const { spec } = presentation;
  const items = spec.binRangeLabels.map((label, index) => ({
    rendered: `${
      shadeSwatch(
        presentation,
        (index + 1) as NonNullable<
          ValidatedHeatmapCell["bin"]
        >,
      )
    } ${label}`,
    width: CELL_WIDTH + 1 + measureText(label),
  }));
  if (spec.cells.some((cell) => cell.bin === null)) {
    return [...items, {
      rendered: `${
        padText(gapSwatch(presentation), CELL_WIDTH)
      } no stated value`,
      width: CELL_WIDTH + 1 + measureText("no stated value"),
    }];
  }
  return items;
}

function legendLines(presentation: HeatmapPresentation): readonly string[] {
  const lines: string[] = [];
  let current = "";
  let currentWidth = 0;
  for (const item of legendItems(presentation)) {
    if (current === "") {
      current = item.rendered;
      currentWidth = item.width;
      continue;
    }
    if (currentWidth + 2 + item.width <= presentation.inner) {
      current = `${current}  ${item.rendered}`;
      currentWidth += 2 + item.width;
    } else {
      lines.push(current);
      current = item.rendered;
      currentWidth = item.width;
    }
  }
  if (current !== "") lines.push(current);
  return lines;
}

interface HeatmapViability {
  readonly refusal?: ChartKindCliProjection;
  readonly labelColumn: number;
  readonly columnWidths: readonly number[];
}

function viability(
  spec: ValidatedHeatmapChart,
  width: number,
  unicode: boolean,
): HeatmapViability {
  const failed = (refusal: ChartKindCliProjection): HeatmapViability => ({
    refusal,
    labelColumn: 0,
    columnWidths: [],
  });
  const inner = width - 4;
  const frameMinimum = chartFrameLabelMinimumWidth(
    heatmapBottomLabel(spec, unicode),
  );
  if (width < frameMinimum) {
    return failed(decline("width", width, frameMinimum));
  }
  const columnCount = spec.columns.length;
  const minimumGrid = columnCount * CELL_WIDTH +
    (columnCount - 1) * COLUMN_GAP;
  const minimum = 4 + 1 + LABEL_GAP + minimumGrid;
  if (width < minimum) return failed(decline("width", width, minimum));

  const labelColumn = Math.max(
    ...spec.rows.map((row) => measureText(row.label)),
  );
  const rowLabelBudget = inner - LABEL_GAP - minimumGrid;
  if (labelColumn > rowLabelBudget) {
    return failed(decline("label-wrap", labelColumn, rowLabelBudget));
  }

  const columnWidths = spec.columns.map((column) =>
    Math.max(CELL_WIDTH, measureText(column.label))
  );
  const gridWidth = columnWidths.reduce((sum, value) => sum + value, 0) +
    (columnCount - 1) * COLUMN_GAP;
  const gridBudget = inner - labelColumn - LABEL_GAP;
  if (gridWidth > gridBudget) {
    return failed(decline("label-wrap", gridWidth, gridBudget));
  }

  const legendTexts = [
    ...spec.binRangeLabels,
    ...(spec.cells.some((cell) => cell.bin === null)
      ? ["no stated value"]
      : []),
  ];
  for (const text of legendTexts) {
    const itemWidth = CELL_WIDTH + 1 + measureText(text);
    if (itemWidth > inner) {
      return failed(decline("label-wrap", itemWidth, inner));
    }
  }
  return { labelColumn, columnWidths };
}

function heatmapBottomLabel(
  spec: ValidatedHeatmapChart,
  unicode: boolean,
): string {
  const separator = unicode ? "·" : "|";
  const rowCount = spec.rows.length === 1
    ? "1 row"
    : `${spec.rows.length} rows`;
  const columnCount = spec.columns.length === 1
    ? "1 column"
    : `${spec.columns.length} columns`;
  return `${rowCount} ${separator} ${columnCount}`;
}

function renderFaithfulHeatmap(
  spec: ValidatedHeatmapChart,
  context: ChartKindCliProjectorContext,
  width: number,
  labelColumn: number,
  columnWidths: readonly number[],
): string {
  const { capabilities } = context;
  const theme = terminalThemes[context.theme];
  const presentation: HeatmapPresentation = {
    spec,
    theme,
    capabilities,
    inner: width - 4,
    labelColumn,
    columnWidths,
  };
  const summary = styleText(
    `Summary: ${spec.summary}`,
    {
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      ...theme.typography.body,
    },
    capabilities,
  );
  const blocks = [
    summary,
    joinVertical([headerLine(presentation), ...gridRows(presentation)]),
    joinVertical([...legendLines(presentation)]),
    joinVertical([...heatmapExtremeLines(spec)]),
  ];
  return renderBox(
    {
      title: spec.title,
      body: composeCliBlocks(blocks),
      width,
      borderStyle: {
        color: terminalThemeColor(theme, "--discern-color-border-strong"),
      },
      bottomLabel: heatmapBottomLabel(spec, capabilities.unicode),
      bottomLabelStyle: {
        color: terminalThemeColor(theme, "--discern-color-ink-faint"),
        ...theme.typography.annotation,
      },
    },
    capabilities,
  );
}

/** Project one faithful heatmap frame, or decline without losing any fact. */
export default function projectHeatmapChartCli(
  spec: ValidatedHeatmapChart,
  context: ChartKindCliProjectorContext,
): ChartKindCliProjection {
  const width = Math.min(context.maxWidth, context.capabilities.columns);
  const checked = viability(spec, width, context.capabilities.unicode);
  if (checked.refusal !== undefined) return checked.refusal;
  const titleWidth = measureText(spec.title);
  if (titleWidth > width - 6) {
    return decline("title-width", titleWidth, width - 6);
  }
  return {
    kind: "frame",
    frame: renderFaithfulHeatmap(
      spec,
      context,
      width,
      checked.labelColumn,
      checked.columnWidths,
    ),
  };
}
