import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { conformChartScene } from "../../src/chart/conformance.ts";
import {
  ChartBudgetError,
  ChartValidationError,
} from "../../src/chart/errors.ts";
import { CHART_RELEASE_POSTURES } from "../../src/chart/kind-meta.ts";
import { chartLinearTicks } from "../../src/chart/ticks.ts";
import projectDistributionChartCli from "../../src/chart/kinds/distribution/distribution.cli.ts";
import describeDistributionChart, {
  distributionCountText,
  distributionDataTableFacts,
} from "../../src/chart/kinds/distribution/distribution.description.ts";
import { releaseCorpus } from "../../src/chart/kinds/distribution/distribution.fixtures.ts";
import layoutDistributionChart from "../../src/chart/kinds/distribution/distribution.layout.ts";
import distributionKindMeta from "../../src/chart/kinds/distribution/distribution.meta.ts";
import type {
  ValidatedDistributionBoxChart,
  ValidatedDistributionHistogramChart,
} from "../../src/chart/kinds/distribution/distribution.spec.ts";
import validateDistributionChart from "../../src/chart/kinds/distribution/distribution.validation.ts";
import { stripAnsi } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import type { ChartKindCliProjection } from "../../src/cli/chart-kinds.ts";
import { HORIZONTAL_EIGHTH_RAMP } from "../../src/cli/glyph-ramps.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";
import { measureText } from "../../src/cli/text.ts";

function corpusSpec(name: string): unknown {
  const found = releaseCorpus.cases.find((entry) => entry.name === name);
  assert(found !== undefined, `corpus case ${name} exists`);
  return found.spec;
}

function prepare(spec: unknown): {
  readonly scene: ReturnType<typeof conformChartScene>;
  readonly description: string;
} {
  const validated = validateDistributionChart(spec);
  return {
    scene: conformChartScene(layoutDistributionChart(validated)),
    description: describeDistributionChart(validated),
  };
}

function validateHistogram(spec: unknown): ValidatedDistributionHistogramChart {
  const validated = validateDistributionChart(spec);
  assert(validated.variant === "histogram", "expected the histogram variant");
  return validated;
}

function validateBox(spec: unknown): ValidatedDistributionBoxChart {
  const validated = validateDistributionChart(spec);
  assert(validated.variant === "box", "expected the box variant");
  return validated;
}

function project(
  spec: unknown,
  columns: number,
  overrides: Partial<TerminalCapabilities> = {},
): ChartKindCliProjection {
  const validated = validateDistributionChart(spec);
  const capabilities = testTerminalCapabilities({ columns, ...overrides });
  return projectDistributionChartCli(validated, {
    capabilities,
    maxWidth: columns,
    theme: "dark",
    description: describeDistributionChart(validated),
  });
}

function framePlain(projection: ChartKindCliProjection): string {
  assert(projection.kind === "frame", "expected an enhanced frame");
  return stripAnsi(projection.frame);
}

const RAMP_GLYPHS = HORIZONTAL_EIGHTH_RAMP.flatMap((
  member,
) => [member.unicode, member.ascii]);

function hasBarGlyph(line: string): boolean {
  return RAMP_GLYPHS.some((glyph) => line.includes(glyph));
}

Deno.test("every corpus case validates, lays out, conforms, and describes deterministically", () => {
  for (const entry of releaseCorpus.cases) {
    const first = prepare(entry.spec);
    assertEquals(first.scene.sourceKind, "distribution");
    assert(first.scene.elements.length > 0);
    assertStringIncludes(first.description, `Title: ${entry.spec.title}`);
    assertStringIncludes(first.description, `Summary: ${entry.spec.summary}`);
    const second = prepare(entry.spec);
    assertEquals(
      JSON.stringify(second.scene),
      JSON.stringify(first.scene),
      `${entry.name} must lay out byte-identically`,
    );
    assertEquals(second.description, first.description);
  }
});

