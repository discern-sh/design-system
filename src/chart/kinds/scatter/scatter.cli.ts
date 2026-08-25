/**
 * Pure faithful-tier terminal projection for validated scatter charts.
 *
 * The frame quantizes every observation onto a declared marker grid and
 * says so: the bottom label states the exact cell resolution and the grid's
 * corners are annotated with the exact axis extremes, which is what the
 * kind's declared `faithful` honesty tier owes — a declared-resolution
 * approximation that prints its extremes and never distorts, with the
 * lossless exact-pair table one mode away in the universal description.
 *
 * Coincident observations are counted, never overwritten: a cell holding
 * more than one point renders its count digit, and a cell whose count a
 * single digit cannot state triggers a typed decline instead of a lie.
 * Each series keeps its full paired bundle — slot colour plus a distinct
 * marker glyph — so the three series stay apart even at `colorDepth: none`.
 */

import { styleText } from "../../../cli/ansi.ts";
import type {
  ChartKindCliDeclineCode,
  ChartKindCliProjection,
  ChartKindCliProjectorContext,
} from "../../../cli/chart-kinds.ts";
import { renderBox } from "../../../cli/box.ts";
import { rampGlyph, SERIES_MARKERS } from "../../../cli/glyph-ramps.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { composeCliBlocks } from "../../../cli/rhythm.ts";
import { measureText, padText } from "../../../cli/text.ts";
import {
  type TerminalColor,
  type TerminalTheme,
  terminalThemeColor,
  terminalThemes,
} from "../../../cli/theme.ts";
import {
  chartLinearPosition,
  chartLogPosition,
  createChartLinearScale,
  createChartLogScale,
} from "../../scale.ts";
import { chartUnitSuffix, chartValueText } from "../../value-text.ts";
import type { ChartSeriesPaintSlot } from "../../scene.ts";
import type {
  ValidatedScatterChart,
  ValidatedScatterChartAxis,
} from "./scatter.spec.ts";

/** Fixed marker-grid height in cells; ten rows keep one readable screen. */
const SCATTER_PLOT_ROWS = 10;

/** Widest marker grid a frame draws; more cells stop aiding the eye. */
const SCATTER_PLOT_COLUMN_CEILING = 72;

/** Narrowest marker grid the faithful tier accepts before declining. */
const SCATTER_PLOT_COLUMN_FLOOR = 20;

/** Conservative whole-frame minimum width for any scatter frame. */
const SCATTER_MINIMUM_WIDTH = 40;

/** Largest coincident-point count one cell can state with one digit. */
const COLLISION_DIGIT_LIMIT = 9;

/** One space between the y-extreme gutter and the marker grid. */
const GUTTER_GAP = 1;

function decline(
  code: ChartKindCliDeclineCode,
  fact: number,
  limit: number,
): ChartKindCliProjection {
  return { kind: "declined", code, fact, limit };
}

/** The exact corner texts the frame annotates the grid edges with. */
interface ScatterExtremeTexts {
  readonly xMinimum: string;
  readonly xMaximum: string;
  readonly yMinimum: string;
  readonly yMaximum: string;
}

function extremeTexts(spec: ValidatedScatterChart): ScatterExtremeTexts {
  const xUnit = chartUnitSuffix(spec.x);
  const yUnit = chartUnitSuffix(spec.y);
  return {
    xMinimum: chartValueText(spec.minimumX, xUnit, spec.x.format),
    xMaximum: chartValueText(spec.maximumX, xUnit, spec.x.format),
    yMinimum: chartValueText(spec.minimumY, yUnit, spec.y.format),
    yMaximum: chartValueText(spec.maximumY, yUnit, spec.y.format),
  };
}

interface ScatterViability {
  readonly refusal?: ChartKindCliProjection;
  /** Marker-grid column count. */
  readonly columns: number;
  /** Right-aligned y-extreme gutter width. */
  readonly gutter: number;
}

function viability(
  spec: ValidatedScatterChart,
  width: number,
  texts: ScatterExtremeTexts,
): ScatterViability {
  const failed = (refusal: ChartKindCliProjection): ScatterViability => ({
    refusal,
    columns: 0,
    gutter: 0,
  });
  const inner = width - 4;
  for (const series of spec.series) {
    const itemWidth = 2 + measureText(series.label);
    if (itemWidth > inner) {
      return failed(decline("label-wrap", itemWidth, inner));
    }
  }
  const gutter = Math.max(
    measureText(texts.yMinimum),
    measureText(texts.yMaximum),
  );
  const xNeed = measureText(texts.xMinimum) + 2 + measureText(texts.xMaximum);
  const requiredInner = gutter + GUTTER_GAP +
    Math.max(SCATTER_PLOT_COLUMN_FLOOR, xNeed);
  const minimum = Math.max(SCATTER_MINIMUM_WIDTH, requiredInner + 4);
  if (width < minimum) return failed(decline("width", width, minimum));
  return {
    columns: Math.min(SCATTER_PLOT_COLUMN_CEILING, inner - gutter - GUTTER_GAP),
    gutter,
  };
}

