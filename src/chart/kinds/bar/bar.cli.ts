/**
 * Pure exact-tier terminal projection for validated bar charts.
 *
 * The frame prints every authored value beside its eighth-block-scaled bar,
 * which is what earns the kind's declared `exact` honesty tier: within the
 * accepted width envelope nothing is cropped, abbreviated, resampled, or
 * rounded away. Terminal bars are always horizontal regardless of the
 * spec's SVG-side orientation hint — the divergence ADR-0030 records —
 * and every quantization keeps the honesty invariants: a zero baseline,
 * half-away-from-zero rounding, at least one eighth block (one full cell
 * at ASCII) for any nonzero value, and a typed decline instead of a hidden
 * proportion segment.
 */

import { styleText } from "../../../cli/ansi.ts";
import type {
  ChartKindCliDeclineCode,
  ChartKindCliProjection,
  ChartKindCliProjector,
  ChartKindCliProjectorContext,
} from "../../../cli/chart-kinds.ts";
import { renderBox } from "../../../cli/box.ts";
import {
  allocateProportionalBlocks,
  HORIZONTAL_EIGHTH_RAMP,
  rampGlyph,
  rampStepForFraction,
  SERIES_FILLS,
  SERIES_MARKERS,
} from "../../../cli/glyph-ramps.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { composeCliBlocks } from "../../../cli/rhythm.ts";
import { measureText, padText, wrapText } from "../../../cli/text.ts";
import {
  type TerminalColor,
  type TerminalTheme,
  terminalThemeColor,
  terminalThemes,
} from "../../../cli/theme.ts";
import { barUnitSuffix, barValueText } from "./bar.description.ts";
import type { ValidatedBarChart, ValidatedBarChartSeries } from "./bar.spec.ts";

const LABEL_GAP = 2;
const GROUP_INDENT = 2;
const BAR_FIELD_FLOOR = 8;
const BAR_FIELD_CEILING = 48;

function decline(
  code: ChartKindCliDeclineCode,
  fact: number,
  limit: number,
): ChartKindCliProjection {
  return { kind: "declined", code, fact, limit };
}

interface BarPresentation {
  readonly spec: ValidatedBarChart;
  readonly theme: TerminalTheme;
  readonly capabilities: ChartKindCliProjectorContext["capabilities"];
  readonly unit: string;
  readonly inner: number;
  readonly barField: number;
  readonly labelColumn: number;
}

function seriesColor(
  theme: TerminalTheme,
  series: ValidatedBarChartSeries,
): TerminalColor {
  return terminalThemeColor(theme, `--discern-color-series-${series.slot}`);
}

function valueText(
  presentation: BarPresentation,
  value: number | null,
): string {
  return barValueText(value, presentation.unit);
}

/**
 * Quantize one value onto the bar field. Rounding is half-away-from-zero
 * through the shared ramp authority, a nonzero value keeps at least one
 * eighth (one full ASCII cell), and zero renders no glyph at all.
 */
function barGlyphs(
  presentation: BarPresentation,
  series: ValidatedBarChartSeries,
  value: number,
): string {
  const { spec, capabilities, barField } = presentation;
  const fraction = value / spec.maximumValue;
  const fill = SERIES_FILLS[series.slot - 1];
  if (fill === undefined) {
    throw new TypeError(`series slot ${series.slot} has no fill glyph`);
  }
  if (!capabilities.unicode) {
    return fill.ascii.repeat(rampStepForFraction(fraction, barField));
  }
  const eighths = rampStepForFraction(fraction, barField * 8);
  const wholeCells = Math.floor(eighths / 8);
  const remainder = eighths % 8;
  const tail = remainder === 0
    ? ""
    : HORIZONTAL_EIGHTH_RAMP[remainder - 1]?.unicode ?? "";
  return `${fill.unicode.repeat(wholeCells)}${tail}`;
}

function styledBar(
  presentation: BarPresentation,
  series: ValidatedBarChartSeries,
  value: number,
): string {
  const glyphs = barGlyphs(presentation, series, value);
  return glyphs === "" ? "" : styleText(
    glyphs,
    { color: seriesColor(presentation.theme, series) },
    presentation.capabilities,
  );
}