Deno.test("the corpus covers every required release posture", () => {
  const postures = new Set(
    releaseCorpus.cases.flatMap((entry) => entry.postures),
  );
  for (const posture of CHART_RELEASE_POSTURES) {
    assert(postures.has(posture), `corpus covers ${posture}`);
  }
});

Deno.test("every invalid corpus case refuses with its declared code", () => {
  for (const entry of releaseCorpus.invalid) {
    const error = assertThrows(
      () => prepare(entry.spec),
      ChartValidationError,
      undefined,
      entry.name,
    );
    assertEquals(error.code, entry.code, `${entry.name} refusal code`);
  }
});

Deno.test("the over-budget refusal matches the Metadata dimension and remedy", () => {
  const error = assertThrows(
    () => prepare(releaseCorpus.overBudget.spec),
    ChartBudgetError,
  );
  assertEquals(error.dimension, releaseCorpus.overBudget.dimension);
  assertEquals(error.authorAction, releaseCorpus.overBudget.authorAction);
  assertEquals(
    error.limit,
    distributionKindMeta.budgets[releaseCorpus.overBudget.dimension]?.limit,
  );
});

Deno.test("the pinned Sturges rule produces the exact nice-step edges", () => {
  const validated = validateHistogram(corpusSpec("sturges-rule"));
  // n = 24: k = ceil(log2 24) + 1 = 6, so the tick target is 7 over the
  // sample extremes 12..87 — a rough interval of 12.5, the nice step 10,
  // and outward-covering edges 10..90.
  assertEquals(validated.binsRule, "sturges");
  const expected = chartLinearTicks({
    minimum: 12,
    maximum: 87,
    targetCount: 7,
    subject: "test",
  }).ticks.map((tick) => tick.number);
  assertEquals(expected, [10, 20, 30, 40, 50, 60, 70, 80, 90]);
  assertEquals(validated.bins.map((bin) => bin.start), expected.slice(0, -1));
  assertEquals(validated.bins.map((bin) => bin.end), expected.slice(1));
  assertEquals(
    validated.bins.map((bin) => bin.count),
    [3, 4, 5, 3, 3, 2, 2, 2],
  );
});

Deno.test("bin assignment is half-open with a closed final bin", () => {
  const validated = validateHistogram(corpusSpec("quantization-edge"));
  assertEquals(
    validated.bins.map((bin) => bin.label),
    ["0–10", "10–20", "20–30", "30–40"],
  );
  // 10 sits exactly on an inner edge and lands in the upper bin; 40 equals
  // the final edge and lands in the closed last bin; 20–30 stays empty.
  assertEquals(validated.bins.map((bin) => bin.count), [1, 1, 0, 2]);
});

Deno.test("Tukey hinges are pinned on odd and even sample sizes", () => {
  const odd = validateBox(corpusSpec("box-summary"));
  assertEquals(odd.fiveNumberSummary, {
    minimum: 4,
    lowerQuartile: 7.5,
    median: 10,
    upperQuartile: 13.5,
    maximum: 21,
  });
  const even = validateBox({
    kind: "distribution",
    title: "Even sample",
    summary: "Eight recorded values pin the even-count hinges.",
    variant: "box",
    values: [8, 3, 5, 1, 6, 4, 7, 2],
  });
  assertEquals(even.fiveNumberSummary, {
    minimum: 1,
    lowerQuartile: 2.5,
    median: 4.5,
    upperQuartile: 6.5,
    maximum: 8,
  });
});

Deno.test("two-value means compute exactly in decimal space", () => {
  // 0.2 + 0.3 is inexact in binary floating point; the decimal mean is not.
  const validated = validateBox({
    kind: "distribution",
    title: "Exact means",
    summary: "Fractional middles stay exact through decimal arithmetic.",
    variant: "box",
    values: [0.1, 0.2, 0.3, 0.4],
  });
  assertEquals(validated.fiveNumberSummary.lowerQuartile, 0.15);
  assertEquals(validated.fiveNumberSummary.median, 0.25);
  assertEquals(validated.fiveNumberSummary.upperQuartile, 0.35);
});