/**
 * Map one axis onto cell indices through the shared scale authorities. A
 * degenerate axis — every stated value identical — places every observation
 * mid-range, matching the sparkline's flat-series middle placement.
 */
function cellPosition(
  axis: ValidatedScatterChartAxis,
  minimum: number,
  maximum: number,
  rangeStart: number,
  rangeEnd: number,
  subject: string,
): (value: number) => number {
  if (minimum === maximum) {
    const middle = (rangeStart + rangeEnd) / 2;
    return () => middle;
  }
  if (axis.scale === "log") {
    const scale = createChartLogScale({
      domainMin: minimum,
      domainMax: maximum,
      rangeStart,
      rangeEnd,
      subject,
    });
    return (value) => chartLogPosition(scale, value);
  }
  const scale = createChartLinearScale({
    domainMin: minimum,
    domainMax: maximum,
    rangeStart,
    rangeEnd,
    subject,
  });
  return (value) => chartLinearPosition(scale, value);
}

/**
 * Quantize one non-negative cell position half-away-from-zero. Grid
 * positions never go negative, so `Math.round`'s half-up tie is exactly
 * half-away-from-zero here; the clamp only absorbs float dust at the edges.
 */
function cellFor(position: number, lastIndex: number): number {
  return Math.max(0, Math.min(lastIndex, Math.round(position)));
}

interface ScatterGrid {
  /** Row-major point counts, `rows × columns`. */
  readonly counts: readonly number[];
  /** Row-major occupying slot per cell; `"mixed"` when series collide. */
  readonly slots: readonly (ChartSeriesPaintSlot | "mixed" | undefined)[];
  /** The largest single-cell count, for the collision-count envelope. */
  readonly worstCollision: number;
}

function buildGrid(
  spec: ValidatedScatterChart,
  columns: number,
): ScatterGrid {
  const counts = new Array<number>(SCATTER_PLOT_ROWS * columns).fill(0);
  const slots = new Array<ChartSeriesPaintSlot | "mixed" | undefined>(
    SCATTER_PLOT_ROWS * columns,
  ).fill(undefined);
  const xPosition = cellPosition(
    spec.x,
    spec.minimumX,
    spec.maximumX,
    0,
    columns - 1,
    "Scatter terminal x axis",
  );
  const yPosition = cellPosition(
    spec.y,
    spec.minimumY,
    spec.maximumY,
    SCATTER_PLOT_ROWS - 1,
    0,
    "Scatter terminal y axis",
  );
  let worstCollision = 0;
  for (const series of spec.series) {
    for (const point of series.points) {
      const column = cellFor(xPosition(point.x), columns - 1);
      const row = cellFor(yPosition(point.y), SCATTER_PLOT_ROWS - 1);
      const index = row * columns + column;
      const count = (counts[index] ?? 0) + 1;
      counts[index] = count;
      if (count > worstCollision) worstCollision = count;
      const occupant = slots[index];
      slots[index] = occupant === undefined || occupant === series.slot
        ? series.slot
        : "mixed";
    }
  }
  return { counts, slots, worstCollision };
}

interface ScatterPresentation {
  readonly spec: ValidatedScatterChart;
  readonly theme: TerminalTheme;
  readonly capabilities: ChartKindCliProjectorContext["capabilities"];
  readonly inner: number;
  readonly columns: number;
  readonly gutter: number;
  readonly texts: ScatterExtremeTexts;
}

function slotColor(
  theme: TerminalTheme,
  slot: ChartSeriesPaintSlot,
): TerminalColor {
  return terminalThemeColor(theme, `--discern-color-series-${slot}`);
}

function markerGlyph(slot: ChartSeriesPaintSlot, unicode: boolean): string {
  const marker = SERIES_MARKERS[slot - 1];
  if (marker === undefined) {
    throw new TypeError(`series slot ${slot} has no marker glyph`);
  }
  return rampGlyph(marker, unicode);
}

/**
 * One grid cell: empty space, a single observation's marker glyph in the
 * series' paired bundle, or the coincident-point count digit. A
 * single-series count digit keeps the series colour; a cross-series digit
 * stays neutral — unstyled foreground — so no one series is falsely
 * credited with the pile.
 */
