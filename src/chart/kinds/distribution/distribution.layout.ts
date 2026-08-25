/** Deterministic scale-driven layout for distribution charts. */

import { measureSceneText } from "../../../internal/font-metrics.ts";
import { chartDecimalFromNumber, renderChartDecimal } from "../../decimal.ts";
import { ChartValidationError } from "../../errors.ts";
import { type ChartNumberFormat, formatChartNumber } from "../../format.ts";
import {
  CHART_GEOMETRY,
  chartPointBounds,
  chartRectsOverlap,
  chartRectUnion,
  roundChartNumber,
} from "../../geometry.ts";
import { chartLinearPosition, createChartLinearScale } from "../../scale.ts";
import type {
  ChartAxisLine,
  ChartMark,
  ChartPoint,
  ChartRect,
  ChartReferenceLine,
  ChartScene,
  ChartSceneElement,
  ChartTickLabel,
} from "../../scene.ts";
import { chartLinearTicks } from "../../ticks.ts";
import { chartPlainValue as plain } from "../../value-text.ts";
import type {
  ValidatedDistributionBoxChart,
  ValidatedDistributionChart,
  ValidatedDistributionHistogramChart,
} from "./distribution.spec.ts";

const G = CHART_GEOMETRY;

/**
 * Smallest truthful mark extent in scene units. A nonzero bin count or
 * interquartile range whose mark would round below this cannot render
 * without either disappearing or lying about extent, so layout refuses.
 */
const MINIMUM_MARK_EXTENT = 1;

/**
 * Horizontal room for the box figure: twice the shared value extent, so the
 * five direct annotations keep deterministic clearance on ordinary samples.
 */
const BOX_PLOT_WIDTH = G.plot.valueExtent * 2;

/** Vertical room for the single box row. */
const BOX_PLOT_HEIGHT = G.plot.categoryStepBase;

/** Height of the interquartile body, on the shared four-unit rhythm. */
const BOX_BODY_HEIGHT = G.rhythm * 6;

/** Height of the whisker caps at the minimum and maximum. */
const BOX_CAP_HEIGHT = G.rhythm * 4;

function subResolution(
  message: string,
  facts: Readonly<Record<string, string | number | boolean>>,
): never {
  throw new ChartValidationError({
    code: "chart/sub-resolution",
    message,
    path: "spec.values",
    facts,
    remedy:
      "Aggregate sparse bins or split the figure by magnitude; distribution extents keep their linear scale and zero count baseline.",
  });
}

