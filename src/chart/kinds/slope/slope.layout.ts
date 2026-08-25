/** Deterministic scale-driven slopegraph layout for slope charts. */

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
  createChartLinearScale,
  resolveChartPaddedDomain,
} from "../../scale.ts";
import type {
  ChartAxisLine,
  ChartDataPath,
  ChartPoint,
  ChartRect,
  ChartScene,
  ChartSceneElement,
  ChartTickLabel,
} from "../../scene.ts";
import { chartLinearTicks } from "../../ticks.ts";
import { chartPlainValue } from "../../value-text.ts";
import type { ValidatedSlopeChart } from "./slope.spec.ts";

const G = CHART_GEOMETRY;

/** Stroke width of one item's connecting line. */
const LINE_WIDTH = 2;

/**
 * Vertical head-room reserved per item: one direct-label line plus clear
 * space on both sides. The plot grows beyond the family's base value extent
 * once the item count would otherwise leave evenly spread labels no room.
 */
const ITEM_HEADROOM = G.text.labelLineHeight + 2 * G.text.clearance;

function labelCollision(): never {
  throw new ChartValidationError({
    code: "chart/layout/label-fit",
    message:
      "Direct item labels have no deterministic clear placement; two items sit too close together at the same endpoint.",
    path: "spec.items",
    remedy:
      "Compare fewer items, shorten the colliding labels, or present the exact values as a table.",
  });
}

/**
 * One endpoint value exactly as the figure prints it beside the plot: the
 * authored format when stated, otherwise the canonical shortest decimal.
 */
function endpointValueText(spec: ValidatedSlopeChart, value: number): string {
  return spec.value.format === undefined
    ? chartPlainValue(value)
    : formatChartNumber(value, spec.value.format);
}

function axisLine(
  id: string,
  x: number,
  top: number,
  bottom: number,
): ChartAxisLine {
  const start: ChartPoint = { x, y: top };
  const end: ChartPoint = { x, y: bottom };
  return {
    kind: "axis-line",
    id,
    axis: "category",
    lineWidth: G.axis.lineWidth,
    start,
    end,
    bounds: chartPointBounds([start, end], G.axis.lineWidth / 2),
  };
}

function tickLabel(options: {
  readonly id: string;
  readonly axis: ChartTickLabel["axis"];
  readonly role: ChartTickLabel["role"];
  readonly text: string;
  readonly anchor: ChartTickLabel["anchor"];
  readonly x: number;
  readonly baseline: number;
  readonly fontRole: ChartTickLabel["fontRole"];
}): ChartTickLabel {
  return chartTickLabel(options);
}

