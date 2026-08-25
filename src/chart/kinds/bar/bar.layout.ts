/** Deterministic scale-driven layout for bar charts. */

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
import {
  type ChartBandScale,
  chartBandSegment,
  chartLinearPosition,
  type ChartLinearScale,
  createChartBandScale,
  createChartLinearScale,
} from "../../scale.ts";
import type {
  ChartAxisLine,
  ChartMark,
  ChartPoint,
  ChartRect,
  ChartScene,
  ChartSceneElement,
  ChartTickLabel,
} from "../../scene.ts";
import { chartLinearTicks } from "../../ticks.ts";
import type { ValidatedBarChart } from "./bar.spec.ts";

const G = CHART_GEOMETRY;

/**
 * Smallest truthful mark extent in scene units. A stated nonzero value whose
 * bar would round below this cannot render without either disappearing or
 * lying about length, so layout refuses instead.
 */
const MINIMUM_MARK_EXTENT = 1;

function subResolution(value: number, path: string): never {
  throw new ChartValidationError({
    code: "chart/sub-resolution",
    message:
      `${path} states ${value}, too small beside the largest values to render truthfully at the fixed resolution.`,
    path,
    facts: { value },
    remedy:
      "Split the figure by magnitude or aggregate the smallest members; a log scale is not yet available.",
  });
}

function labelCollision(): never {
  throw new ChartValidationError({
    code: "chart/layout/label-fit",
    message: "Axis labels have no deterministic clear placement.",
    path: "spec",
    remedy:
      "Shorten the colliding labels, use the horizontal orientation for long category labels, or choose a more compact value format.",
  });
}

interface BarTick {
  readonly value: number;
  readonly label: string;
}

function barTicks(spec: ValidatedBarChart): readonly BarTick[] {
  const set = chartLinearTicks({
    minimum: 0,
    maximum: spec.variant === "proportion" ? 1 : spec.maximumValue,
    targetCount: G.axis.valueTickTarget,
    subject: "Bar value axis",
  });
  const format = spec.value.format ??
    (spec.variant === "proportion"
      ? {
        kind: "percent" as const,
        decimals: Math.max(0, -(set.step.exponent + 2)),
      }
      : undefined);
  return set.ticks.map((tick) => ({
    value: tick.number,
    label: format === undefined
      ? tick.label
      : formatChartNumber(tick.number, format),
  }));
}

function axisLine(
  id: string,
  axis: ChartAxisLine["axis"],
  start: ChartPoint,
  end: ChartPoint,
): ChartAxisLine {
  return {
    kind: "axis-line",
    id,
    axis,
    lineWidth: G.axis.lineWidth,
    start,
    end,
    bounds: chartPointBounds([start, end], G.axis.lineWidth / 2),
  };
}

