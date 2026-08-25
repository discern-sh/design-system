/** Deterministic two-scale layout for scatter charts. */

import { measureSceneText } from "../../../internal/font-metrics.ts";
import { ChartValidationError } from "../../errors.ts";
import { formatChartNumber } from "../../format.ts";
import {
  CHART_GEOMETRY,
  chartPointBounds,
  chartRectsOverlap,
  chartRectUnion,
  roundChartNumber,
} from "../../geometry.ts";
import { chartTickLabel } from "../../kind-layout.ts";
import {
  chartLinearPosition,
  chartLogPosition,
  createChartLinearScale,
  createChartLogScale,
  resolveChartPaddedDomain,
} from "../../scale.ts";
import type {
  ChartAxisLine,
  ChartDataPoints,
  ChartGridLine,
  ChartPoint,
  ChartRect,
  ChartScene,
  ChartSceneElement,
  ChartTickLabel,
} from "../../scene.ts";
import { chartLinearTicks, chartLogTicks } from "../../ticks.ts";
import type { ChartValueScale } from "../../spec.ts";
import type {
  ValidatedScatterChart,
  ValidatedScatterChartAxis,
} from "./scatter.spec.ts";

const G = CHART_GEOMETRY;

/** Marker radius in scene units; the inscribed shape reads at label size. */
const MARKER_RADIUS = 3;

/** Subordinate gridline hairline width. */
const GRID_LINE_WIDTH = 1;

/**
 * Gap between the plot's bottom edge and the x tick labels. Wider than the
 * shared label gap because the bottom y tick label's line box reaches
 * 8.5 units below the plot corner, and the x labels must clear it plus the
 * shared text clearance.
 */
const X_TICK_LABEL_GAP = 16;

function labelCollision(): never {
  throw new ChartValidationError({
    code: "chart/layout/label-fit",
    message: "Axis labels have no deterministic clear placement.",
    path: "spec",
    remedy:
      "Choose a more compact value format for the crowded axis, or use a log scale so fewer ticks carry the span.",
  });
}

interface ScatterTick {
  readonly value: number;
  readonly label: string;
}

interface ResolvedScatterAxis {
  readonly ticks: readonly ScatterTick[];
  /** Outward tick coverage: the scale domain the plot range spans. */
  readonly domainMin: number;
  readonly domainMax: number;
}

/**
 * The pinned degenerate-domain padding: when every stated value on one axis
 * is identical, the tick domain widens deterministically around it — half a
 * magnitude each way on a linear scale (one unit around zero), one decade
 * each way on a log scale — and the outward tick coverage then lands the
 * edges on nice values.
 */
function paddedDomain(
  minimum: number,
  maximum: number,
  scale: ChartValueScale,
): { readonly minimum: number; readonly maximum: number } {
  if (minimum < maximum) return { minimum, maximum };
  const pad = minimum === 0 ? 1 : Math.abs(minimum) / 2;
  return resolveChartPaddedDomain({
    value: minimum,
    preferredMinimum: scale === "log" ? minimum / 10 : minimum - pad,
    preferredMaximum: scale === "log" ? maximum * 10 : maximum + pad,
    scale,
    subject: "Scatter axis",
  });
}

function resolveAxis(
  axis: ValidatedScatterChartAxis,
  statedMinimum: number,
  statedMaximum: number,
  subject: string,
): ResolvedScatterAxis {
  const domain = paddedDomain(statedMinimum, statedMaximum, axis.scale);
  const set = axis.scale === "log"
    ? chartLogTicks({
      minimum: domain.minimum,
      maximum: domain.maximum,
      subject,
    })
    : chartLinearTicks({
      minimum: domain.minimum,
      maximum: domain.maximum,
      targetCount: G.axis.valueTickTarget,
      subject,
    });
  const ticks = set.ticks.map((tick) => ({
    value: tick.number,
    label: axis.format === undefined
      ? tick.label
      : formatChartNumber(tick.number, axis.format),
  }));
  const first = ticks[0];
  const last = ticks.at(-1);
  if (first === undefined || last === undefined || first.value >= last.value) {
    throw new ChartValidationError({
      code: "chart/layout/non-finite",
      message: `${subject} produced no upward tick coverage.`,
      remedy: "Fix the scatter layout authority.",
    });
  }
  return { ticks, domainMin: first.value, domainMax: last.value };
}

function positionOn(
  axis: ValidatedScatterChartAxis,
  resolved: ResolvedScatterAxis,
  rangeStart: number,
  rangeEnd: number,
  subject: string,
): (value: number) => number {
  if (axis.scale === "log") {
    const scale = createChartLogScale({
      domainMin: resolved.domainMin,
      domainMax: resolved.domainMax,
      rangeStart,
      rangeEnd,
      subject,
    });
    return (value) => chartLogPosition(scale, value);
  }
  const scale = createChartLinearScale({
    domainMin: resolved.domainMin,
    domainMax: resolved.domainMax,
    rangeStart,
    rangeEnd,
    subject,
  });
  return (value) => chartLinearPosition(scale, value);
}

