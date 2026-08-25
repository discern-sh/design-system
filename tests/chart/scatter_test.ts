import {
  assert,
  assertEquals,
  assertMatch,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import type {
  ChartKindCliProjection,
  ChartKindCliProjectorContext,
} from "../../src/cli/chart-kinds.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";
import { measureText } from "../../src/cli/text.ts";
import { conformChartScene } from "../../src/chart/conformance.ts";
import {
  ChartBudgetError,
  ChartValidationError,
} from "../../src/chart/errors.ts";
import { roundChartNumber } from "../../src/chart/geometry.ts";
import type { ChartDataPoints, ChartTickLabel } from "../../src/chart/scene.ts";
import projectScatterChartCli from "../../src/chart/kinds/scatter/scatter.cli.ts";
import describeScatterChart, {
  scatterDataTableFacts,
} from "../../src/chart/kinds/scatter/scatter.description.ts";
import { releaseCorpus } from "../../src/chart/kinds/scatter/scatter.fixtures.ts";
import layoutScatterChart from "../../src/chart/kinds/scatter/scatter.layout.ts";
import scatterKindMeta from "../../src/chart/kinds/scatter/scatter.meta.ts";
import validateScatterChart from "../../src/chart/kinds/scatter/scatter.validation.ts";

function corpusSpec(name: string): unknown {
  const found = releaseCorpus.cases.find((entry) => entry.name === name);
  assert(found !== undefined, `corpus case ${name} exists`);
  return found.spec;
}

function prepare(spec: unknown): {
  readonly scene: ReturnType<typeof conformChartScene>;
  readonly description: string;
} {
  const validated = validateScatterChart(spec);
  return {
    scene: conformChartScene(layoutScatterChart(validated)),
    description: describeScatterChart(validated),
  };
}

function project(
  spec: unknown,
  columns: number,
  overrides: Partial<TerminalCapabilities> = {},
): ChartKindCliProjection {
  const validated = validateScatterChart(spec);
  const context: ChartKindCliProjectorContext = {
    capabilities: testTerminalCapabilities({ columns, ...overrides }),
    maxWidth: columns,
    theme: "dark",
    description: describeScatterChart(validated),
  };
  return projectScatterChartCli(validated, context);
}

function plainFrame(projection: ChartKindCliProjection): string {
  assert(projection.kind === "frame", "projection produced a frame");
  return stripAnsi(projection.frame);
}

function dataPopulations(spec: unknown): readonly ChartDataPoints[] {
  return prepare(spec).scene.elements.filter(
    (element): element is ChartDataPoints => element.kind === "data-points",
  );
}

function tickLabelTexts(spec: unknown, prefix: string): readonly string[] {
  return prepare(spec).scene.elements
    .filter((element): element is ChartTickLabel =>
      element.kind === "tick-label"
    )
    .filter((element) => element.id.startsWith(prefix))
    .map((element) => element.text);
}

Deno.test("every corpus case validates, lays out, conforms, and describes deterministically", () => {
  for (const entry of releaseCorpus.cases) {
    const first = prepare(entry.spec);
    assertEquals(first.scene.sourceKind, "scatter");
    assert(first.scene.elements.length > 0);
    assertStringIncludes(first.description, `Title: ${entry.spec.title}`);
    const second = prepare(entry.spec);
    assertEquals(
      JSON.stringify(second.scene),
      JSON.stringify(first.scene),
      `${entry.name} must lay out byte-identically`,
    );
    assertEquals(
      second.description,
      first.description,
      `${entry.name} must describe byte-identically`,
    );
  }
});

Deno.test("every invalid corpus case refuses with its declared code", () => {
  for (const entry of releaseCorpus.invalid) {
    const error = assertThrows(
      () => validateScatterChart(entry.spec),
      ChartValidationError,
      undefined,
      entry.name,
    );
    assertEquals(error.code, entry.code, `${entry.name} refusal code`);
  }
});

Deno.test("the over-budget refusal matches the Metadata dimension and remedy", () => {
  const error = assertThrows(
    () => validateScatterChart(releaseCorpus.overBudget.spec),
    ChartBudgetError,
  );
  assertEquals(error.dimension, releaseCorpus.overBudget.dimension);
  assertEquals(error.authorAction, releaseCorpus.overBudget.authorAction);
  assertEquals(
    error.limit,
    scatterKindMeta.budgets[releaseCorpus.overBudget.dimension]?.limit,
  );
});

Deno.test("the scene emits one marker population per series wearing its paired bundle", () => {
  for (const entry of releaseCorpus.cases) {
    const validated = validateScatterChart(entry.spec);
    const populations = dataPopulations(entry.spec);
    assertEquals(
      populations.length,
      validated.series.length,
      `${entry.name} emits one data-points element per series`,
    );
  }
  const populations = dataPopulations(corpusSpec("three-lanes"));
  assertEquals(
    populations.map(({ paint }) => paint),
    ["series-1", "series-2", "series-3"],
  );
  assertEquals(
    populations.map(({ marker }) => marker),
    ["circle", "square", "diamond"],
  );
  for (const population of populations) {
    assert(population.radius > 0, "marker radius stays positive");
    assertEquals(population.points.length, 3);
  }
});

Deno.test("log axes label their ticks through the shared log tick authority", () => {
  assertEquals(tickLabelTexts(corpusSpec("log-log"), "x-tick-"), [
    "1",
    "10",
    "100",
    "1,000",
  ]);
  assertEquals(tickLabelTexts(corpusSpec("log-log"), "y-tick-"), [
    "10",
    "20",
    "50",
    "100",
    "200",
    "500",
    "1,000",
  ]);
});

Deno.test("a non-positive coordinate on either log axis refuses with chart/log-domain", () => {
  for (const name of ["log-x-zero", "log-y-negative"]) {
    const entry = releaseCorpus.invalid.find((found) => found.name === name);
    assert(entry !== undefined);
    const error = assertThrows(
      () => validateScatterChart(entry.spec),
      ChartValidationError,
    );
    assertEquals(error.code, "chart/log-domain");
    assertStringIncludes(error.message, "log scale");
  }
});

Deno.test("a degenerate single-axis domain pads deterministically through outward ticks", () => {
  const flatX = {
    kind: "scatter",
    title: "One size, many latencies",
    summary: "Every change shares one size while latency varies.",
    series: [
      {
        id: "changes",
        label: "Changes",
        points: [{ x: 5, y: 1 }, { x: 5, y: 4 }, { x: 5, y: 9 }],
      },
    ],
  };
  assertEquals(tickLabelTexts(flatX, "x-tick-"), [
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
  ]);
  const { scene } = prepare(flatX);
  const population = scene.elements.find(
    (element): element is ChartDataPoints => element.kind === "data-points",
  );
  assert(population !== undefined);
  const centre = roundChartNumber(scene.plot.x + scene.plot.width / 2);
  for (const point of population.points) {
    assertEquals(point.x, centre, "flat x values sit mid-plot");
  }
});

Deno.test("colliding axis labels are refused with an actionable remedy", () => {
  const error = assertThrows(
    () =>
      prepare({
        kind: "scatter",
        title: "Crowded ticks",
        summary: "Wide grouped numerals collide beneath the x axis.",
        x: { format: { kind: "decimal", decimals: 2, grouping: true } },
        series: [
          {
            id: "wide",
            label: "Wide",
            points: [
              { x: 10_000, y: 1 },
              { x: 30_000, y: 3 },
              { x: 50_000, y: 5 },
            ],
          },
        ],
      }),
    ChartValidationError,
  );
  assertEquals(error.code, "chart/layout/label-fit");
  assertStringIncludes(error.remedy, "compact value format");
});

Deno.test("coincident points render their count digit in both repertoires", () => {
  const clustered = corpusSpec("collision-cluster");
  const unicodeFrame = plainFrame(project(clustered, 80));
  assertStringIncludes(unicodeFrame, "3", "Unicode frame counts the cluster");
  const asciiFrame = plainFrame(project(clustered, 80, { unicode: false }));
  assertStringIncludes(asciiFrame, "3", "ASCII frame counts the cluster");
});

Deno.test("a cell past nine coincident points declines with the typed collision envelope", () => {
  const dense = {
    kind: "scatter",
    title: "Pile-up",
    summary: "Eleven identical observations exceed one digit's honesty.",
    series: [
      {
        id: "pile",
        label: "Pile",
        points: [
          ...Array.from({ length: 11 }, () => ({ x: 10, y: 10 })),
          { x: 50, y: 50 },
        ],
      },
    ],
  };
  assertEquals(project(dense, 80), {
    kind: "declined",
    code: "collision-count",
    fact: 11,
    limit: 9,
  });
});

Deno.test("the frame annotates the exact axis extremes and states its resolution", () => {
  const representative = corpusSpec("latency-size");
  const frame = plainFrame(project(representative, 80));
  for (const extreme of ["1 files", "14 files", "2 hours", "11 hours"]) {
    assertStringIncludes(frame, extreme);
  }
  assertMatch(frame, /\d+×10 cells/u);
  const ascii = plainFrame(project(representative, 80, { unicode: false }));
  assertMatch(ascii, /\d+x10 cells/u);
});

Deno.test("the description prints every exact pair and the table facts match 1:1", () => {
  const validated = validateScatterChart(corpusSpec("three-lanes"));
  const description = describeScatterChart(validated);
  const lines = description.split("\n");
  const totalPoints = validated.series.reduce(
    (sum, series) => sum + series.points.length,
    0,
  );
  // Lead 4 + inventory (1 + series) + data (1 + points) + trailer 4, then
  // the trailing newline contributes one empty split entry.
  assertEquals(
    lines.length,
    10 + validated.series.length + totalPoints + 1,
  );
  const dataStart = lines.indexOf(`Data (${totalPoints} points):`) + 1;
  assert(dataStart > 0, "the data section is announced");
  const dataLines = lines.slice(dataStart, dataStart + totalPoints);
  const facts = scatterDataTableFacts(validated);
  assertEquals(facts.columns.map(({ header }) => header), ["Series", "X", "Y"]);
  assertEquals(facts.columns.map(({ numeric }) => numeric), [
    false,
    true,
    true,
  ]);
  assertEquals(facts.rows.length, totalPoints);
  facts.rows.forEach((row, index) => {
    assertEquals(dataLines[index], `${row[0]}: (${row[1]}, ${row[2]})`);
  });
  assertStringIncludes(
    description,
    "X axis (Depth): linear scale from 1 to 6.",
  );
  assertStringIncludes(
    description,
    "Y axis (Throughput): linear scale from 2 to 9.",
  );
  assertStringIncludes(description, "Largest y: 9 (Third lane).");
  assertStringIncludes(description, "Smallest x: 1 (First lane).");
});

Deno.test("mono frames keep three series apart by glyph, and colour keeps glyph identity", () => {
  const threeLanes = corpusSpec("three-lanes");
  const mono = plainFrame(project(threeLanes, 80, { unicode: false }));
  assertStringIncludes(mono, "o First lane");
  assertStringIncludes(mono, "# Second lane");
  assertStringIncludes(mono, "^ Third lane");
  const hashCount = mono.split("#").length - 1;
  const caretCount = mono.split("^").length - 1;
  assert(hashCount >= 4, "the square bundle marks its legend and cells");
  assert(caretCount >= 4, "the triangle bundle marks its legend and cells");
  const styled = project(threeLanes, 80, { colorDepth: "truecolor" });
  assert(styled.kind === "frame");
  const colour = stripAnsi(styled.frame);
  for (const glyph of ["●", "■", "▲"]) {
    assertStringIncludes(
      colour,
      glyph,
      "colour frames keep the marker glyph identity",
    );
  }
  assertEquals(
    project(threeLanes, 80, { colorDepth: "truecolor" }),
    styled,
    "styled frames stay byte-identical",
  );
});

Deno.test("projection is deterministic, bounded, and typed across the width envelope", () => {
  const representative = corpusSpec("latency-size");
  for (const columns of [30, 44, 80, 120]) {
    const first = project(representative, columns);
    assertEquals(project(representative, columns), first);
    if (columns === 30) {
      assertEquals(first, {
        kind: "declined",
        code: "width",
        fact: 30,
        limit: 40,
      });
      continue;
    }
    const frame = plainFrame(first);
    for (const line of frame.split("\n")) {
      assert(
        measureText(line) <= columns,
        `width ${columns} keeps every line bounded`,
      );
    }
  }
});

Deno.test("ASCII frames stay pure ASCII", () => {
  const frame = plainFrame(
    project(corpusSpec("latency-size"), 80, { unicode: false }),
  );
  for (const character of frame) {
    const codePoint = character.codePointAt(0) ?? 0;
    assert(
      codePoint === 10 || (codePoint >= 32 && codePoint < 127),
      `ASCII frame emitted U+${codePoint.toString(16).toUpperCase()}`,
    );
  }
});

Deno.test("legend and title overflow decline with their typed codes", () => {
  const longLabel = {
    kind: "scatter",
    title: "Tight",
    summary: "A one-line legend item cannot fit the inner width.",
    series: [
      {
        id: "wide",
        label: "Abcdefghijklmnopqrstuvwxyz012345",
        points: [{ x: 1, y: 1 }, { x: 2, y: 3 }],
      },
    ],
  };
  assertEquals(project(longLabel, 34), {
    kind: "declined",
    code: "label-wrap",
    fact: 34,
    limit: 30,
  });
  const longTitle = {
    kind: "scatter",
    title: "This title is far too wide for a forty-four column frame",
    summary: "The embedded title cannot fit the frame border.",
    series: [
      {
        id: "s",
        label: "Series",
        points: [{ x: 1, y: 1 }, { x: 2, y: 3 }],
      },
    ],
  };
  assertEquals(project(longTitle, 44), {
    kind: "declined",
    code: "title-width",
    fact: measureText(longTitle.title),
    limit: 38,
  });
});