function mutedText(presentation: BarPresentation, text: string): string {
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

/** One data cell after its bar: `<bar> <value>`, or the value alone. */
function barWithValue(
  presentation: BarPresentation,
  series: ValidatedBarChartSeries,
  value: number | null,
): string {
  if (value === null) return mutedText(presentation, barValueText(null, ""));
  const bar = styledBar(presentation, series, value);
  const text = valueText(presentation, value);
  return bar === "" ? text : `${bar} ${text}`;
}

function legendLines(presentation: BarPresentation): readonly string[] {
  const { spec, capabilities, inner } = presentation;
  const items = spec.series.map((series) => {
    const marker = SERIES_MARKERS[series.slot - 1];
    if (marker === undefined) {
      throw new TypeError(`series slot ${series.slot} has no marker glyph`);
    }
    const glyph = styleText(
      rampGlyph(marker, capabilities.unicode),
      { color: seriesColor(presentation.theme, series) },
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

function singleSeriesRows(presentation: BarPresentation): readonly string[] {
  const { spec, labelColumn } = presentation;
  const series = spec.series[0];
  if (series === undefined) {
    throw new TypeError("a bar chart states at least one series");
  }
  return spec.categories.flatMap((category, index) => {
    const [first = "", ...continuations] = wrapText(
      category.label,
      labelColumn,
    );
    const cell = barWithValue(
      presentation,
      series,
      series.values[index] ?? null,
    );
    return [
      `${padText(first, labelColumn)}${" ".repeat(LABEL_GAP)}${cell}`,
      ...continuations,
    ];
  });
}

function groupedRows(presentation: BarPresentation): readonly string[] {
  const { spec, capabilities, inner } = presentation;
  return spec.categories.map((category, index) =>
    joinVertical([
      ...wrapText(category.label, inner),
      ...spec.series.map((series) => {
        const marker = SERIES_MARKERS[series.slot - 1];
        if (marker === undefined) {
          throw new TypeError(
            `series slot ${series.slot} has no marker glyph`,
          );
        }
        const glyph = styleText(
          rampGlyph(marker, capabilities.unicode),
          { color: seriesColor(presentation.theme, series) },
          capabilities,
        );
        return `${" ".repeat(GROUP_INDENT)}${glyph} ${
          barWithValue(presentation, series, series.values[index] ?? null)
        }`;
      }),
    ])
  );
}

function proportionRows(presentation: BarPresentation): readonly string[] {
  const { spec, capabilities, labelColumn, barField, inner } = presentation;
  const indent = labelColumn + LABEL_GAP;
  const valueMeasure = Math.max(1, inner - indent);
  return spec.categories.map((category, index) => {
    const shares = spec.series.map((series) => series.values[index] ?? 0);
    const blocks = allocateProportionalBlocks(shares, barField);
    const segments = spec.series.map((series, seriesIndex) => {
      const cells = blocks[seriesIndex] ?? 0;
      if (cells === 0) return "";
      const fill = SERIES_FILLS[series.slot - 1];
      if (fill === undefined) {
        throw new TypeError(`series slot ${series.slot} has no fill glyph`);
      }
      return styleText(
        rampGlyph(fill, capabilities.unicode).repeat(cells),
        { color: seriesColor(presentation.theme, series) },
        capabilities,
      );
    }).join("");
    const values = spec.series.map((series) =>
      `${series.label} ${valueText(presentation, series.values[index] ?? 0)}`
    ).join(", ");
    const [first = "", ...continuations] = wrapText(
      category.label,
      labelColumn,
    );
    return joinVertical([
      `${padText(first, labelColumn)}${" ".repeat(LABEL_GAP)}${segments}`,
      ...continuations,
      ...wrapText(values, valueMeasure).map((line) =>
        `${" ".repeat(indent)}${line}`
      ),
    ]);
  });
}

function widestWord(labels: readonly string[]): number {
  return Math.max(
    0,
    ...labels.flatMap((label) => label.split(/\s+/u)).map(measureText),
  );
}

interface BarViability {
  readonly refusal?: ChartKindCliProjection;
  readonly barField: number;
  readonly labelColumn: number;
}

function viability(
  spec: ValidatedBarChart,
  width: number,
): BarViability {
  const failed = (refusal: ChartKindCliProjection): BarViability => ({
    refusal,
    barField: 0,
    labelColumn: 0,
  });
  const inner = width - 4;
  const unit = barUnitSuffix(spec.value);
  const grouped = spec.variant === "grouped";
  const multiSeries = spec.series.length > 1;

  for (const series of spec.series) {
    const itemWidth = 2 + measureText(series.label);
    if (itemWidth > inner) {
      return failed(decline("label-wrap", itemWidth, inner));
    }
  }

  if (grouped && multiSeries) {
    const categoryWord = widestWord(
      spec.categories.map(({ label }) => label),
    );
    if (categoryWord > inner) {
      return failed(decline("label-wrap", categoryWord, inner));
    }
    const valueWidth = Math.max(
      measureText(barValueText(null, "")),
      ...spec.series.flatMap(({ values }) => values)
        .filter((value): value is number => value !== null)
        .map((value) => measureText(barValueText(value, unit))),
    );
    const minimum = 4 + GROUP_INDENT + 2 + BAR_FIELD_FLOOR + 1 + valueWidth;
    if (width < minimum) return failed(decline("width", width, minimum));
    const barField = Math.min(
      BAR_FIELD_CEILING,
      inner - GROUP_INDENT - 2 - 1 - valueWidth,
    );
    return { barField, labelColumn: 0 };
  }

  const labels = spec.categories.map(({ label }) => label);
  const labelWord = widestWord(labels);
  const naturalLabel = Math.max(...labels.map(measureText));
  if (grouped) {
    const valueWidth = Math.max(
      ...spec.series.flatMap(({ values }) => values).map((value) =>
        measureText(barValueText(value, unit))
      ),
    );
    const minimum = 4 + labelWord + LABEL_GAP + BAR_FIELD_FLOOR + 1 +
      valueWidth;
    if (width < minimum) return failed(decline("width", width, minimum));
    const labelColumn = Math.min(
      naturalLabel,
      inner - LABEL_GAP - BAR_FIELD_FLOOR - 1 - valueWidth,
    );
    const barField = Math.min(
      BAR_FIELD_CEILING,
      inner - labelColumn - LABEL_GAP - 1 - valueWidth,
    );
    return { barField, labelColumn };
  }

  const nonzeroSegments = Math.max(
    ...spec.categories.map((_category, index) =>
      spec.series.filter((series) => (series.values[index] ?? 0) > 0).length
    ),
  );
  const minimum = 4 + labelWord + LABEL_GAP + BAR_FIELD_FLOOR;
  if (width < minimum) return failed(decline("width", width, minimum));
  const labelColumn = Math.min(
    naturalLabel,
    inner - LABEL_GAP - BAR_FIELD_FLOOR,
  );
  const barField = Math.min(
    BAR_FIELD_CEILING,
    inner - labelColumn - LABEL_GAP,
  );
  if (barField < nonzeroSegments) {
    return failed(decline("segment-resolution", nonzeroSegments, barField));
  }
  return { barField, labelColumn };
}

function renderExactBar(
  spec: ValidatedBarChart,
  context: ChartKindCliProjectorContext,
  width: number,
  barField: number,
  labelColumn: number,
): string {
  const { capabilities } = context;
  const theme = terminalThemes[context.theme];
  const inner = width - 4;
  const presentation: BarPresentation = {
    spec,
    theme,
    capabilities,
    unit: barUnitSuffix(spec.value),
    inner,
    barField,
    labelColumn,
  };
  const summary = styleText(
    `Summary: ${spec.summary}`,
    {
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      ...theme.typography.body,
    },
    capabilities,
  );
  const multiSeries = spec.series.length > 1;
  const categories = spec.variant === "proportion"
    ? proportionRows(presentation)
    : multiSeries
    ? groupedRows(presentation)
    : [joinVertical([...singleSeriesRows(presentation)])];
  const blocks = [
    summary,
    joinVertical([...legendLines(presentation)]),
    ...categories,
  ];
  const separator = capabilities.unicode ? "·" : "|";
  const categoryCount = spec.categories.length === 1
    ? "1 category"
    : `${spec.categories.length} categories`;
  return renderBox(
    {
      title: spec.title,
      body: composeCliBlocks(blocks),
      width,
      borderStyle: {
        color: terminalThemeColor(theme, "--discern-color-border-strong"),
      },
      bottomLabel: `${spec.series.length} series ${separator} ${categoryCount}`,
      bottomLabelStyle: {
        color: terminalThemeColor(theme, "--discern-color-ink-faint"),
        ...theme.typography.annotation,
      },
    },
    capabilities,
  );
}

/** Project one exact bar frame, or decline without losing any stated fact. */
const projectBarChartCli: ChartKindCliProjector<"bar"> = (spec, context) => {
  const validated = spec as ValidatedBarChart;
  const width = Math.min(context.maxWidth, context.capabilities.columns);
  const checked = viability(validated, width);
  if (checked.refusal !== undefined) return checked.refusal;
  const titleWidth = measureText(validated.title);
  if (titleWidth > width - 6) {
    return decline("title-width", titleWidth, width - 6);
  }
  return {
    kind: "frame",
    frame: renderExactBar(
      validated,
      context,
      width,
      checked.barField,
      checked.labelColumn,
    ),
  };
};

export default projectBarChartCli;
