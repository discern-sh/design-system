/**
 * Pure exact-tier terminal projection for validated distribution charts.
 *
 * The histogram frame prints every bin's full range and count beside its
 * eighth-block-scaled bar, and the box frame prints all five summary
 * numbers beneath the gestural whisker row — that annotation layer is what
 * earns the kind's declared `exact` honesty tier: within the accepted width
 * envelope nothing is cropped, abbreviated, resampled, or rounded away.
 * Every quantization keeps the honesty invariants: half-away-from-zero
 * rounding, at least one eighth block (one full cell at ASCII) for any
 * nonzero count, an always-visible median cell, and a typed decline instead
 * of a hidden fact.
 */

import { styleText } from "../../../cli/ansi.ts";
import { renderBox } from "../../../cli/box.ts";
import type {
  ChartKindCliDeclineCode,
  ChartKindCliProjection,
  ChartKindCliProjectorContext,
} from "../../../cli/chart-kinds.ts";
import {
  BOX_SUMMARY_GLYPHS,
  HORIZONTAL_EIGHTH_RAMP,
  rampGlyph,
  rampStepForFraction,
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
import { chartLinearFraction } from "../../scale.ts";
import { chartValueText } from "../../value-text.ts";
import type { ChartNumberFormat } from "../../format.ts";
import {
  distributionCountText,
  distributionRangeText,
  distributionRecordedValueRows,
  distributionUnitSuffix,
} from "./distribution.description.ts";
import type {
  ValidatedDistributionBoxChart,
  ValidatedDistributionChart,
  ValidatedDistributionHistogramChart,
} from "./distribution.spec.ts";

const LABEL_GAP = 2;
const BAR_FIELD_FLOOR = 8;
const BAR_FIELD_CEILING = 48;

function decline(
  code: ChartKindCliDeclineCode,
  fact: number,
  limit: number,
): ChartKindCliProjection {
  return { kind: "declined", code, fact, limit };
}

interface DistributionPresentation {
  readonly theme: TerminalTheme;
  readonly capabilities: ChartKindCliProjectorContext["capabilities"];
  readonly unit: string;
  readonly format: ChartNumberFormat | undefined;
  readonly inner: number;
}

function accentText(
  presentation: DistributionPresentation,
  text: string,
): string {
  return text === "" ? "" : styleText(
    text,
    { color: terminalToneColor(presentation.theme, "accent") },
    presentation.capabilities,
  );
}

function mutedText(
  presentation: DistributionPresentation,
  text: string,
): string {
  return styleText(
    text,
    {
      color: terminalThemeColor(
        presentation.theme,
        "--discern-color-ink-muted",
      ),
      ...presentation.theme.typography.annotation,
    },
    presentation.capabilities,
  );
}

/** The bin-range column text in the frame's glyph repertoire. */
function rangeText(
  presentation: DistributionPresentation,
  start: number,
  end: number,
): string {
  return `${
    distributionRangeText(
      start,
      end,
      presentation.capabilities.unicode ? "–" : "-",
      presentation.format,
    )
  }${presentation.unit}`;
}

/**
 * Quantize one count onto the bar field. Rounding is half-away-from-zero
 * through the shared ramp authority, a nonzero count keeps at least one
 * eighth (one full ASCII cell), and zero renders no glyph at all.
 */
function barGlyphs(
  presentation: DistributionPresentation,
  count: number,
  maximumCount: number,
  barField: number,
): string {
  const fraction = count / maximumCount;
  const fullCell = HORIZONTAL_EIGHTH_RAMP[HORIZONTAL_EIGHTH_RAMP.length - 1];
  if (fullCell === undefined) {
    throw new TypeError("the eighth-block ramp has no full-cell member");
  }
  if (!presentation.capabilities.unicode) {
    return rampGlyph(fullCell, false)
      .repeat(rampStepForFraction(fraction, barField));
  }
  const eighths = rampStepForFraction(fraction, barField * 8);
  const wholeCells = Math.floor(eighths / 8);
  const remainder = eighths % 8;
  const tail = remainder === 0
    ? ""
    : HORIZONTAL_EIGHTH_RAMP[remainder - 1]?.unicode ?? "";
  return `${rampGlyph(fullCell, true).repeat(wholeCells)}${tail}`;
}

interface HistogramGeometry {
  readonly refusal?: ChartKindCliProjection;
  readonly labelColumn: number;
  readonly barField: number;
}

function histogramGeometry(
  spec: ValidatedDistributionHistogramChart,
  presentation: DistributionPresentation,
  width: number,
): HistogramGeometry {
  const labelColumn = Math.max(
    ...spec.bins.map((bin) =>
      measureText(rangeText(presentation, bin.start, bin.end))
    ),
  );
  const countWidth = Math.max(
    ...spec.bins.map((bin) => measureText(distributionCountText(bin.count))),
  );
  const minimum = 4 + labelColumn + LABEL_GAP + BAR_FIELD_FLOOR + 1 +
    countWidth;
  if (width < minimum) {
    return {
      refusal: decline("width", width, minimum),
      labelColumn: 0,
      barField: 0,
    };
  }
  const barField = Math.min(
    BAR_FIELD_CEILING,
    presentation.inner - labelColumn - LABEL_GAP - 1 - countWidth,
  );
  return { labelColumn, barField };
}

function histogramRows(
  spec: ValidatedDistributionHistogramChart,
  presentation: DistributionPresentation,
  geometry: HistogramGeometry,
): readonly string[] {
  const maximumCount = Math.max(...spec.bins.map((bin) => bin.count));
  return spec.bins.map((bin) => {
    const label = padText(
      mutedText(presentation, rangeText(presentation, bin.start, bin.end)),
      geometry.labelColumn,
    );
    const bar = accentText(
      presentation,
      barGlyphs(presentation, bin.count, maximumCount, geometry.barField),
    );
    const count = distributionCountText(bin.count);
    const cell = bar === "" ? count : `${bar} ${count}`;
    return `${label}${" ".repeat(LABEL_GAP)}${cell}`;
  });
}

/**
 * The five-number glyph row: whisker caps, whisker runs, the interquartile
 * body, and the median, positioned by half-away-from-zero quantization over
 * the row width. The median cell always renders, even when it quantizes
 * onto a body edge or cap — the gestural row must never hide the centre.
 */
function boxRow(
  spec: ValidatedDistributionBoxChart,
  presentation: DistributionPresentation,
  field: number,
): string {
  const five = spec.fiveNumberSummary;
  const position = (value: number): number =>
    Math.round(
      chartLinearFraction(five.minimum, five.maximum, value) * (field - 1),
    );
  const atMinimum = position(five.minimum);
  const atLower = position(five.lowerQuartile);
  const atMedian = position(five.median);
  const atUpper = position(five.upperQuartile);
  const atMaximum = position(five.maximum);
  const unicode = presentation.capabilities.unicode;
  let row = "";
  for (let cell = atMinimum; cell <= atMaximum; cell += 1) {
    row += cell === atMedian
      ? rampGlyph(BOX_SUMMARY_GLYPHS.median, unicode)
      : cell === atMinimum
      ? rampGlyph(BOX_SUMMARY_GLYPHS.capStart, unicode)
      : cell === atMaximum
      ? rampGlyph(BOX_SUMMARY_GLYPHS.capEnd, unicode)
      : cell >= atLower && cell <= atUpper
      ? rampGlyph(BOX_SUMMARY_GLYPHS.body, unicode)
      : rampGlyph(BOX_SUMMARY_GLYPHS.whisker, unicode);
  }
  return accentText(presentation, row);
}

interface BoxAnnotations {
  readonly refusal?: ChartKindCliProjection;
  readonly lines: readonly string[];
}

interface RecordedValueLines {
  readonly refusal?: ChartKindCliProjection;
  readonly lines: readonly string[];
}

/** Every source measurement, indexed and packed in authored order. */
function recordedValueLines(
  spec: ValidatedDistributionChart,
  presentation: DistributionPresentation,
): RecordedValueLines {
  const items = distributionRecordedValueRows(spec).map(([index, value]) =>
    `#${index} ${value}`
  );
  for (const item of items) {
    const width = measureText(item);
    if (width > presentation.inner) {
      return {
        refusal: decline("label-wrap", width, presentation.inner),
        lines: [],
      };
    }
  }
  const lines: string[] = [];
  let current = "";
  let currentWidth = 0;
  for (const item of items) {
    const width = measureText(item);
    if (current === "") {
      current = item;
      currentWidth = width;
    } else if (currentWidth + 2 + width <= presentation.inner) {
      current = `${current}, ${item}`;
      currentWidth += 2 + width;
    } else {
      lines.push(current);
      current = item;
      currentWidth = width;
    }
  }
  if (current !== "") lines.push(current);
  return { lines: [mutedText(presentation, "Values:"), ...lines] };
}

/** The lossless layer: all five labelled numbers, wrapped at item boundaries. */
function boxAnnotationLines(
  spec: ValidatedDistributionBoxChart,
  presentation: DistributionPresentation,
): BoxAnnotations {
  const five = spec.fiveNumberSummary;
  const items: readonly {
    readonly label: string;
    readonly value: number;
  }[] = [
    { label: "min", value: five.minimum },
    { label: "Q1", value: five.lowerQuartile },
    { label: "median", value: five.median },
    { label: "Q3", value: five.upperQuartile },
    { label: "max", value: five.maximum },
  ];
  const rendered = items.map((item) => {
    const value = chartValueText(
      item.value,
      presentation.unit,
      presentation.format,
    );
    return {
      rendered: `${mutedText(presentation, item.label)} ${value}`,
      width: measureText(item.label) + 1 + measureText(value),
    };
  });
  for (const item of rendered) {
    if (item.width > presentation.inner) {
      return {
        refusal: decline("label-wrap", item.width, presentation.inner),
        lines: [],
      };
    }
  }
  const lines: string[] = [];
  let current = "";
  let currentWidth = 0;
  for (const item of rendered) {
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
  return { lines };
}

/** The bottom-border inventory: bins or numbers, then the sample size. */
function bottomLabel(
  spec: ValidatedDistributionChart,
  presentation: DistributionPresentation,
): string {
  const inventory = spec.variant === "histogram"
    ? `${spec.bins.length} ${spec.bins.length === 1 ? "bin" : "bins"}`
    : "5 numbers";
  const separator = presentation.capabilities.unicode ? "·" : "|";
  return `${inventory} ${separator} ${
    distributionCountText(spec.values.length)
  }`;
}

function renderFrame(
  spec: ValidatedDistributionChart,
  presentation: DistributionPresentation,
  width: number,
  bodyBlocks: readonly string[],
): string {
  const summary = styleText(
    `Summary: ${spec.summary}`,
    {
      color: terminalThemeColor(
        presentation.theme,
        "--discern-color-ink-muted",
      ),
      ...presentation.theme.typography.body,
    },
    presentation.capabilities,
  );
  return renderBox(
    {
      title: spec.title,
      body: composeCliBlocks([summary, ...bodyBlocks]),
      width,
      borderStyle: {
        color: terminalThemeColor(
          presentation.theme,
          "--discern-color-border-strong",
        ),
      },
      bottomLabel: bottomLabel(spec, presentation),
      bottomLabelStyle: {
        color: terminalThemeColor(
          presentation.theme,
          "--discern-color-ink-faint",
        ),
        ...presentation.theme.typography.annotation,
      },
    },
    presentation.capabilities,
  );
}

/** Project one exact distribution frame, or decline without losing any fact. */
const projectDistributionChartCli = (
  spec: ValidatedDistributionChart,
  context: ChartKindCliProjectorContext,
): ChartKindCliProjection => {
  const width = Math.min(context.maxWidth, context.capabilities.columns);
  const presentation: DistributionPresentation = {
    theme: terminalThemes[context.theme],
    capabilities: context.capabilities,
    unit: distributionUnitSuffix(spec.value),
    format: spec.value.format,
    inner: width - 4,
  };
  // The bottom inventory states derived counts, so it joins the width
  // envelope: the frame declines rather than letting the border crop it.
  const inventoryMinimum = measureText(bottomLabel(spec, presentation)) + 5;
  if (width < inventoryMinimum) {
    return decline("width", width, inventoryMinimum);
  }
  const embedTitle = (): ChartKindCliProjection | undefined => {
    const titleWidth = measureText(spec.title);
    return titleWidth > width - 6
      ? decline("title-width", titleWidth, width - 6)
      : undefined;
  };
  if (spec.variant === "histogram") {
    const geometry = histogramGeometry(spec, presentation, width);
    if (geometry.refusal !== undefined) return geometry.refusal;
    const values = recordedValueLines(spec, presentation);
    if (values.refusal !== undefined) return values.refusal;
    const titleRefusal = embedTitle();
    if (titleRefusal !== undefined) return titleRefusal;
    return {
      kind: "frame",
      frame: renderFrame(spec, presentation, width, [
        joinVertical([...histogramRows(spec, presentation, geometry)]),
        joinVertical([...values.lines]),
      ]),
    };
  }
  const minimum = 4 + BAR_FIELD_FLOOR;
  if (width < minimum) return decline("width", width, minimum);
  const annotations = boxAnnotationLines(spec, presentation);
  if (annotations.refusal !== undefined) return annotations.refusal;
  const values = recordedValueLines(spec, presentation);
  if (values.refusal !== undefined) return values.refusal;
  const titleRefusal = embedTitle();
  if (titleRefusal !== undefined) return titleRefusal;
  return {
    kind: "frame",
    frame: renderFrame(spec, presentation, width, [
      boxRow(spec, presentation, presentation.inner),
      joinVertical([...annotations.lines]),
      joinVertical([...values.lines]),
    ]),
  };
};

export default projectDistributionChartCli;
