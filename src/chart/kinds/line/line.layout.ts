/** Deterministic scale-driven layout for line charts. */

import { measureSceneText } from "../../../internal/font-metrics.ts";
import { chartDecimalFromNumber, chartDecimalOrder } from "../../decimal.ts";
import { ChartValidationError } from "../../errors.ts";
import { formatChartNumber } from "../../format.ts";
import {
  CHART_GEOMETRY,
  chartPointBounds,
  chartRectsOverlap,
  chartRectUnion,
  roundChartNumber,
} from "../../geometry.ts";
import { chartAxisLine, chartTickLabel } from "../../kind-layout.ts";
import {
  chartLinearPosition,
  chartLogPosition,
  createChartLinearScale,
  createChartLogScale,
  resolveChartPaddedDomain,
} from "../../scale.ts";
import type {
  ChartAxisLine,
  ChartPoint,
  ChartRect,
  ChartScene,
  ChartSceneElement,
  ChartTickLabel,
} from "../../scene.ts";
import {
  chartLinearTicks,
  chartLogTicks,
  chartTimeTicks,
} from "../../ticks.ts";
import type { ValidatedLineChart } from "./line.spec.ts";

const G = CHART_GEOMETRY;

/** Horizontal extent of the ordered domain in scene units. */
const DOMAIN_EXTENT = 360;
/** Stroke width of every series path. */
const PATH_LINE_WIDTH = 2;
/** Radius of an isolated stated point between declared gaps. */
const ISOLATED_POINT_RADIUS = 3;

function labelCollision(): never {
  throw new ChartValidationError({
    code: "chart/layout/label-fit",
    message: "Axis labels have no deterministic clear placement.",
    path: "spec",
    remedy:
      "Shorten the colliding labels, choose a more compact value or domain format, or split the figure.",
  });
}

function layoutDefect(message: string): never {
  throw new ChartValidationError({
    code: "chart/layout/non-finite",
    message,
    remedy: "Fix the line layout authority.",
  });
}

interface LineTick {
  readonly value: number;
  readonly label: string;
}

/**
 * Symmetric padding for a flat linear domain: one decade unit of the flat
 * value's leading digit, or 1 around zero, so the tick authority's outward
 * coverage always has an upward span to cover.
 */
function flatPadding(value: number): number {
  if (value === 0) return 1;
  return 10 **
    chartDecimalOrder(
      chartDecimalFromNumber(Math.abs(value), "line flat domain"),
    );
}

function valueTicks(spec: ValidatedLineChart): readonly LineTick[] {
  const format = spec.value.format;
  const finish = (ticks: readonly { number: number; label: string }[]) =>
    ticks.map((tick) => ({
      value: tick.number,
      label: format === undefined
        ? tick.label
        : formatChartNumber(tick.number, format),
    }));
  if (spec.value.scale === "log") {
    // A flat positive domain pads by one decade in each direction.
    const flat = spec.minimumValue === spec.maximumValue;
    const domain = flat
      ? resolveChartPaddedDomain({
        value: spec.minimumValue,
        preferredMinimum: spec.minimumValue / 10,
        preferredMaximum: spec.maximumValue * 10,
        scale: "log",
        subject: "Line value axis",
      })
      : { minimum: spec.minimumValue, maximum: spec.maximumValue };
    const set = chartLogTicks({
      minimum: domain.minimum,
      maximum: domain.maximum,
      subject: "Line value axis",
    });
    return finish(set.ticks);
  }
  // The area fill measures from zero, so its domain anchors there; the plain
  // polyline positions values and honestly follows the stated extremes.
  let minimum = spec.variant === "area" ? 0 : spec.minimumValue;
  let maximum = spec.maximumValue;
  if (minimum === maximum) {
    const padding = flatPadding(minimum);
    const domain = resolveChartPaddedDomain({
      value: minimum,
      preferredMinimum: minimum - padding,
      preferredMaximum: maximum + padding,
      scale: "linear",
      subject: "Line value axis",
    });
    minimum = domain.minimum;
    maximum = domain.maximum;
  }
  const set = chartLinearTicks({
    minimum,
    maximum,
    targetCount: G.axis.valueTickTarget,
    subject: "Line value axis",
  });
  return finish(set.ticks);
}

function domainTicks(spec: ValidatedLineChart): readonly LineTick[] {
  if (spec.x.kind === "date") {
    const first = spec.x.ordinals[0];
    const last = spec.x.ordinals.at(-1);
    if (first === undefined || last === undefined) {
      layoutDefect("Line layout received an empty date domain.");
    }
    const set = chartTimeTicks({
      minimumOrdinal: first,
      maximumOrdinal: last,
      targetCount: G.axis.valueTickTarget,
      subject: "Line domain axis",
    });
    return set.ticks.map((tick) => ({
      value: tick.ordinal,
      label: tick.label,
    }));
  }
  const first = spec.x.values[0];
  const last = spec.x.values.at(-1);
  if (first === undefined || last === undefined) {
    layoutDefect("Line layout received an empty numeric domain.");
  }
  const format = spec.x.format;
  const set = chartLinearTicks({
    minimum: first,
    maximum: last,
    targetCount: G.axis.valueTickTarget,
    subject: "Line domain axis",
  });
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
  return chartAxisLine(id, axis, start, end);
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
  return chartTickLabel({ ...options, role: "axis-label" });
}