function tickLabel(options: {
  readonly id: string;
  readonly axis: ChartTickLabel["axis"];
  readonly text: string;
  readonly anchor: ChartTickLabel["anchor"];
  readonly x: number;
  readonly baseline: number;
  readonly fontRole: ChartTickLabel["fontRole"];
}): ChartTickLabel {
  const width = measureSceneText(
    options.text,
    G.text.labelSize,
    options.fontRole,
  );
  const left = options.anchor === "start"
    ? options.x
    : options.anchor === "middle"
    ? options.x - width / 2
    : options.x - width;
  return {
    kind: "tick-label",
    id: options.id,
    axis: options.axis,
    role: "axis-label",
    text: options.text,
    anchor: options.anchor,
    x: roundChartNumber(options.x),
    baseline: roundChartNumber(options.baseline),
    fontRole: options.fontRole,
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

function categoryStepFor(spec: ValidatedBarChart): number {
  if (spec.variant === "proportion") return G.plot.categoryStepBase;
  return Math.max(
    G.plot.categoryStepBase,
    G.plot.categoryStepPerSeries * (spec.series.length + 1),
  );
}

interface MarkGeometry {
  readonly categoryStart: number;
  readonly categoryExtent: number;
  readonly valueStart: number;
  readonly valueExtent: number;
}

/** Orientation-neutral mark geometry: category span crossed with value run. */
function markGeometry(
  spec: ValidatedBarChart,
  categoryScale: ChartBandScale,
  valueScale: ChartLinearScale,
  baseline: number,
): readonly (MarkGeometry & {
  readonly seriesIndex: number;
  readonly categoryIndex: number;
})[] {
  const marks: (MarkGeometry & {
    readonly seriesIndex: number;
    readonly categoryIndex: number;
  })[] = [];
  spec.categories.forEach((_category, categoryIndex) => {
    const segment = chartBandSegment(categoryScale, categoryIndex);
    if (spec.variant === "grouped") {
      const inner = createChartBandScale({
        count: spec.series.length,
        rangeStart: segment.start,
        rangeEnd: segment.start + segment.width,
        gapRatio: spec.series.length === 1 ? 0 : G.plot.seriesGapRatio,
        subject: "Bar series group",
      });
      spec.series.forEach((series, seriesIndex) => {
        const value = series.values[categoryIndex];
        if (value === null || value === undefined || value === 0) return;
        const bar = chartBandSegment(inner, seriesIndex);
        const position = roundChartNumber(
          chartLinearPosition(valueScale, value),
        );
        const extent = roundChartNumber(Math.abs(position - baseline));
        if (extent < MINIMUM_MARK_EXTENT) {
          subResolution(
            value,
            `spec.series[${seriesIndex}].values[${categoryIndex}]`,
          );
        }
        marks.push({
          categoryStart: roundChartNumber(bar.start),
          categoryExtent: roundChartNumber(bar.width),
          valueStart: Math.min(baseline, position),
          valueExtent: extent,
          seriesIndex,
          categoryIndex,
        });
      });
      return;
    }
    const total = spec.series.reduce(
      (sum, series) => sum + (series.values[categoryIndex] ?? 0),
      0,
    );
    let cumulative = 0;
    let previous = baseline;
    spec.series.forEach((series, seriesIndex) => {
      const value = series.values[categoryIndex];
      if (value === null || value === undefined) return;
      cumulative += value / total;
      const position = roundChartNumber(
        chartLinearPosition(valueScale, cumulative),
      );
      if (value === 0) {
        previous = position;
        return;
      }
      const extent = roundChartNumber(Math.abs(position - previous));
      if (extent < MINIMUM_MARK_EXTENT) {
        subResolution(
          value,
          `spec.series[${seriesIndex}].values[${categoryIndex}]`,
        );
      }
      marks.push({
        categoryStart: roundChartNumber(segment.start),
        categoryExtent: roundChartNumber(segment.width),
        valueStart: Math.min(previous, position),
        valueExtent: extent,
        seriesIndex,
        categoryIndex,
      });
      previous = position;
    });
  });
  return marks;
}

/** Lay a validated bar chart into one projection-neutral scene. */
export default function layoutBarChart(spec: ValidatedBarChart): ChartScene {
  const ticks = barTicks(spec);
  const domainTop = ticks.at(-1)?.value ?? 1;
  const vertical = spec.orientation === "vertical";

  const labelSize = G.text.labelSize;
  const valueLabelWidths = ticks.map((tick) =>
    measureSceneText(tick.label, labelSize, "mono")
  );
  const categoryLabelWidths = spec.categories.map((category) =>
    measureSceneText(category.label, labelSize, "interface")
  );

  const categoryStep = Math.max(
    categoryStepFor(spec),
    vertical
      ? roundChartNumber(
        Math.max(...categoryLabelWidths) + G.text.clearance * 2,
      )
      : 0,
  );
  const categorySpan = roundChartNumber(
    categoryStep * spec.categories.length,
  );

  const plotLeft = roundChartNumber(
    (vertical
      ? Math.max(...valueLabelWidths)
      : Math.max(...categoryLabelWidths)) + G.axis.labelGap,
  );
  const plot: ChartRect = vertical
    ? { x: plotLeft, y: 0, width: categorySpan, height: G.plot.valueExtent }
    : { x: plotLeft, y: 0, width: G.plot.valueExtent, height: categorySpan };
  const plotBottom = roundChartNumber(plot.y + plot.height);
  const plotRight = roundChartNumber(plot.x + plot.width);

  const valueScale = createChartLinearScale({
    domainMin: 0,
    domainMax: domainTop,
    rangeStart: vertical ? plotBottom : plot.x,
    rangeEnd: vertical ? plot.y : plotRight,
    subject: "Bar value axis",
  });
  const categoryScale = createChartBandScale({
    count: spec.categories.length,
    rangeStart: vertical ? plot.x : plot.y,
    rangeEnd: vertical ? plotRight : plotBottom,
    gapRatio: G.plot.categoryGapRatio,
    subject: "Bar category axis",
  });
  const baseline = vertical ? plotBottom : plot.x;

  const marks: ChartMark[] = markGeometry(
    spec,
    categoryScale,
    valueScale,
    baseline,
  ).map((geometry) => {
    const series = spec.series[geometry.seriesIndex];
    const category = spec.categories[geometry.categoryIndex];
    if (series === undefined || category === undefined) {
      throw new ChartValidationError({
        code: "chart/layout/non-finite",
        message: "Bar layout addressed a series or category outside the spec.",
        remedy: "Fix the bar layout authority.",
      });
    }
    return {
      kind: "mark",
      id: `mark-${series.id}-${category.id}`,
      seriesId: series.id,
      categoryId: category.id,
      paint: `series-${series.slot}` as const,
      bounds: vertical
        ? {
          x: geometry.categoryStart,
          y: geometry.valueStart,
          width: geometry.categoryExtent,
          height: geometry.valueExtent,
        }
        : {
          x: geometry.valueStart,
          y: geometry.categoryStart,
          width: geometry.valueExtent,
          height: geometry.categoryExtent,
        },
    };
  });

  const baselineLine = vertical
    ? axisLine(
      "axis-baseline",
      "category",
      { x: plot.x, y: plotBottom },
      { x: plotRight, y: plotBottom },
    )
    : axisLine(
      "axis-baseline",
      "category",
      { x: plot.x, y: plot.y },
      { x: plot.x, y: plotBottom },
    );

  const valueLabels = ticks.map((tick, index) => {
    const position = roundChartNumber(
      chartLinearPosition(valueScale, tick.value),
    );
    return tickLabel(
      vertical
        ? {
          id: `value-tick-${index}`,
          axis: "value",
          text: tick.label,
          anchor: "end",
          x: plot.x - G.axis.labelGap,
          baseline: position + labelSize / 2 - 2,
          fontRole: "mono",
        }
        : {
          id: `value-tick-${index}`,
          axis: "value",
          text: tick.label,
          anchor: "middle",
          x: position,
          baseline: plotBottom + G.axis.labelGap + labelSize,
          fontRole: "mono",
        },
    );
  });

  const categoryLabels = spec.categories.map((category, index) => {
    const segment = chartBandSegment(categoryScale, index);
    const center = segment.start + segment.width / 2;
    return tickLabel(
      vertical
        ? {
          id: `category-label-${category.id}`,
          axis: "category",
          text: category.label,
          anchor: "middle",
          x: center,
          baseline: plotBottom + G.axis.labelGap + labelSize,
          fontRole: "interface",
        }
        : {
          id: `category-label-${category.id}`,
          axis: "category",
          text: category.label,
          anchor: "end",
          x: plot.x - G.axis.labelGap,
          baseline: center + labelSize / 2 - 2,
          fontRole: "interface",
        },
    );
  });

  const labels = [...valueLabels, ...categoryLabels];
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

  const elements: ChartSceneElement[] = [...marks, baselineLine, ...labels];
  const content = chartRectUnion(elements.map(({ bounds }) => bounds));
  const padding = G.canvasPadding;
  return {
    kind: "chart-scene",
    sourceKind: "bar",
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