Deno.test("the histogram description lists every bin, the largest bin, and empty bins", () => {
  const spec = corpusSpec("quantization-edge");
  const validated = validateHistogram(spec);
  const description = describeDistributionChart(validated);
  assertStringIncludes(description, "Variant: histogram of 4 values");
  assertStringIncludes(description, "Bins (4): author-declared edges.");
  assertStringIncludes(description, "Data (4 bins):");
  for (const bin of validated.bins) {
    assertStringIncludes(
      description,
      `${bin.label}: ${distributionCountText(bin.count)}`,
    );
  }
  assertStringIncludes(description, "20–30: 0 values");
  assertStringIncludes(description, "Largest bin: 30–40 (2 values).");
  assertStringIncludes(description, "Empty bins: 1.");

  const sturges = describeDistributionChart(
    validateHistogram(corpusSpec("sturges-rule")),
  );
  assertStringIncludes(
    sturges,
    "Bins (8): Sturges rule over nice-step edges.",
  );
  assertStringIncludes(
    sturges,
    "Value axis (Duration): linear scale from 10 ms to 90 ms.",
  );
});

Deno.test("the box description states all five numbers and the exact interquartile range", () => {
  const description = describeDistributionChart(
    validateBox(corpusSpec("box-summary")),
  );
  assertStringIncludes(description, "Variant: box summary of 7 values");
  assertStringIncludes(description, "Data (5 numbers):");
  assertStringIncludes(description, "Minimum: 4 hours");
  assertStringIncludes(description, "Lower quartile: 7.5 hours");
  assertStringIncludes(description, "Median: 10 hours");
  assertStringIncludes(description, "Upper quartile: 13.5 hours");
  assertStringIncludes(description, "Maximum: 21 hours");
  assertStringIncludes(description, "Interquartile range: 6 hours.");
});

Deno.test("data table facts mirror the description's data lines 1:1", () => {
  const histogram = validateHistogram(corpusSpec("sturges-rule"));
  const histogramFacts = distributionDataTableFacts(histogram);
  assertEquals(
    histogramFacts.columns.map((column) => column.header),
    ["Range", "Count"],
  );
  assertEquals(histogramFacts.rows.length, histogram.bins.length);
  const description = describeDistributionChart(histogram);
  histogramFacts.rows.forEach((row, index) => {
    const bin = histogram.bins[index];
    assert(bin !== undefined);
    assertEquals(row[0], `${bin.label} ms`);
    assertEquals(row[1], String(bin.count));
    assertStringIncludes(
      description,
      `${row[0]}: ${distributionCountText(bin.count)}`,
    );
  });

  const box = validateBox(corpusSpec("box-summary"));
  const boxFacts = distributionDataTableFacts(box);
  assertEquals(
    boxFacts.columns.map((column) => column.header),
    ["Statistic", "Value"],
  );
  assertEquals(boxFacts.rows, [
    ["Minimum", "4 hours"],
    ["Lower quartile", "7.5 hours"],
    ["Median", "10 hours"],
    ["Upper quartile", "13.5 hours"],
    ["Maximum", "21 hours"],
  ]);
  const boxDescription = describeDistributionChart(box);
  for (const row of boxFacts.rows) {
    assertStringIncludes(boxDescription, `${row[0]}: ${row[1]}`);
  }
});

Deno.test("the exact histogram frame prints every bin range and every count", () => {
  const spec = corpusSpec("sturges-rule");
  const validated = validateHistogram(spec);
  for (const unicode of [true, false]) {
    const plain = framePlain(project(spec, 80, { unicode }));
    for (const bin of validated.bins) {
      const range = unicode ? bin.label : bin.label.replaceAll("–", "-");
      assertStringIncludes(plain, `${range} ms`);
      assertStringIncludes(plain, distributionCountText(bin.count));
    }
    assertStringIncludes(plain, "8 bins");
    assertStringIncludes(plain, "24 values");
  }
});

