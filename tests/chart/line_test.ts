import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import type { ChartKindCliProjection } from "../../src/cli/chart-kinds.ts";
import {
  DECLARED_GAP_GLYPH,
  LINE_PATH_GLYPHS,
  SERIES_MARKERS,
} from "../../src/cli/glyph-ramps.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";
import { measureText } from "../../src/cli/text.ts";
import { measureSceneText } from "../../src/internal/font-metrics.ts";
import { conformChartScene } from "../../src/chart/conformance.ts";
import {
  ChartBudgetError,
  ChartValidationError,
} from "../../src/chart/errors.ts";
import { CHART_GEOMETRY, roundChartNumber } from "../../src/chart/geometry.ts";
import { CHART_RELEASE_POSTURES } from "../../src/chart/kind-meta.ts";
import {
  chartLinearPosition,
  chartLogPosition,
  createChartLinearScale,
  createChartLogScale,
} from "../../src/chart/scale.ts";
import {
  chartLinearTicks,
  chartLogTicks,
  chartTimeTicks,
} from "../../src/chart/ticks.ts";
import projectLineChartCli from "../../src/chart/kinds/line/line.cli.ts";
import describeLineChart, {
  lineDataTableFacts,
  lineUnitSuffix,
  lineValueText,
} from "../../src/chart/kinds/line/line.description.ts";
import { releaseCorpus } from "../../src/chart/kinds/line/line.fixtures.ts";
import layoutLineChart from "../../src/chart/kinds/line/line.layout.ts";
import lineKindMeta from "../../src/chart/kinds/line/line.meta.ts";
import type {
  LineChartSpec,
  ValidatedLineChart,
} from "../../src/chart/kinds/line/line.spec.ts";
import validateLineChart from "../../src/chart/kinds/line/line.validation.ts";

function corpusSpec(name: string): LineChartSpec {
  const found = releaseCorpus.cases.find((entry) => entry.name === name);
  assert(found !== undefined, `corpus case ${name} exists`);
  return found.spec as LineChartSpec;
}

function prepare(spec: unknown): {
  readonly validated: ValidatedLineChart;
  readonly scene: ReturnType<typeof conformChartScene>;
  readonly description: string;
} {
  const validated = validateLineChart(spec);
  return {
    validated,
    scene: conformChartScene(layoutLineChart(validated)),
    description: describeLineChart(validated),
  };
}

function project(
  spec: unknown,
  columns: number,
  profile: Partial<TerminalCapabilities> = {},
): ChartKindCliProjection {
  const capabilities = testTerminalCapabilities({
    colorDepth: "truecolor",
    columns,
    ...profile,
  });
  const validated = validateLineChart(spec);
  return projectLineChartCli(validated, {
    capabilities,
    maxWidth: columns,
    theme: "dark",
    description: describeLineChart(validated),
  });
}

const representative = corpusSpec("daily-reviews");