function labelCollision(): never {
  throw new ChartValidationError({
    code: "chart/layout/label-fit",
    message: "Axis labels have no deterministic clear placement.",
    path: "spec",
    remedy:
      "Declare fewer or wider bins, choose a more compact value format, or split values that annotate almost the same position into their own figure.",
  });
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

function referenceLine(
  id: string,
  lineWidth: number,
  start: ChartPoint,
  end: ChartPoint,
): ChartReferenceLine {
  return {
    kind: "reference-line",
    id,
    lineWidth,
    start,
    end,
    bounds: chartPointBounds([start, end], lineWidth / 2),
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
}): ChartTickLabel {
  const width = measureSceneText(options.text, G.text.labelSize, "mono");
  const left = options.anchor === "start"
    ? options.x
    : options.anchor === "middle"
    ? options.x - width / 2
    : options.x - width;
  return {
    kind: "tick-label",
    id: options.id,
    axis: options.axis,
    role: options.role,
    text: options.text,
    anchor: options.anchor,
    x: roundChartNumber(options.x),
    baseline: roundChartNumber(options.baseline),
    fontRole: "mono",
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

function assertClearLabels(labels: readonly ChartTickLabel[]): void {
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
}

function sceneFromElements(
  sourceKind: "distribution",
  plot: ChartRect,
  elements: readonly ChartSceneElement[],
): ChartScene {
  const content = chartRectUnion(elements.map(({ bounds }) => bounds));
  const padding = G.canvasPadding;
  return {
    kind: "chart-scene",
    sourceKind,
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

/**
 * One edge tick label: the authored value format when declared, otherwise
 * the exact grouped decimal the shared tick authority renders. The edges
 * are the declared resolution, so the edges themselves are the ticks.
 */
function edgeLabelText(
  edge: number,
  format: ChartNumberFormat | undefined,
): string {
  return format === undefined
    ? renderChartDecimal(
      chartDecimalFromNumber(edge, "distribution edge"),
      true,
    )
    : formatChartNumber(edge, format);
}

function layoutHistogram(
  spec: ValidatedDistributionHistogramChart,
): ChartScene {
  const firstBin = spec.bins[0];
  const lastBin = spec.bins[spec.bins.length - 1];
  if (firstBin === undefined || lastBin === undefined) {
    throw new ChartValidationError({
      code: "chart/layout/non-finite",
      message: "Distribution layout received a histogram without bins.",
      remedy: "Fix the distribution validation authority.",
    });
  }
  const maximumCount = Math.max(...spec.bins.map((bin) => bin.count));
  // Counts are integers, so the tick target never exceeds one past the
  // largest count: the rough interval stays at least 1 and every nice step
  // — and therefore every count tick — stays an integer.
  const countTicks = chartLinearTicks({
    minimum: 0,
    maximum: maximumCount,
    targetCount: Math.min(G.axis.valueTickTarget, maximumCount + 1),
    subject: "Distribution count axis",
  }).ticks;
  const domainTop = countTicks.at(-1)?.number ?? 1;

  const labelSize = G.text.labelSize;
  const countLabelWidths = countTicks.map((tick) =>
    measureSceneText(tick.label, labelSize, "mono")
  );
  const plotLeft = roundChartNumber(
    Math.max(...countLabelWidths) + G.axis.labelGap,
  );
  const plot: ChartRect = {
    x: plotLeft,
    y: 0,
    width: Math.max(
      G.plot.valueExtent,
      spec.bins.length * G.plot.categoryStepBase,
    ),
    height: G.plot.valueExtent,
  };
  const plotBottom = roundChartNumber(plot.y + plot.height);
  const plotRight = roundChartNumber(plot.x + plot.width);

  const edgeScale = createChartLinearScale({
    domainMin: firstBin.start,
    domainMax: lastBin.end,
    rangeStart: plot.x,
    rangeEnd: plotRight,
    subject: "Distribution edge axis",
  });
  const countScale = createChartLinearScale({
    domainMin: 0,
    domainMax: domainTop,
    rangeStart: plotBottom,
    rangeEnd: plot.y,
    subject: "Distribution count axis",
  });

  const marks: ChartMark[] = [];
  spec.bins.forEach((bin, index) => {
    if (bin.count === 0) return;
    const left = roundChartNumber(chartLinearPosition(edgeScale, bin.start));
    const right = roundChartNumber(chartLinearPosition(edgeScale, bin.end));
    const top = roundChartNumber(chartLinearPosition(countScale, bin.count));
    const extent = roundChartNumber(plotBottom - top);
    if (extent < MINIMUM_MARK_EXTENT) {
      subResolution(
        `Bin ${bin.label} counts ${bin.count}, too small beside the largest bin to render truthfully at the fixed resolution.`,
        { count: bin.count, bin: bin.label },
      );
    }
    marks.push({
      kind: "mark",
      id: `mark-bin-${index}`,
      seriesId: "recorded",
      categoryId: `bin-${index}`,
      paint: "series-1",
      bounds: {
        x: left,
        y: top,
        width: roundChartNumber(right - left),
        height: extent,
      },
    });
  });

  const baseline = axisLine(
    "axis-baseline",
    { x: plot.x, y: plotBottom },
    { x: plotRight, y: plotBottom },
  );

  const countLabels = countTicks.map((tick, index) =>
    tickLabel({
      id: `count-tick-${index}`,
      axis: "value",
      role: "axis-label",
      text: tick.label,
      anchor: "end",
      x: plot.x - G.axis.labelGap,
      baseline: roundChartNumber(
        chartLinearPosition(countScale, tick.number) + labelSize / 2 - 2,
      ),
    })
  );
  const edges = [
    firstBin.start,
    ...spec.bins.map((bin) => bin.end),
  ];
  // The edge-label row sits two rhythm steps lower than the usual axis
  // row: the count-axis zero label overhangs the shared plot corner, and
  // the drop keeps the first edge label clear of it.
  const edgeLabels = edges.map((edge, index) =>
    tickLabel({
      id: `edge-tick-${index}`,
      axis: "value",
      role: "axis-label",
      text: edgeLabelText(edge, spec.value.format),
      anchor: "middle",
      x: roundChartNumber(chartLinearPosition(edgeScale, edge)),
      baseline: plotBottom + G.axis.labelGap + labelSize + G.rhythm * 2,
    })
  );
  const labels = [...countLabels, ...edgeLabels];
  assertClearLabels(labels);

  return sceneFromElements("distribution", plot, [
    ...marks,
    baseline,
    ...labels,
  ]);
}

function layoutBox(spec: ValidatedDistributionBoxChart): ChartScene {
  const five = spec.fiveNumberSummary;
  const ticks = chartLinearTicks({
    minimum: five.minimum,
    maximum: five.maximum,
    targetCount: G.axis.valueTickTarget,
    subject: "Distribution summary axis",
  }).ticks;
  const domainMin = ticks[0]?.number;
  const domainMax = ticks.at(-1)?.number;
  if (domainMin === undefined || domainMax === undefined) {
    throw new ChartValidationError({
      code: "chart/layout/non-finite",
      message: "Distribution layout derived no summary axis domain.",
      remedy: "Fix the distribution layout authority.",
    });
  }
  const plot: ChartRect = {
    x: 0,
    y: 0,
    width: BOX_PLOT_WIDTH,
    height: BOX_PLOT_HEIGHT,
  };
  const plotBottom = roundChartNumber(plot.y + plot.height);
  const plotRight = roundChartNumber(plot.x + plot.width);
  const center = roundChartNumber(plot.y + plot.height / 2);
  const scale = createChartLinearScale({
    domainMin,
    domainMax,
    rangeStart: plot.x,
    rangeEnd: plotRight,
    subject: "Distribution summary axis",
  });
  const position = (value: number): number =>
    roundChartNumber(chartLinearPosition(scale, value));

  const marks: ChartMark[] = [];
  const bodyWidth = roundChartNumber(
    position(five.upperQuartile) - position(five.lowerQuartile),
  );
  if (five.lowerQuartile !== five.upperQuartile) {
    if (bodyWidth < MINIMUM_MARK_EXTENT) {
      subResolution(
        `The interquartile range from ${plain(five.lowerQuartile)} to ${
          plain(five.upperQuartile)
        } is too small beside the plotted span to render truthfully.`,
        {
          lowerQuartile: five.lowerQuartile,
          upperQuartile: five.upperQuartile,
        },
      );
    }
    marks.push({
      kind: "mark",
      id: "mark-iqr",
      seriesId: "summary",
      categoryId: "iqr",
      paint: "series-1",
      bounds: {
        x: position(five.lowerQuartile),
        y: roundChartNumber(center - BOX_BODY_HEIGHT / 2),
        width: bodyWidth,
        height: BOX_BODY_HEIGHT,
      },
    });
  }

  const references: ChartReferenceLine[] = [];
  const whiskers: readonly {
    readonly id: string;
    readonly from: number;
    readonly to: number;
  }[] = [
    { id: "whisker-low", from: five.minimum, to: five.lowerQuartile },
    { id: "whisker-high", from: five.upperQuartile, to: five.maximum },
  ];
  for (const whisker of whiskers) {
    const start = position(whisker.from);
    const end = position(whisker.to);
    if (roundChartNumber(end - start) < MINIMUM_MARK_EXTENT) continue;
    references.push(referenceLine(
      whisker.id,
      G.axis.lineWidth,
      { x: start, y: center },
      { x: end, y: center },
    ));
  }
  const caps: readonly { readonly id: string; readonly at: number }[] = [
    { id: "cap-minimum", at: five.minimum },
    { id: "cap-maximum", at: five.maximum },
  ];
  for (const cap of caps) {
    references.push(referenceLine(
      cap.id,
      G.axis.lineWidth,
      { x: position(cap.at), y: roundChartNumber(center - BOX_CAP_HEIGHT / 2) },
      { x: position(cap.at), y: roundChartNumber(center + BOX_CAP_HEIGHT / 2) },
    ));
  }
  references.push(referenceLine(
    "median",
    2,
    {
      x: position(five.median),
      y: roundChartNumber(center - BOX_BODY_HEIGHT / 2),
    },
    {
      x: position(five.median),
      y: roundChartNumber(center + BOX_BODY_HEIGHT / 2),
    },
  ));

  const baseline = axisLine(
    "axis-baseline",
    { x: plot.x, y: plotBottom },
    { x: plotRight, y: plotBottom },
  );

  const firstRowBaseline = plotBottom + G.axis.labelGap + G.text.labelSize;
  const secondRowBaseline = firstRowBaseline + G.text.labelLineHeight +
    G.rhythm * 2;
  const annotations: readonly {
    readonly id: string;
    readonly value: number;
    readonly baseline: number;
  }[] = [
    {
      id: "summary-label-minimum",
      value: five.minimum,
      baseline: firstRowBaseline,
    },
    {
      id: "summary-label-median",
      value: five.median,
      baseline: firstRowBaseline,
    },
    {
      id: "summary-label-maximum",
      value: five.maximum,
      baseline: firstRowBaseline,
    },
    {
      id: "summary-label-lower-quartile",
      value: five.lowerQuartile,
      baseline: secondRowBaseline,
    },
    {
      id: "summary-label-upper-quartile",
      value: five.upperQuartile,
      baseline: secondRowBaseline,
    },
  ];
  const labels: ChartTickLabel[] = [];
  const seen = new Set<string>();
  for (const annotation of annotations) {
    const text = plain(annotation.value);
    const x = position(annotation.value);
    // Coinciding summary numbers annotate once: the repeated text at the
    // same position states nothing new and would only collide with itself.
    const identity = `${text}@${x}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    labels.push(tickLabel({
      id: annotation.id,
      axis: "none",
      role: "annotation",
      text,
      anchor: "middle",
      x,
      baseline: annotation.baseline,
    }));
  }
  assertClearLabels(labels);

  return sceneFromElements("distribution", plot, [
    ...marks,
    ...references,
    baseline,
    ...labels,
  ]);
}

/** Lay a validated distribution chart into one projection-neutral scene. */
export default function layoutDistributionChart(
  spec: ValidatedDistributionChart,
): ChartScene {
  return spec.variant === "histogram" ? layoutHistogram(spec) : layoutBox(spec);
}