function cellText(
  presentation: ScatterPresentation,
  count: number,
  slot: ChartSeriesPaintSlot | "mixed" | undefined,
): string {
  if (count === 0 || slot === undefined) return " ";
  const { theme, capabilities } = presentation;
  if (count === 1 && slot !== "mixed") {
    return styleText(
      markerGlyph(slot, capabilities.unicode),
      { color: slotColor(theme, slot) },
      capabilities,
    );
  }
  const digit = String(count);
  return slot === "mixed" ? digit : styleText(
    digit,
    { color: slotColor(theme, slot) },
    capabilities,
  );
}

function legendLines(presentation: ScatterPresentation): readonly string[] {
  const { spec, capabilities, inner, theme } = presentation;
  const items = spec.series.map((series) => {
    const glyph = styleText(
      markerGlyph(series.slot, capabilities.unicode),
      { color: slotColor(theme, series.slot) },
      capabilities,
    );
    return {
      rendered: `${glyph} ${series.label}`,
      width: 2 + measureText(series.label),
    };
  });
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

/**
 * The marker grid with its corner annotations: the y extremes label the top
 * and bottom rows from a right-aligned gutter, and the x extremes label the
 * first and last columns on the line beneath — every annotation is the
 * exact `chartValueText` of a stated extreme, never a rounded echo.
 */
function plotLines(
  presentation: ScatterPresentation,
  grid: ScatterGrid,
): readonly string[] {
  const { columns, gutter, texts } = presentation;
  const lines: string[] = [];
  for (let row = 0; row < SCATTER_PLOT_ROWS; row += 1) {
    const label = row === 0
      ? texts.yMaximum
      : row === SCATTER_PLOT_ROWS - 1
      ? texts.yMinimum
      : "";
    let cells = "";
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      cells += cellText(
        presentation,
        grid.counts[index] ?? 0,
        grid.slots[index],
      );
    }
    lines.push(
      `${padText(label, gutter, "end")}${" ".repeat(GUTTER_GAP)}${cells}`,
    );
  }
  const spacing = columns - measureText(texts.xMinimum) -
    measureText(texts.xMaximum);
  lines.push(
    `${" ".repeat(gutter + GUTTER_GAP)}${texts.xMinimum}${
      " ".repeat(spacing)
    }${texts.xMaximum}`,
  );
  return lines;
}

function renderFaithfulScatter(
  spec: ValidatedScatterChart,
  context: ChartKindCliProjectorContext,
  width: number,
  checked: ScatterViability,
  texts: ScatterExtremeTexts,
  grid: ScatterGrid,
): string {
  const { capabilities } = context;
  const theme = terminalThemes[context.theme];
  const presentation: ScatterPresentation = {
    spec,
    theme,
    capabilities,
    inner: width - 4,
    columns: checked.columns,
    gutter: checked.gutter,
    texts,
  };
  const summary = styleText(
    `Summary: ${spec.summary}`,
    {
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      ...theme.typography.body,
    },
    capabilities,
  );
  const separator = capabilities.unicode ? "·" : "|";
  const times = capabilities.unicode ? "×" : "x";
  const totalPoints = spec.series.reduce(
    (sum, series) => sum + series.points.length,
    0,
  );
  const pointCount = totalPoints === 1 ? "1 point" : `${totalPoints} points`;
  return renderBox(
    {
      title: spec.title,
      body: composeCliBlocks([
        summary,
        joinVertical([...legendLines(presentation)]),
        joinVertical([...plotLines(presentation, grid)]),
      ]),
      width,
      borderStyle: {
        color: terminalThemeColor(theme, "--discern-color-border-strong"),
      },
      bottomLabel:
        `${spec.series.length} series ${separator} ${pointCount} ${separator} ${checked.columns}${times}${SCATTER_PLOT_ROWS} cells`,
      bottomLabelStyle: {
        color: terminalThemeColor(theme, "--discern-color-ink-faint"),
        ...theme.typography.annotation,
      },
    },
    capabilities,
  );
}

/** Project one faithful scatter frame, or decline without hiding a point. */
const projectScatterChartCli: (
  spec: ValidatedScatterChart,
  context: ChartKindCliProjectorContext,
) => ChartKindCliProjection = (spec, context) => {
  const width = Math.min(context.maxWidth, context.capabilities.columns);
  const texts = extremeTexts(spec);
  const checked = viability(spec, width, texts);
  if (checked.refusal !== undefined) return checked.refusal;
  const titleWidth = measureText(spec.title);
  if (titleWidth > width - 6) {
    return decline("title-width", titleWidth, width - 6);
  }
  const grid = buildGrid(spec, checked.columns);
  if (grid.worstCollision > COLLISION_DIGIT_LIMIT) {
    return decline(
      "collision-count",
      grid.worstCollision,
      COLLISION_DIGIT_LIMIT,
    );
  }
  return {
    kind: "frame",
    frame: renderFaithfulScatter(spec, context, width, checked, texts, grid),
  };
};

export default projectScatterChartCli;