/** Lay a validated line chart into one projection-neutral scene. */
export default function layoutLineChart(spec: ValidatedLineChart): ChartScene {
  const vTicks = valueTicks(spec);
  const xTicks = domainTicks(spec);
  const labelSize = G.text.labelSize;

  const valueLabelWidths = vTicks.map((tick) =>
    measureSceneText(tick.label, labelSize, "mono")
  );
  const plotLeft = roundChartNumber(
    Math.max(...valueLabelWidths) + G.axis.labelGap,
  );
  const plot: ChartRect = {
    x: plotLeft,
    y: 0,
    width: DOMAIN_EXTENT,
    height: G.plot.valueExtent,
  };
  const plotBottom = roundChartNumber(plot.y + plot.height);
  const plotRight = roundChartNumber(plot.x + plot.width);

  const xFirst = xTicks[0];
  const xLast = xTicks.at(-1);
  const vFirst = vTicks[0];
  const vLast = vTicks.at(-1);
  if (
    xFirst === undefined || xLast === undefined || vFirst === undefined ||
    vLast === undefined
  ) {
    layoutDefect("Line layout received an empty tick coverage.");
  }
  const xScale = createChartLinearScale({
    domainMin: xFirst.value,
    domainMax: xLast.value,
    rangeStart: plot.x,
    rangeEnd: plotRight,
    subject: "Line domain axis",
  });
  const valuePosition = spec.value.scale === "log"
    ? (() => {
      const scale = createChartLogScale({
        domainMin: vFirst.value,
        domainMax: vLast.value,
        rangeStart: plotBottom,
        rangeEnd: plot.y,
        subject: "Line value axis",
      });
      return (value: number) => chartLogPosition(scale, value);
    })()
    : (() => {
      const scale = createChartLinearScale({
        domainMin: vFirst.value,
        domainMax: vLast.value,
        rangeStart: plotBottom,
        rangeEnd: plot.y,
        subject: "Line value axis",
      });
      return (value: number) => chartLinearPosition(scale, value);
    })();

  const positions = spec.x.kind === "date" ? spec.x.ordinals : spec.x.values;
  const areaElements: ChartSceneElement[] = [];
  const pathElements: ChartSceneElement[] = [];
  for (const series of spec.series) {
    const paint = `series-${series.slot}` as const;
    let segment: ChartPoint[] = [];
    let segmentValues: number[] = [];
    let segmentIndex = 0;
    const flush = (): void => {
      if (segment.length === 0) return;
      segmentIndex += 1;
      if (segment.length === 1) {
        const point = segment[0];
        if (point !== undefined) {
          pathElements.push({
            kind: "data-points",
            id: `point-${series.id}-${segmentIndex}`,
            seriesId: series.id,
            paint,
            radius: ISOLATED_POINT_RADIUS,
            points: Object.freeze([point]),
            bounds: chartPointBounds([point], ISOLATED_POINT_RADIUS),
          });
        }
      } else {
        const points = Object.freeze([...segment]);
        const first = points[0];
        const last = points.at(-1);
        // A segment whose stated values are all zero fills nothing, so no
        // zero-height area is emitted for it; the path still draws the flat
        // baseline run.
        if (
          spec.variant === "area" && first !== undefined &&
          last !== undefined && segmentValues.some((value) => value > 0)
        ) {
          const areaPoints = Object.freeze([
            { x: first.x, y: plotBottom },
            ...points,
            { x: last.x, y: plotBottom },
          ]);
          areaElements.push({
            kind: "area",
            id: `area-${series.id}-${segmentIndex}`,
            seriesId: series.id,
            paint,
            points: areaPoints,
            bounds: chartPointBounds(areaPoints, 0),
          });
        }
        pathElements.push({
          kind: "data-path",
          id: `path-${series.id}-${segmentIndex}`,
          seriesId: series.id,
          paint,
          lineWidth: PATH_LINE_WIDTH,
          points,
          bounds: chartPointBounds(points, PATH_LINE_WIDTH / 2),
        });
      }
      segment = [];
      segmentValues = [];
    };
    series.values.forEach((cell, index) => {
      if (cell === null) {
        flush();
        return;
      }
      const domainPosition = positions[index];
      if (domainPosition === undefined) {
        layoutDefect(
          "Line layout addressed a domain position outside the spec.",
        );
      }
      segment.push({
        x: roundChartNumber(chartLinearPosition(xScale, domainPosition)),
        y: roundChartNumber(valuePosition(cell)),
      });
      segmentValues.push(cell);
    });
    flush();
  }

  const baselineLine = axisLine(
    "axis-baseline",
    "category",
    { x: plot.x, y: plotBottom },
    { x: plotRight, y: plotBottom },
  );

  const valueLabels = vTicks.map((tick, index) =>
    tickLabel({
      id: `value-tick-${index}`,
      axis: "value",
      text: tick.label,
      anchor: "end",
      x: plot.x - G.axis.labelGap,
      baseline: roundChartNumber(valuePosition(tick.value)) + labelSize / 2 - 2,
      fontRole: "mono",
    })
  );
  // The first domain tick sits at the plot's left edge, so its middle-anchored
  // label reaches under the bottom value label; a doubled label gap keeps the
  // corner pair clear of the shared text clearance.
  const domainLabels = xTicks.map((tick, index) =>
    tickLabel({
      id: `domain-tick-${index}`,
      axis: "category",
      text: tick.label,
      anchor: "middle",
      x: roundChartNumber(chartLinearPosition(xScale, tick.value)),
      baseline: plotBottom + G.axis.labelGap * 2 + labelSize,
      fontRole: "mono",
    })
  );

  const labels = [...valueLabels, ...domainLabels];
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
    ...areaElements,
    ...pathElements,
    baselineLine,
    ...labels,
  ];
  const content = chartRectUnion(elements.map(({ bounds }) => bounds));
  const padding = G.canvasPadding;
  return {
    kind: "chart-scene",
    sourceKind: "line",
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