/** Lay a validated slope chart into one projection-neutral scene. */
export default function layoutSlopeChart(
  spec: ValidatedSlopeChart,
): ChartScene {
  // A degenerate authored domain — every before and after stating one value —
  // pads outward by one unit so tick selection stays defined; the direct
  // labels of such a figure stack at one position and refuse deterministically
  // below rather than crashing the scale.
  const degenerate = spec.minimumValue === spec.maximumValue;
  const domain = degenerate
    ? resolveChartPaddedDomain({
      value: spec.minimumValue,
      preferredMinimum: spec.minimumValue - 1,
      preferredMaximum: spec.maximumValue + 1,
      scale: "linear",
      subject: "Slope value axis",
    })
    : { minimum: spec.minimumValue, maximum: spec.maximumValue };
  const set = chartLinearTicks({
    minimum: domain.minimum,
    maximum: domain.maximum,
    targetCount: G.axis.valueTickTarget,
    subject: "Slope value axis",
  });
  const firstTick = set.ticks.at(0);
  const lastTick = set.ticks.at(-1);
  if (firstTick === undefined || lastTick === undefined) {
    throw new ChartValidationError({
      code: "chart/layout/non-finite",
      message: "Slope tick selection produced no outward domain coverage.",
      remedy: "Fix the slope layout authority.",
    });
  }

  const labelSize = G.text.labelSize;
  const labelled = spec.items.map((item) => ({
    item,
    leftText: `${item.label} ${endpointValueText(spec, item.before)}`,
  }));
  const plotLeft = roundChartNumber(
    Math.max(
      ...labelled.map(({ leftText }) =>
        measureSceneText(leftText, labelSize, "interface")
      ),
    ) + G.axis.labelGap,
  );
  const plot: ChartRect = {
    x: plotLeft,
    y: 0,
    width: G.plot.valueExtent,
    height: Math.max(G.plot.valueExtent, spec.items.length * ITEM_HEADROOM),
  };
  const plotBottom = roundChartNumber(plot.y + plot.height);
  const plotRight = roundChartNumber(plot.x + plot.width);

  const valueScale = createChartLinearScale({
    domainMin: firstTick.number,
    domainMax: lastTick.number,
    rangeStart: plotBottom,
    rangeEnd: plot.y,
    subject: "Slope value axis",
  });

  // Every line shares the first series slot: item identity comes from the
  // direct labels, and movement direction from the geometry itself, so the
  // categorical palette has nothing to distinguish here.
  const paths: ChartDataPath[] = spec.items.map((item) => {
    const points: readonly ChartPoint[] = [
      {
        x: plot.x,
        y: roundChartNumber(chartLinearPosition(valueScale, item.before)),
      },
      {
        x: plotRight,
        y: roundChartNumber(chartLinearPosition(valueScale, item.after)),
      },
    ];
    return {
      kind: "data-path",
      id: `path-${item.id}`,
      seriesId: item.id,
      paint: "series-1",
      lineWidth: LINE_WIDTH,
      points,
      bounds: chartPointBounds(points, LINE_WIDTH / 2),
    };
  });

  const itemLabels = labelled.flatMap(({ item, leftText }) => {
    const yBefore = roundChartNumber(
      chartLinearPosition(valueScale, item.before),
    );
    const yAfter = roundChartNumber(
      chartLinearPosition(valueScale, item.after),
    );
    return [
      tickLabel({
        id: `before-label-${item.id}`,
        axis: "none",
        role: "annotation",
        text: leftText,
        anchor: "end",
        x: plot.x - G.axis.labelGap,
        baseline: yBefore + labelSize / 2 - 2,
        fontRole: "interface",
      }),
      tickLabel({
        id: `after-label-${item.id}`,
        axis: "none",
        role: "annotation",
        text: endpointValueText(spec, item.after),
        anchor: "start",
        x: plotRight + G.axis.labelGap,
        baseline: yAfter + labelSize / 2 - 2,
        fontRole: "interface",
      }),
    ];
  });

  // The endpoint names sit one extra label gap beneath the axes so the
  // lowest direct label keeps its clearance even when a value lands on the
  // bottom of the tick-covered domain.
  const endpointBaseline = plotBottom + G.axis.labelGap * 2 + labelSize;
  const endpointLabels = [
    tickLabel({
      id: "endpoint-before",
      axis: "category",
      role: "axis-label",
      text: spec.endpoints.before,
      anchor: "middle",
      x: plot.x,
      baseline: endpointBaseline,
      fontRole: "interface",
    }),
    tickLabel({
      id: "endpoint-after",
      axis: "category",
      role: "axis-label",
      text: spec.endpoints.after,
      anchor: "middle",
      x: plotRight,
      baseline: endpointBaseline,
      fontRole: "interface",
    }),
  ];

  const labels = [...itemLabels, ...endpointLabels];
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

  const elements: ChartSceneElement[] = [
    ...paths,
    axisLine("axis-before", plot.x, plot.y, plotBottom),
    axisLine("axis-after", plotRight, plot.y, plotBottom),
    ...labels,
  ];
  const content = chartRectUnion(elements.map(({ bounds }) => bounds));
  const padding = G.canvasPadding;
  return {
    kind: "chart-scene",
    sourceKind: "slope",
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
