/**
 * Pure faithful-tier terminal projection for validated line charts.
 *
 * The frame is a declared-resolution approximation, which is what the kind's
 * `faithful` honesty tier permits and no more: every authored point occupies
 * exactly one plot column with no resampling ever, values quantize onto a
 * fixed row grid with half-away-from-zero rounding, the exact stated
 * extremes print beside their rows, the domain extremes print beneath the
 * grid, and the bottom border states the resolution. Declared gaps mark a
 * dedicated gap row — never a blank column and never a zero — and when the
 * authored cardinality cannot fit one column per point, or a colourless
 * frame cannot keep its series apart, the projector declines with a typed
 * reason instead of distorting.
 */

import { styleText } from "../../../cli/ansi.ts";
import { renderBox } from "../../../cli/box.ts";
import type {
  ChartKindCliDeclineCode,
  ChartKindCliProjection,
  ChartKindCliProjectorContext,
} from "../../../cli/chart-kinds.ts";
import {
  DECLARED_GAP_GLYPH,
  LINE_PATH_GLYPHS,
  type LinePathSegment,
  rampGlyph,
  SERIES_MARKERS,
} from "../../../cli/glyph-ramps.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { composeCliBlocks } from "../../../cli/rhythm.ts";
import { measureText, padText } from "../../../cli/text.ts";
import {
  type TerminalColor,
  type TerminalTheme,
  terminalThemeColor,
  terminalThemes,
} from "../../../cli/theme.ts";
import { chartLinearFraction, chartLogFraction } from "../../scale.ts";
import {
  lineDomainText,
  lineUnitSuffix,
  lineValueText,
} from "./line.description.ts";
import type {
  ValidatedLineChart,
  ValidatedLineChartSeries,
} from "./line.spec.ts";

/** Fixed quantized plot height; the frame states it as its resolution. */
const PLOT_ROWS = 8;

/**
 * Colourless frames keep at most this many series: two interleaved marker
 * populations stay readable without connectors, while a third loses track
 * of which run belongs to which series, so the frame declines to the
 * lossless table instead.
 */
const MONO_SERIES_LIMIT = 2;

function decline(
  code: ChartKindCliDeclineCode,
  fact: number,
  limit: number,
): ChartKindCliProjection {
  return { kind: "declined", code, fact, limit };
}

interface LinePresentation {
  readonly spec: ValidatedLineChart;
  readonly theme: TerminalTheme;
  readonly capabilities: ChartKindCliProjectorContext["capabilities"];
  readonly unit: string;
  readonly inner: number;
  /** Width of the extreme-value column left of the axis. */
  readonly gutter: number;
  readonly maxText: string;
  readonly minText: string;
  /** Colourless multi-series frames draw per-series markers, not paths. */
  readonly markerMode: boolean;
}

/** One painted plot cell: the resolved glyph and its owning series slot. */
interface PlotCell {
  readonly glyph: string;
  readonly slot: number;
}

type PlotGrid = (PlotCell | undefined)[][];

function seriesColor(
  theme: TerminalTheme,
  slot: number,
): TerminalColor {
  return terminalThemeColor(theme, `--discern-color-series-${slot}`);
}