Deno.test("the exact box frame prints all five labelled numbers", () => {
  for (const unicode of [true, false]) {
    const plain = framePlain(project(corpusSpec("box-summary"), 80, {
      unicode,
    }));
    assertStringIncludes(plain, "min 4 hours");
    assertStringIncludes(plain, "Q1 7.5 hours");
    assertStringIncludes(plain, "median 10 hours");
    assertStringIncludes(plain, "Q3 13.5 hours");
    assertStringIncludes(plain, "max 21 hours");
    assertStringIncludes(plain, "5 numbers");
    assertStringIncludes(plain, "7 values");
  }
});

Deno.test("a nonzero count never renders empty and zero renders no glyph", () => {
  const sliver = {
    kind: "distribution",
    title: "Sliver beside a mass",
    summary: "One recorded value beside four hundred keeps a visible bar.",
    values: [5, ...Array.from({ length: 400 }, (_, index) => 10 + index % 10)],
    bins: { kind: "edges", values: [0, 10, 20] },
  };
  const unicodeLines = framePlain(project(sliver, 80)).split("\n");
  const sliverLine = unicodeLines.find((line) => line.includes("1 value "));
  assert(sliverLine !== undefined, "the sliver row exists");
  assertStringIncludes(sliverLine, "▏");
  const asciiLines = framePlain(project(sliver, 80, { unicode: false }))
    .split("\n");
  const asciiSliver = asciiLines.find((line) => line.includes("1 value "));
  assert(asciiSliver !== undefined);
  assertStringIncludes(asciiSliver, "#");

  const zeroLines = framePlain(project(corpusSpec("quantization-edge"), 80))
    .split("\n");
  const zeroRow = zeroLines.find((line) => line.includes("20–30"));
  assert(zeroRow !== undefined, "the empty bin still prints its range");
  assertStringIncludes(zeroRow, "0 values");
  assert(!hasBarGlyph(zeroRow), "an empty bin renders no glyph");
  const fullRow = zeroLines.find((line) => line.includes("30–40"));
  assert(fullRow !== undefined && hasBarGlyph(fullRow));
});

Deno.test("width declines are typed with the measured fact and limit", () => {
  const narrow = project(corpusSpec("sturges-rule"), 24);
  assert(narrow.kind === "declined");
  assertEquals(narrow.code, "width");
  assertEquals(narrow.fact, 24);
  assert(narrow.limit > 24);

  const longTitle = project({
    kind: "distribution",
    title:
      "A title far too wide for the narrow terminal frame it must embed into",
    summary: "The title cannot embed, so the frame declines.",
    values: [1, 7],
    bins: { kind: "edges", values: [0, 5, 10] },
  }, 30);
  assert(longTitle.kind === "declined");
  assertEquals(longTitle.code, "title-width");
  assertEquals(longTitle.limit, 30 - 6);
  assert(longTitle.fact > longTitle.limit);

  const wideItem = project({
    kind: "distribution",
    title: "Wide unit",
    summary: "A five-number item wider than the frame declines by wrap.",
    variant: "box",
    values: [1, 2, 3, 4, 5],
    value: { unit: "extraordinarily-protracted-unit-name" },
  }, 30);
  assert(wideItem.kind === "declined");
  assertEquals(wideItem.code, "label-wrap");
  assert(wideItem.fact > wideItem.limit);
});