function axisLine(
  id: string,
  start: ChartPoint,
  end: ChartPoint,
): ChartAxisLine {
  return {
    kind: "axis-line",
    id,
    axis: "value",
    lineWidth: G.axis.lineWidth,
    start,
    end,
    bounds: chartPointBounds([start, end], G.axis.lineWidth / 2),
  };
}

function gridLine(
  id: string,
  start: ChartPoint,
  end: ChartPoint,
): ChartGridLine {
  return {
    kind: "grid-line",
    id,
    lineWidth: GRID_LINE_WIDTH,
    start,
    end,
    bounds: chartPointBounds([start, end], GRID_LINE_WIDTH / 2),
  };
}

function tickLabel(options: {
  readonly id: string;
  readonly text: string;
  readonly anchor: ChartTickLabel["anchor"];
  readonly x: number;
  readonly baseline: number;
}): ChartTickLabel {
  return chartTickLabel({
    ...options,
    axis: "value",
    role: "axis-label",
    fontRole: "mono",
  });
}

/** Lay a validated scatter chart into one projection-neutral scene. */
export default function layoutScatterChart(
  spec: ValidatedScatterChart,
): ChartScene {
  const xAxis = resolveAxis(
    spec.x,
    spec.minimumX,
    spec.maximumX,
    "Scatter x axis",
  );
  const yAxis = resolveAxis(
    spec.y,
    spec.minimumY,
    spec.maximumY,
    "Scatter y axis",
  );

  const yLabelWidths = yAxis.ticks.map((tick) =>
    measureSceneText(tick.label, G.text.labelSize, "mono")
  );
  const plotLeft = roundChartNumber(
    Math.max(...yLabelWidths) + G.axis.labelGap,
  );
  const plot: ChartRect = {
    x: plotLeft,
    y: 0,
    width: G.plot.valueExtent,
    height: G.plot.valueExtent,
  };
  const plotRight = roundChartNumber(plot.x + plot.width);
  const plotBottom = roundChartNumber(plot.y + plot.height);

  const xPosition = positionOn(
    spec.x,
    xAxis,
    plot.x,
    plotRight,
    "Scatter x axis",
  );
  const yPosition = positionOn(
    spec.y,
    yAxis,
    plotBottom,
    plot.y,
    "Scatter y axis",
  );

  const gridLines: ChartGridLine[] = [
    // The first tick of each axis sits exactly on an axis line, so its
    // gridline would only repaint the hairline.
    ...xAxis.ticks.slice(1).map((tick, index) => {
      const position = roundChartNumber(xPosition(tick.value));
      return gridLine(
        `grid-x-${index + 1}`,
        { x: position, y: plot.y },
        { x: position, y: plotBottom },
      );
    }),
    ...yAxis.ticks.slice(1).map((tick, index) => {
      const position = roundChartNumber(yPosition(tick.value));
      return gridLine(
        `grid-y-${index + 1}`,
        { x: plot.x, y: position },
        { x: plotRight, y: position },
      );
    }),
  ];

  const populations: ChartDataPoints[] = spec.series.map((series) => {
    const points = series.points.map((point) => ({
      x: roundChartNumber(xPosition(point.x)),
      y: roundChartNumber(yPosition(point.y)),
    }));
    return {
      kind: "data-points",
      id: `points-${series.id}`,
      seriesId: series.id,
      paint: `series-${series.slot}` as const,
      marker: series.marker,
      radius: MARKER_RADIUS,
      points,
      bounds: chartPointBounds(points, MARKER_RADIUS),
    };
  });

  const axisLines = [
    axisLine(
      "axis-x",
      { x: plot.x, y: plotBottom },
      { x: plotRight, y: plotBottom },
    ),
    axisLine("axis-y", { x: plot.x, y: plot.y }, { x: plot.x, y: plotBottom }),
  ];

  const labels = [
    ...xAxis.ticks.map((tick, index) =>
      tickLabel({
        id: `x-tick-${index}`,
        text: tick.label,
        anchor: "middle",
        x: roundChartNumber(xPosition(tick.value)),
        baseline: plotBottom + X_TICK_LABEL_GAP + G.text.labelSize,
      })
    ),
    ...yAxis.ticks.map((tick, index) =>
      tickLabel({
        id: `y-tick-${index}`,
        text: tick.label,
        anchor: "end",
        x: plot.x - G.axis.labelGap,
        baseline: roundChartNumber(
          yPosition(tick.value) + G.text.labelSize / 2 - 2,
        ),
      })
    ),
  ];
  for (let left = 0; left < labels.length; left += 1) {
    for (let right = left + 1; right < labels.length; right += 1) {
      const leftLabel = labels[left];
      const rightLabel = labels[right];
      if (
        leftLabel !== undefined && rightLabel !== undefined &&
        chartRectsOverlap(leftLabel.bounds, rightLabel.bounds, G.text.clearance)
      ) {
        labelCollision();
      }
    }
  }

  const elements: ChartSceneElement[] = [
    ...gridLines,
    ...populations,
    ...axisLines,
    ...labels,
  ];
  const content = chartRectUnion(elements.map(({ bounds }) => bounds));
  const padding = G.canvasPadding;
  return {
    kind: "chart-scene",
    sourceKind: "scatter",
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