function faintText(presentation: LinePresentation, text: string): string {
  return styleText(
    text,
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

/**
 * Quantize one stated value onto the row grid, bottom row zero. Rounding is
 * half-away-from-zero via `Math.round` on a non-negative fraction, log-space
 * under the log scale, and a flat domain sits on the middle row.
 */
function plotRow(spec: ValidatedLineChart, value: number): number {
  const low = spec.minimumValue;
  const high = spec.maximumValue;
  if (low === high) return Math.round((PLOT_ROWS - 1) / 2);
  const fraction = spec.value.scale === "log"
    ? chartLogFraction(low, high, value)
    : chartLinearFraction(low, high, value);
  return Math.min(
    PLOT_ROWS - 1,
    Math.max(0, Math.round(fraction * (PLOT_ROWS - 1))),
  );
}

function seriesMarker(
  series: ValidatedLineChartSeries,
  unicode: boolean,
): string {
  const marker = SERIES_MARKERS[series.slot - 1];
  if (marker === undefined) {
    throw new TypeError(`series slot ${series.slot} has no marker glyph`);
  }
  return rampGlyph(marker, unicode);
}

/** Whether the stated cell at `index` has no stated neighbour on either side. */
function isIsolated(
  values: readonly (number | null)[],
  index: number,
): boolean {
  return (values[index - 1] ?? null) === null &&
    (values[index + 1] ?? null) === null;
}

function paintCell(
  grid: PlotGrid,
  bottomRow: number,
  column: number,
  glyph: string,
  slot: number,
): void {
  const screenRow = grid[PLOT_ROWS - 1 - bottomRow];
  if (screenRow !== undefined) screenRow[column] = { glyph, slot };
}

/**
 * Draw one series across the grid, one authored point per column: level and
 * turn glyphs on authored rows, run glyphs only connecting neighbouring
 * authored rows, and the series marker for an isolated stated point.
 */
function drawSeriesPath(
  grid: PlotGrid,
  presentation: LinePresentation,
  series: ValidatedLineChartSeries,
): void {
  const { spec, capabilities } = presentation;
  const glyphFor = (segment: LinePathSegment): string =>
    rampGlyph(LINE_PATH_GLYPHS[segment], capabilities.unicode);
  let previousRow: number | undefined;
  series.values.forEach((cell, column) => {
    if (cell === null) {
      previousRow = undefined;
      return;
    }
    const row = plotRow(spec, cell);
    if (previousRow === undefined) {
      const glyph = isIsolated(series.values, column)
        ? seriesMarker(series, capabilities.unicode)
        : glyphFor("level");
      paintCell(grid, row, column, glyph, series.slot);
    } else if (row === previousRow) {
      paintCell(grid, row, column, glyphFor("level"), series.slot);
    } else if (row > previousRow) {
      paintCell(grid, previousRow, column, glyphFor("riseFrom"), series.slot);
      for (let between = previousRow + 1; between < row; between += 1) {
        paintCell(grid, between, column, glyphFor("run"), series.slot);
      }
      paintCell(grid, row, column, glyphFor("riseTo"), series.slot);
    } else {
      paintCell(grid, previousRow, column, glyphFor("fallFrom"), series.slot);
      for (let between = row + 1; between < previousRow; between += 1) {
        paintCell(grid, between, column, glyphFor("run"), series.slot);
      }
      paintCell(grid, row, column, glyphFor("fallTo"), series.slot);
    }
    previousRow = row;
  });
}

/**
 * Colourless multi-series drawing: each series places its paired marker
 * glyph at every authored point and draws no connectors, so two series
 * never differ by colour alone. Later series overwrite a shared cell; the
 * lossless table keeps every coincident value one mode away.
 */
function drawSeriesMarkers(
  grid: PlotGrid,
  presentation: LinePresentation,
  series: ValidatedLineChartSeries,
): void {
  const glyph = seriesMarker(series, presentation.capabilities.unicode);
  series.values.forEach((cell, column) => {
    if (cell === null) return;
    paintCell(
      grid,
      plotRow(presentation.spec, cell),
      column,
      glyph,
      series.slot,
    );
  });
}

function buildGrid(presentation: LinePresentation): PlotGrid {
  const columns = presentation.spec.x.values.length;
  const grid: PlotGrid = Array.from(
    { length: PLOT_ROWS },
    () => new Array<PlotCell | undefined>(columns).fill(undefined),
  );
  for (const series of presentation.spec.series) {
    if (presentation.markerMode) {
      drawSeriesMarkers(grid, presentation, series);
    } else {
      drawSeriesPath(grid, presentation, series);
    }
  }
  return grid;
}

/** Row indexes (from the top) that carry an extreme-value gutter label. */
function gutterLabels(
  presentation: LinePresentation,
): ReadonlyMap<number, string> {
  const { spec, maxText, minText } = presentation;
  if (spec.minimumValue === spec.maximumValue) {
    // A flat domain sits on the middle row; its single stated value
    // annotates that row instead of an empty top and bottom.
    const flatRow = PLOT_ROWS - 1 - Math.round((PLOT_ROWS - 1) / 2);
    return new Map([[flatRow, maxText]]);
  }
  return new Map([[0, maxText], [PLOT_ROWS - 1, minText]]);
}

function plotLines(
  presentation: LinePresentation,
  grid: PlotGrid,
): readonly string[] {
  const { capabilities, gutter, theme } = presentation;
  const labels = gutterLabels(presentation);
  return grid.map((rowCells, screenRow) => {
    const label = labels.get(screenRow) ?? "";
    const axisGlyph = label === ""
      ? (capabilities.unicode ? "│" : "|")
      : (capabilities.unicode ? "┤" : "+");
    const cells = rowCells.map((cell) =>
      cell === undefined ? " " : styleText(
        cell.glyph,
        { color: seriesColor(theme, cell.slot) },
        capabilities,
      )
    ).join("");
    return `${padText(label, gutter, "end")}${
      faintText(presentation, axisGlyph)
    }${cells}`;
  });
}

/** Columns where any series declares a gap, in authored order. */
function gapColumns(spec: ValidatedLineChart): readonly boolean[] {
  return Array.from(
    { length: spec.x.values.length },
    (_, index) => spec.series.some((series) => series.values[index] === null),
  );
}

function gapRow(presentation: LinePresentation): string | undefined {
  const columns = gapColumns(presentation.spec);
  if (!columns.some((gap) => gap)) return undefined;
  const glyph = rampGlyph(
    DECLARED_GAP_GLYPH,
    presentation.capabilities.unicode,
  );
  const cells = columns.map((gap) => gap ? faintText(presentation, glyph) : " ")
    .join("");
  return `${" ".repeat(presentation.gutter + 1)}${cells}`;
}

function legendLines(presentation: LinePresentation): readonly string[] {
  const { spec, capabilities, inner, theme } = presentation;
  const items = spec.series.map((series) => ({
    rendered: `${
      styleText(
        seriesMarker(series, capabilities.unicode),
        { color: seriesColor(theme, series.slot) },
        capabilities,
      )
    } ${series.label}`,
    width: 2 + measureText(series.label),
  }));
  const lines: string[] = [];
  let current = "";
  let currentWidth = 0;
  for (const item of items) {
    if (current === "") {
      current = item.rendered;
      currentWidth = item.width;
      continue;
    }
    if (currentWidth + 2 + item.width <= inner) {
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

function domainExtentLine(presentation: LinePresentation): string {
  const { spec, capabilities, gutter } = presentation;
  const arrow = capabilities.unicode ? "→" : "->";
  const first = lineDomainText(spec.x, 0);
  const last = lineDomainText(spec.x, spec.x.values.length - 1);
  return `${" ".repeat(gutter + 1)}${first} ${arrow} ${last}`;
}

function domainExtentWidth(
  spec: ValidatedLineChart,
  unicode: boolean,
): number {
  const arrow = unicode ? "→" : "->";
  return measureText(
    `${lineDomainText(spec.x, 0)} ${arrow} ${
      lineDomainText(spec.x, spec.x.values.length - 1)
    }`,
  );
}

interface LineViability {
  readonly refusal?: ChartKindCliProjection;
  readonly gutter: number;
}

function viability(
  spec: ValidatedLineChart,
  width: number,
  capabilities: ChartKindCliProjectorContext["capabilities"],
): LineViability {
  const failed = (refusal: ChartKindCliProjection): LineViability => ({
    refusal,
    gutter: 0,
  });
  if (
    capabilities.colorDepth === "none" &&
    spec.series.length > MONO_SERIES_LIMIT
  ) {
    return failed(
      decline("mono-series", spec.series.length, MONO_SERIES_LIMIT),
    );
  }
  const inner = width - 4;
  for (const series of spec.series) {
    const itemWidth = 2 + measureText(series.label);
    if (itemWidth > inner) {
      return failed(decline("label-wrap", itemWidth, inner));
    }
  }
  const unit = lineUnitSuffix(spec.value);
  const gutter = Math.max(
    measureText(lineValueText(spec.maximumValue, unit, spec.value.format)),
    measureText(lineValueText(spec.minimumValue, unit, spec.value.format)),
  );
  const points = spec.x.values.length;
  const anyGap = spec.series.some((series) =>
    series.values.some((cell) => cell === null)
  );
  const gapKeyWidth = anyGap ? 2 + measureText("no stated value") : 0;
  const required = Math.max(
    gutter + 1 + points,
    gutter + 1 + domainExtentWidth(spec, capabilities.unicode),
    gapKeyWidth,
  );
  const minimum = 4 + required;
  if (width < minimum) return failed(decline("width", width, minimum));
  return { gutter };
}

function renderFaithfulLine(
  spec: ValidatedLineChart,
  context: ChartKindCliProjectorContext,
  width: number,
  gutter: number,
): string {
  const { capabilities } = context;
  const theme = terminalThemes[context.theme];
  const presentation: LinePresentation = {
    spec,
    theme,
    capabilities,
    unit: lineUnitSuffix(spec.value),
    inner: width - 4,
    gutter,
    maxText: lineValueText(
      spec.maximumValue,
      lineUnitSuffix(spec.value),
      spec.value.format,
    ),
    minText: lineValueText(
      spec.minimumValue,
      lineUnitSuffix(spec.value),
      spec.value.format,
    ),
    markerMode: capabilities.colorDepth === "none" && spec.series.length > 1,
  };
  const summary = styleText(
    `Summary: ${spec.summary}`,
    {
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      ...theme.typography.body,
    },
    capabilities,
  );
  const grid = buildGrid(presentation);
  const plotBlockLines: string[] = [...plotLines(presentation, grid)];
  const gaps = gapRow(presentation);
  if (gaps !== undefined) plotBlockLines.push(gaps);
  plotBlockLines.push(domainExtentLine(presentation));
  if (gaps !== undefined) {
    plotBlockLines.push(
      faintText(
        presentation,
        `${
          rampGlyph(DECLARED_GAP_GLYPH, capabilities.unicode)
        } no stated value`,
      ),
    );
  }
  const blocks = [
    summary,
    joinVertical([...legendLines(presentation)]),
    joinVertical(plotBlockLines),
  ];
  const times = capabilities.unicode ? "×" : "x";
  const separator = capabilities.unicode ? "·" : "|";
  const resolution =
    `${PLOT_ROWS} rows ${times} ${spec.x.values.length} points${
      spec.value.scale === "log" ? ` ${separator} log scale` : ""
    }`;
  return renderBox(
    {
      title: spec.title,
      body: composeCliBlocks(blocks),
      width,
      borderStyle: {
        color: terminalThemeColor(theme, "--discern-color-border-strong"),
      },
      bottomLabel: resolution,
      bottomLabelStyle: {
        color: terminalThemeColor(theme, "--discern-color-ink-faint"),
        ...theme.typography.annotation,
      },
    },
    capabilities,
  );
}

/**
 * Project one faithful line frame, or decline without distorting any stated
 * fact. Typed locally until integration adds the kind to the generated
 * projector union.
 */
const projectLineChartCli = (
  spec: ValidatedLineChart,
  context: ChartKindCliProjectorContext,
): ChartKindCliProjection => {
  const width = Math.min(context.maxWidth, context.capabilities.columns);
  const checked = viability(spec, width, context.capabilities);
  if (checked.refusal !== undefined) return checked.refusal;
  const titleWidth = measureText(spec.title);
  if (titleWidth > width - 6) {
    return decline("title-width", titleWidth, width - 6);
  }
  return {
    kind: "frame",
    frame: renderFaithfulLine(spec, context, width, checked.gutter),
  };
};

export default projectLineChartCli;