Deno.test("frames are byte-stable and bounded across widths and capabilities", () => {
  for (const name of ["sturges-rule", "box-summary"]) {
    const spec = corpusSpec(name);
    for (const columns of [24, 44, 80, 120]) {
      for (const unicode of [true, false]) {
        for (const colorDepth of ["none", "truecolor"] as const) {
          const first = project(spec, columns, { unicode, colorDepth });
          assertEquals(
            project(spec, columns, { unicode, colorDepth }),
            first,
            `${name} at ${columns} must project byte-identically`,
          );
          if (first.kind !== "frame") continue;
          for (const line of stripAnsi(first.frame).split("\n")) {
            assert(
              measureText(line) <= columns,
              `${name} at ${columns}: ${JSON.stringify(line)} overflows`,
            );
          }
          if (!unicode) {
            assert(
              /^[\x20-\x7E\n]*$/u.test(stripAnsi(first.frame)),
              `${name} ASCII frame stays pure ASCII`,
            );
          }
        }
      }
    }
  }
});

Deno.test("a count too small to render truthfully refuses in scene layout", () => {
  const error = assertThrows(
    () =>
      prepare({
        kind: "distribution",
        title: "Sub-resolution histogram",
        summary:
          "A single count beside three hundred cannot render truthfully.",
        values: [
          5,
          ...Array.from({ length: 300 }, (_, index) => 10 + index % 10),
        ],
        bins: { kind: "edges", values: [0, 10, 20] },
      }),
    ChartValidationError,
  );
  assertEquals(error.code, "chart/sub-resolution");

  const boxError = assertThrows(
    () =>
      prepare({
        kind: "distribution",
        title: "Sub-resolution box",
        summary: "A hair-thin interquartile range cannot render truthfully.",
        variant: "box",
        values: [0, 999.9, 1000, 1000.1, 2000],
      }),
    ChartValidationError,
  );
  assertEquals(boxError.code, "chart/sub-resolution");
});

Deno.test("histogram scenes keep shared bin boundaries and formatted edge ticks", () => {
  const minimal = prepare(corpusSpec("minimal-edges"));
  const marks = minimal.scene.elements.filter((element) =>
    element.kind === "mark"
  );
  assertEquals(marks.length, 3);
  for (let index = 1; index < marks.length; index += 1) {
    const previous = marks[index - 1];
    const current = marks[index];
    assert(previous !== undefined && current !== undefined);
    assertEquals(
      current.bounds.x,
      previous.bounds.x + previous.bounds.width,
      "adjacent bins share exact mark boundaries",
    );
  }
  const edgeTicks = minimal.scene.elements
    .filter((element) => element.kind === "tick-label")
    .filter((element) => element.id.startsWith("edge-tick-"))
    .map((element) => element.text);
  assertEquals(edgeTicks, ["10", "20", "30", "40"]);
  const countTicks = minimal.scene.elements
    .filter((element) => element.kind === "tick-label")
    .filter((element) => element.id.startsWith("count-tick-"))
    .map((element) => element.text);
  assertEquals(countTicks, ["0", "1", "2"]);

  const formatted = prepare(corpusSpec("formatter-table"));
  const formattedEdges = formatted.scene.elements
    .filter((element) => element.kind === "tick-label")
    .filter((element) => element.id.startsWith("edge-tick-"))
    .map((element) => element.text);
  assertEquals(formattedEdges, ["0.0", "5.0k", "10.0k", "15.0k", "20.0k"]);
});

Deno.test("box scenes annotate the five numbers around one interquartile mark", () => {
  const { scene } = prepare(corpusSpec("box-summary"));
  const marks = scene.elements.filter((element) => element.kind === "mark");
  assertEquals(marks.length, 1);
  assertEquals(marks[0]?.id, "mark-iqr");
  const median = scene.elements.find((element) =>
    element.kind === "reference-line" && element.id === "median"
  );
  assert(median !== undefined, "the median line always renders");
  const annotations = scene.elements
    .filter((element) => element.kind === "tick-label")
    .map((element) => element.text);
  assertEquals(
    annotations.toSorted(),
    ["10", "13.5", "21", "4", "7.5"].toSorted(),
  );
});