Deno.test("every corpus case validates, lays out, conforms, and describes deterministically", () => {
  for (const entry of releaseCorpus.cases) {
    const first = prepare(entry.spec);
    assertEquals(first.scene.sourceKind, "line");
    assert(first.scene.elements.length > 0, `${entry.name} emits elements`);
    assertStringIncludes(
      first.description,
      `Title: ${(entry.spec as LineChartSpec).title}`,
    );
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

Deno.test("the Metadata pins the fixed stance, tier, and order", () => {
  assertEquals(lineKindMeta.slug, "line");
  assertEquals(lineKindMeta.order, 20);
  assertEquals(lineKindMeta.cli, { stance: "enhanced", honesty: "faithful" });
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
    () => validateLineChart(releaseCorpus.overBudget.spec),
    ChartBudgetError,
  );
  assertEquals(error.dimension, releaseCorpus.overBudget.dimension);
  assertEquals(error.authorAction, releaseCorpus.overBudget.authorAction);
  assertEquals(
    error.limit,
    lineKindMeta.budgets[releaseCorpus.overBudget.dimension]?.limit,
  );
});

Deno.test("the points budget splits over-long series instead of resampling", () => {
  const error = assertThrows(
    () =>
      validateLineChart({
        kind: "line",
        title: "Too many points",
        summary: "A domain past the cardinality budget must split.",
        x: {
          kind: "number",
          values: Array.from({ length: 121 }, (_, index) => index + 1),
        },
        series: [{
          id: "value",
          label: "Value",
          values: Array.from({ length: 121 }, (_, index) => (index % 9) + 1),
        }],
      }),
    ChartBudgetError,
  );
  assertEquals(error.dimension, "points");
  assertEquals(error.authorAction, "split-figure");
  assertEquals(error.limit, lineKindMeta.budgets.points?.limit);
});

Deno.test("the description follows the shared skeleton byte-for-byte", () => {
  const validated = validateLineChart({
    kind: "line",
    title: "Probe",
    summary: "Two series over three days.",
    value: { unit: "reviews" },
    x: { kind: "date", values: ["2026-03-02", "2026-03-03", "2026-03-05"] },
    series: [
      { id: "done", label: "Done", values: [4, null, 9] },
      { id: "open", label: "Open", values: [0, 2, 1] },
    ],
  });
  assertEquals(
    describeLineChart(validated),
    [
      "Title: Probe",
      "Summary: Two series over three days.",
      "Variant: line over date domain",
      "Value axis: linear scale from 0 to 9 reviews.",
      "Series (2):",
      "1. Done (done)",
      "2. Open (open)",
      "Data (3 points):",
      "2026-03-02: Done 4 reviews, Open 0 reviews",
      "2026-03-03: Done no stated value, Open 2 reviews",
      "2026-03-05: Done 9 reviews, Open 1 reviews",
      "Largest value: 9 reviews (Done at 2026-03-05).",
      "Smallest stated value: 0 reviews (Open at 2026-03-02).",
      "",
    ].join("\n"),
  );
});

Deno.test("the data-table facts match the description's data lines one to one", () => {
  for (const entry of releaseCorpus.cases) {
    const { validated, description } = prepare(entry.spec);
    const facts = lineDataTableFacts(validated);
    assertEquals(facts.columns.length, 1 + validated.series.length);
    assertEquals(
      facts.columns.slice(1).map((column) => column.header),
      validated.series.map((series) => series.label),
    );
    assert(facts.columns.slice(1).every((column) => column.numeric));
    assertEquals(
      facts.columns[0]?.numeric,
      validated.x.kind === "number",
      `${entry.name} domain column numeric flag`,
    );
    const lines = description.trimEnd().split("\n");
    const header = `Data (${validated.x.values.length} points):`;
    const start = lines.indexOf(header);
    assert(start >= 0, `${entry.name} description carries ${header}`);
    const dataLines = lines.slice(start + 1, start + 1 + facts.rows.length);
    assertEquals(dataLines.length, facts.rows.length);
    facts.rows.forEach((row, index) => {
      const [position, ...cells] = row;
      const expected = `${position}: ${
        validated.series.map((series, seriesIndex) =>
          `${series.label} ${cells[seriesIndex]}`
        ).join(", ")
      }`;
      assertEquals(dataLines[index], expected, `${entry.name} row ${index}`);
    });
  }
});

Deno.test("date domain ticks and labels come from the shared time grammar", () => {
  const { validated, scene, description } = prepare(representative);
  assert(validated.x.kind === "date");
  const first = validated.x.ordinals[0];
  const last = validated.x.ordinals.at(-1);
  assert(first !== undefined && last !== undefined);
  const expected = chartTimeTicks({
    minimumOrdinal: first,
    maximumOrdinal: last,
    targetCount: CHART_GEOMETRY.axis.valueTickTarget,
    subject: "Line domain axis",
  }).ticks.map((tick) => tick.label);
  const labels = scene.elements
    .filter((element) => element.kind === "tick-label")
    .filter((element) => element.axis === "category")
    .map((element) => element.text);
  assertEquals(labels, expected);
  for (const iso of validated.x.values) {
    assertStringIncludes(description, `${iso}: Completed`);
  }
});

Deno.test("log scenes ride the shared log tick and position authorities", () => {
  const { validated, scene } = prepare(corpusSpec("log-scale"));
  const expectedTicks = chartLogTicks({
    minimum: validated.minimumValue,
    maximum: validated.maximumValue,
    subject: "Line value axis",
  }).ticks;
  const labels = scene.elements
    .filter((element) => element.kind === "tick-label")
    .filter((element) => element.axis === "value")
    .map((element) => element.text);
  assertEquals(labels, expectedTicks.map((tick) => tick.label));

  const firstTick = expectedTicks[0];
  const lastTick = expectedTicks.at(-1);
  assert(firstTick !== undefined && lastTick !== undefined);
  const valueScale = createChartLogScale({
    domainMin: firstTick.number,
    domainMax: lastTick.number,
    rangeStart: scene.plot.y + scene.plot.height,
    rangeEnd: scene.plot.y,
    subject: "Line value axis",
  });
  assert(validated.x.kind === "number");
  const xFirst = validated.x.values[0];
  const xLast = validated.x.values.at(-1);
  assert(xFirst !== undefined && xLast !== undefined);
  const domainTicks = chartLinearTicks({
    minimum: xFirst,
    maximum: xLast,
    targetCount: CHART_GEOMETRY.axis.valueTickTarget,
    subject: "Line domain axis",
  }).ticks;
  const domainFirst = domainTicks[0];
  const domainLast = domainTicks.at(-1);
  assert(domainFirst !== undefined && domainLast !== undefined);
  const domainScale = createChartLinearScale({
    domainMin: domainFirst.number,
    domainMax: domainLast.number,
    rangeStart: scene.plot.x,
    rangeEnd: scene.plot.x + scene.plot.width,
    subject: "Line domain axis",
  });
  const path = scene.elements.find((element) => element.kind === "data-path");
  assert(path !== undefined);
  const firstPoint = path.points[0];
  assert(firstPoint !== undefined);
  assertEquals(
    firstPoint,
    {
      x: roundChartNumber(chartLinearPosition(domainScale, xFirst)),
      y: roundChartNumber(chartLogPosition(valueScale, 3)),
    },
  );
});

Deno.test("value tick labels honour the authored formats through the shared formatter", () => {
  const { scene } = prepare(corpusSpec("formatter-table"));
  const valueLabels = scene.elements
    .filter((element) => element.kind === "tick-label")
    .filter((element) => element.axis === "value")
    .map((element) => element.text);
  assertEquals(valueLabels, ["5.0k", "10.0k", "15.0k", "20.0k", "25.0k"]);
  const domainLabels = scene.elements
    .filter((element) => element.kind === "tick-label")
    .filter((element) => element.axis === "category")
    .map((element) => element.text);
  assertEquals(domainLabels, ["1", "2", "3", "4"]);
});

Deno.test("a declared gap splits the series and an isolated point renders as a point population", () => {
  const gapSplit = prepare({
    kind: "line",
    title: "Gap split",
    summary: "A declared gap splits the path into segments.",
    x: { kind: "number", values: [1, 2, 3, 4, 5] },
    series: [{ id: "v", label: "V", values: [1, 2, null, 3, 4] }],
  });
  const paths = gapSplit.scene.elements.filter(
    (element) => element.kind === "data-path",
  );
  assertEquals(paths.map(({ id }) => id), ["path-v-1", "path-v-2"]);
  assert(paths.every((path) => path.points.length === 2));

  const isolated = prepare({
    kind: "line",
    title: "Isolated",
    summary: "An isolated stated point between gaps stays visible.",
    x: { kind: "number", values: [1, 2, 3, 4, 5] },
    series: [{ id: "v", label: "V", values: [null, 5, null, 3, 4] }],
  });
  const points = isolated.scene.elements.filter(
    (element) => element.kind === "data-points",
  );
  assertEquals(points.length, 1);
  const population = points[0];
  assert(population !== undefined);
  assertEquals(population.id, "point-v-1");
  assertEquals(population.points.length, 1);
  assertEquals(population.radius, 3);
  assertEquals(
    isolated.scene.elements
      .filter((element) => element.kind === "data-path")
      .map(({ id }) => id),
    ["path-v-2"],
  );
});

Deno.test("the area variant fills each stated segment from the zero baseline beneath its path", () => {
  const { scene } = prepare(corpusSpec("area"));
  const areas = scene.elements.filter((element) => element.kind === "area");
  assertEquals(areas.map(({ id }) => id), ["area-accepted-1"]);
  const area = areas[0];
  const path = scene.elements.find((element) => element.kind === "data-path");
  assert(area !== undefined && path !== undefined);
  assert(
    scene.elements.indexOf(area) < scene.elements.indexOf(path),
    "the fill paints beneath its path",
  );
  const plotBottom = roundChartNumber(scene.plot.y + scene.plot.height);
  const first = area.points[0];
  const last = area.points.at(-1);
  assert(first !== undefined && last !== undefined);
  assertEquals(first.y, plotBottom, "the fill starts on the zero baseline");
  assertEquals(last.y, plotBottom, "the fill closes on the zero baseline");
  assertEquals(area.points.length, path.points.length + 2);
});

Deno.test("a flat series pads its domain deterministically and stays honest everywhere", () => {
  const flatSpec = {
    kind: "line",
    title: "Flat",
    summary: "A flat series draws an honest level run.",
    x: { kind: "number", values: [1, 2, 3] },
    series: [{ id: "v", label: "V", values: [42, 42, 42] }],
  };
  const { scene, description } = prepare(flatSpec);
  const valueLabels = scene.elements
    .filter((element) => element.kind === "tick-label")
    .filter((element) => element.axis === "value")
    .map((element) => element.text);
  // 42 pads by one decade unit of its leading digit: ticks cover [32, 52].
  const expected = chartLinearTicks({
    minimum: 32,
    maximum: 52,
    targetCount: CHART_GEOMETRY.axis.valueTickTarget,
    subject: "Line value axis",
  }).ticks.map((tick) => tick.label);
  assertEquals(valueLabels, expected);
  assertStringIncludes(description, "linear scale from 42 to 42.");

  const projection = project(flatSpec, 60);
  assert(projection.kind === "frame");
  const plain = stripAnsi(projection.frame);
  assertStringIncludes(plain, "42");
  assertStringIncludes(plain, LINE_PATH_GLYPHS.level.unicode.repeat(3));

  const flatLog = prepare({
    ...flatSpec,
    summary: "A flat positive series pads by one decade under log.",
    value: { scale: "log" },
  });
  const flatLogLabels = flatLog.scene.elements
    .filter((element) => element.kind === "tick-label")
    .filter((element) => element.axis === "value")
    .map((element) => element.text);
  assertEquals(
    flatLogLabels,
    chartLogTicks({ minimum: 4.2, maximum: 420, subject: "Line value axis" })
      .ticks.map((tick) => tick.label),
  );
});

Deno.test("the frame prints exact extremes and states its resolution at every accepted width", () => {
  const validated = validateLineChart(representative);
  const unit = lineUnitSuffix(validated.value);
  const maxText = lineValueText(validated.maximumValue, unit);
  const minText = lineValueText(validated.minimumValue, unit);
  for (const columns of [24, 44, 80, 120]) {
    for (const unicode of [true, false]) {
      const projection = project(representative, columns, { unicode });
      for (let run = 0; run < 3; run += 1) {
        assertEquals(
          JSON.stringify(project(representative, columns, { unicode })),
          JSON.stringify(projection),
          `deterministic at ${columns}/${unicode}`,
        );
      }
      if (projection.kind === "declined") {
        assertEquals(projection.code, "width");
        assertEquals(projection.fact, columns);
        assert(projection.limit > columns);
        continue;
      }
      const capabilities = testTerminalCapabilities({
        colorDepth: "truecolor",
        columns,
        unicode,
      });
      assertStyledFrame(
        projection.frame,
        stripAnsi(projection.frame),
        capabilities,
      );
      const plain = stripAnsi(projection.frame);
      for (const line of plain.split("\n")) {
        assert(
          measureText(line) <= columns,
          `line fits ${columns}: ${JSON.stringify(line)}`,
        );
      }
      assertStringIncludes(plain, maxText);
      assertStringIncludes(plain, minText);
      assertStringIncludes(
        plain,
        unicode ? "8 rows × 6 points" : "8 rows x 6 points",
      );
      if (!unicode) {
        assert(
          Array.from(plain).every((character) =>
            (character.codePointAt(0) ?? 0) <= 0x7f
          ),
          "ASCII frames stay within the printable repertoire",
        );
      }
    }
  }
});

Deno.test("terminal line quantization keeps both finite binary64 extrema", () => {
  const spec = {
    kind: "line",
    title: "Extreme finite movement",
    summary: "Opposite finite extrema stay on opposite rows.",
    x: { kind: "number", values: [1, 2, 3] },
    series: [{
      id: "value",
      label: "Value",
      values: [-Number.MAX_VALUE, 0, Number.MAX_VALUE],
    }],
  };
  const validated = validateLineChart(spec);
  const projection = project(spec, 700);
  assert(projection.kind === "frame");
  const plain = stripAnsi(projection.frame);
  assert(!plain.includes("NaN") && !plain.includes("Infinity"));
  assertStringIncludes(
    plain,
    lineValueText(validated.minimumValue, lineUnitSuffix(validated.value)),
  );
  assertStringIncludes(
    plain,
    lineValueText(validated.maximumValue, lineUnitSuffix(validated.value)),
  );
  const dataRows = plain.split("\n").filter((line) => line.includes("┤"));
  assertEquals(dataRows.length, 2);
  for (const row of dataRows) {
    assert(
      /[─╭╰╮╯]/u.test(row),
      `extreme row lost its authored path cell: ${JSON.stringify(row)}`,
    );
  }
});

Deno.test("every corpus case projects a frame or a typed decline, byte-stably, in both charsets", () => {
  for (const entry of releaseCorpus.cases) {
    for (const unicode of [true, false]) {
      const projection = project(entry.spec, 120, { unicode });
      assertEquals(
        JSON.stringify(project(entry.spec, 120, { unicode })),
        JSON.stringify(projection),
        `${entry.name} deterministic`,
      );
      assert(
        projection.kind === "frame",
        `${entry.name} frames at 120 columns`,
      );
      const capabilities = testTerminalCapabilities({
        colorDepth: "truecolor",
        columns: 120,
        unicode,
      });
      assertStyledFrame(
        projection.frame,
        stripAnsi(projection.frame),
        capabilities,
      );
    }
  }
});

Deno.test("over-long series decline at narrow widths instead of resampling", () => {
  const spec = {
    kind: "line",
    title: "Sixty points",
    summary: "Sixty authored points never decimate into fewer columns.",
    x: {
      kind: "number",
      values: Array.from({ length: 60 }, (_, index) => index + 1),
    },
    series: [{
      id: "value",
      label: "Value",
      values: Array.from({ length: 60 }, (_, index) => (index % 13) + 1),
    }],
  };
  const declined = project(spec, 44);
  assert(declined.kind === "declined");
  assertEquals(declined.code, "width");
  assertEquals(declined.fact, 44);
  // gutter "13" (2) + axis (1) + 60 columns + frame chrome (4).
  assertEquals(declined.limit, 67);
  const framed = project(spec, 80);
  assert(framed.kind === "frame", "every point fits at eighty columns");
  assertStringIncludes(stripAnsi(framed.frame), "8 rows × 60 points");
  assertStringIncludes(
    describeLineChart(validateLineChart(spec)),
    "Data (60 points):",
  );
});

Deno.test("gaps render visibly distinct from zero in the frame and the description", () => {
  const { description } = prepare(representative);
  assertStringIncludes(description, "Open 0 reviews");
  assertStringIncludes(description, "Open no stated value");
  for (const unicode of [true, false]) {
    const projection = project(representative, 80, { unicode });
    assert(projection.kind === "frame");
    const plain = stripAnsi(projection.frame);
    const glyph = unicode
      ? DECLARED_GAP_GLYPH.unicode
      : DECLARED_GAP_GLYPH.ascii;
    assertStringIncludes(plain, `${glyph} no stated value`);
    const gapRow = plain.split("\n").find((line) =>
      line.includes(glyph) && !line.includes("no stated value")
    );
    assert(gapRow !== undefined, "the gap row marks the gapped column");
    assertEquals(
      Array.from(gapRow).filter((character) => character === glyph).length,
      1,
      "exactly the one declared gap is marked, so zero never reads as a gap",
    );
  }
});

Deno.test("colourless frames keep at most two series and decline past the envelope", () => {
  const threeSeries = {
    ...representative,
    series: [
      ...representative.series,
      { id: "third", label: "Third", values: [1, 1, 2, 2, 3, 3] },
    ],
  };
  const declined = project(threeSeries, 80, { colorDepth: "none" });
  assertEquals(declined, {
    kind: "declined",
    code: "mono-series",
    fact: 3,
    limit: 2,
  });

  const mono = project(representative, 80, { colorDepth: "none" });
  assert(mono.kind === "frame");
  assert(!mono.frame.includes("\u001b"), "colourless frames emit no ANSI");
  const capabilities = testTerminalCapabilities({ columns: 80 });
  assertExactFrame(mono.frame, mono.frame, capabilities);
  const marker = (slot: number): string => {
    const glyph = SERIES_MARKERS[slot - 1];
    assert(glyph !== undefined);
    return glyph.unicode;
  };
  const completedMarks =
    Array.from(mono.frame).filter((glyph) => glyph === marker(1)).length;
  const openMarks =
    Array.from(mono.frame).filter((glyph) => glyph === marker(2)).length;
  assertEquals(completedMarks, 1 + 6, "legend plus every stated point");
  assertEquals(openMarks, 1 + 5, "legend plus every stated point");

  const colour = project(representative, 80);
  assert(colour.kind === "frame");
  assertStringIncludes(
    stripAnsi(colour.frame),
    LINE_PATH_GLYPHS.riseTo.unicode,
    "with colour, multiple series share the path vocabulary",
  );
});

Deno.test("quantization rounds half away from zero onto the declared row grid", () => {
  const projection = project(corpusSpec("quantization-edge"), 60);
  assert(projection.kind === "frame");
  const plain = stripAnsi(projection.frame);
  const rows = plain.split("\n").filter((line) =>
    line.includes("│") && !line.includes("Summary")
  );
  // Values 0, 1, 13, 14 over eight rows: 1 of 14 lands on the exact half
  // step between rows 0 and 1 and rounds up; 13 rounds up to the top row.
  const topRow = rows.find((line) => line.includes("14"));
  assert(topRow !== undefined, "the maximum annotates the top row");
  const level = LINE_PATH_GLYPHS.level.unicode;
  const riseTo = LINE_PATH_GLYPHS.riseTo.unicode;
  assertStringIncludes(topRow, riseTo, "13 shares the top row with 14");
  assertStringIncludes(topRow, level, "14 stays on the top row");
});

Deno.test("the title and legend decline codes stay typed", () => {
  const longTitle = {
    ...representative,
    title: "A deliberately very long probe title that cannot embed in a border",
  };
  const titled = project(longTitle, 40);
  assert(titled.kind === "declined");
  assertEquals(titled.code, "title-width");
  assertEquals(titled.fact, measureText(longTitle.title));

  const verboseLabel = "A deliberately wordy series name";
  const wideLegend = {
    ...representative,
    series: representative.series.map((series, index) =>
      index === 0 ? { ...series, label: verboseLabel } : series
    ),
  };
  const legend = project(wideLegend, 36);
  assert(legend.kind === "declined");
  assertEquals(legend.code, "label-wrap");
  assertEquals(legend.fact, 2 + measureText(verboseLabel));
});

Deno.test("the log refusal names the linear scale and positive data", () => {
  const invalid = releaseCorpus.invalid.find(
    (entry) => entry.name === "log-non-positive",
  );
  assert(invalid !== undefined);
  const error = assertThrows(
    () => validateLineChart(invalid.spec),
    ChartValidationError,
  );
  assertEquals(error.code, "chart/log-domain");
  assertStringIncludes(error.remedy, "linear scale");
  assertStringIncludes(error.remedy, "positive");
});

Deno.test("layout keeps every tick label clear of the marks by construction", () => {
  // The widest plausible domain labels: day-unit ISO dates at five ticks.
  const { scene } = prepare({
    kind: "line",
    title: "Dense date labels",
    summary: "Five day-unit tick labels keep their clearance.",
    x: {
      kind: "date",
      values: ["2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05"],
    },
    series: [{ id: "v", label: "V", values: [1, 2, 3, 4] }],
  });
  const labels = scene.elements.filter(
    (element) => element.kind === "tick-label",
  );
  assert(labels.length > 0);
  for (const label of labels) {
    assertEquals(
      label.width,
      measureSceneText(label.text, label.fontSize, label.fontRole),
    );
  }
});
