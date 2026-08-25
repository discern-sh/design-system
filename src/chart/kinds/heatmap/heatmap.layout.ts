/** Deterministic scale-driven layout for heatmap charts. */

import { measureSceneText } from "../../../internal/font-metrics.ts";
import { ChartValidationError } from "../../errors.ts";
import {
  CHART_GEOMETRY,
  chartRectsOverlap,
  chartRectUnion,
  roundChartNumber,
} from "../../geometry.ts";
import { chartBandSegment, createChartBandScale } from "../../scale.ts";
import type {
  ChartMark,
  ChartRect,
  ChartScene,
  ChartSceneElement,
  ChartTickLabel,
} from "../../scene.ts";
import type { ValidatedHeatmapChart } from "./heatmap.spec.ts";

const G = CHART_GEOMETRY;

/**
 * Fraction of each band step given to the gap between neighbouring cells.
 * Near-zero so the cells read as one grid, yet positive so no two marks ever
 * touch into an overlap.
 */
const GRID_GAP_RATIO = 0.06;

/** Fixed row step: one label line plus clear space, on the 4-unit rhythm. */
const ROW_STEP = 28;

/** Column step floor; wider column labels widen every column equally. */
const COLUMN_STEP_BASE = 44;

function labelCollision(): never {
  throw new ChartValidationError({
    code: "chart/layout/label-fit",
    message: "Grid axis labels have no deterministic clear placement.",
    path: "spec",
    remedy:
      "Shorten the colliding row or column labels, or aggregate categories into fewer, broader ones.",
  });
}

function tickLabel(options: {
  readonly id: string;
  readonly text: string;
  readonly anchor: ChartTickLabel["anchor"];
  readonly x: number;
  readonly baseline: number;
}): ChartTickLabel {
  const width = measureSceneText(options.text, G.text.labelSize, "interface");
  const left = options.anchor === "start"
    ? options.x
    : options.anchor === "middle"
    ? options.x - width / 2
    : options.x - width;
  return {
    kind: "tick-label",
    id: options.id,
    axis: "category",
    role: "axis-label",
    text: options.text,
    anchor: options.anchor,
    x: roundChartNumber(options.x),
    baseline: roundChartNumber(options.baseline),
    fontRole: "interface",
    fontSize: G.text.labelSize,
    lineHeight: G.text.labelLineHeight,
    width,
    bounds: {
      x: roundChartNumber(left),
      y: roundChartNumber(options.baseline - G.text.labelSize),
      width,
      height: G.text.labelLineHeight,
    },
  };
}

/** Lay a validated heatmap chart into one projection-neutral scene. */
export default function layoutHeatmapChart(
  spec: ValidatedHeatmapChart,
): ChartScene {
  const labelSize = G.text.labelSize;
  const rowLabelWidths = spec.rows.map((row) =>
    measureSceneText(row.label, labelSize, "interface")
  );
  const columnLabelWidths = spec.columns.map((column) =>
    measureSceneText(column.label, labelSize, "interface")
  );
  const columnStep = Math.max(
    COLUMN_STEP_BASE,
    roundChartNumber(Math.max(...columnLabelWidths) + G.text.clearance * 2),
  );
  const plot: ChartRect = {
    x: roundChartNumber(Math.max(...rowLabelWidths) + G.axis.labelGap),
    y: 0,
    width: roundChartNumber(columnStep * spec.columns.length),
    height: roundChartNumber(ROW_STEP * spec.rows.length),
  };
  const columnScale = createChartBandScale({
    count: spec.columns.length,
    rangeStart: plot.x,
    rangeEnd: plot.x + plot.width,
    gapRatio: GRID_GAP_RATIO,
    subject: "Heatmap column axis",
  });
  const rowScale = createChartBandScale({
    count: spec.rows.length,
    rangeStart: plot.y,
    rangeEnd: plot.y + plot.height,
    gapRatio: GRID_GAP_RATIO,
    subject: "Heatmap row axis",
  });

  const marks: ChartMark[] = [];
  spec.cells.forEach((cell, index) => {
    if (cell.bin === null) return;
    const rowSegment = chartBandSegment(
      rowScale,
      Math.floor(index / spec.columns.length),
    );
    const columnSegment = chartBandSegment(
      columnScale,
      index % spec.columns.length,
    );
    marks.push({
      kind: "mark",
      id: `mark-${cell.rowId}-${cell.columnId}`,
      seriesId: cell.rowId,
      categoryId: cell.columnId,
      paint: `ramp-${cell.bin}` as const,
      bounds: {
        x: roundChartNumber(columnSegment.start),
        y: roundChartNumber(rowSegment.start),
        width: roundChartNumber(columnSegment.width),
        height: roundChartNumber(rowSegment.width),
      },
    });
  });

  const rowLabels = spec.rows.map((row, index) => {
    const segment = chartBandSegment(rowScale, index);
    const center = segment.start + segment.width / 2;
    return tickLabel({
      id: `row-label-${row.id}`,
      text: row.label,
      anchor: "end",
      x: plot.x - G.axis.labelGap,
      baseline: center + labelSize / 2 - 2,
    });
  });
  const columnLabels = spec.columns.map((column, index) => {
    const segment = chartBandSegment(columnScale, index);
    return tickLabel({
      id: `column-label-${column.id}`,
      text: column.label,
      anchor: "middle",
      x: segment.start + segment.width / 2,
      baseline: plot.y - G.axis.labelGap -
        (G.text.labelLineHeight - labelSize),
    });
  });

  const labels = [...rowLabels, ...columnLabels];
  for (let left = 0; left < labels.length; left += 1) {
    for (let right = left + 1; right < labels.length; right += 1) {
      const leftLabel = labels[left];
      const rightLabel = labels[right];
      if (
        leftLabel !== undefined && rightLabel !== undefined &&
        chartRectsOverlap(
          leftLabel.bounds,
          rightLabel.bounds,
          G.text.clearance,
        )
      ) {
        labelCollision();
      }
    }
  }

  const elements: ChartSceneElement[] = [...marks, ...labels];
  const content = chartRectUnion(elements.map(({ bounds }) => bounds));
  const padding = G.canvasPadding;
  return {
    kind: "chart-scene",
    sourceKind: "heatmap",
    canvas: {
      bounds: {
        x: roundChartNumber(content.x - padding),
        y: roundChartNumber(content.y - padding),
        width: roundChartNumber(content.width + padding * 2),
        height: roundChartNumber(content.height + padding * 2),
      },
      role: "canvas",
      padding,
    },
    plot,
    elements,
  };
}
