import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import type { ChartKindCliProjection } from "../../src/cli/chart-kinds.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";
import { measureText } from "../../src/cli/text.ts";
import { conformChartScene } from "../../src/chart/conformance.ts";
import {
  ChartBudgetError,
  ChartValidationError,
} from "../../src/chart/errors.ts";
import { roundChartNumber } from "../../src/chart/geometry.ts";
import { CHART_RELEASE_POSTURES } from "../../src/chart/kind-meta.ts";
import type {
  ChartAxisLine,
  ChartDataPath,
  ChartScene,
  ChartTickLabel,
} from "../../src/chart/scene.ts";
import projectSlopeChartCli from "../../src/chart/kinds/slope/slope.cli.ts";
import describeSlopeChart, {
  slopeDataTableFacts,
  slopeDeltaCell,
  slopeDirectionWord,
  slopeUnitSuffix,
  slopeValueText,
} from "../../src/chart/kinds/slope/slope.description.ts";
import { releaseCorpus } from "../../src/chart/kinds/slope/slope.fixtures.ts";
import layoutSlopeChart from "../../src/chart/kinds/slope/slope.layout.ts";
import slopeKindMeta from "../../src/chart/kinds/slope/slope.meta.ts";
import type {
  SlopeChartSpec,
  ValidatedSlopeChart,
} from "../../src/chart/kinds/slope/slope.spec.ts";
import validateSlopeChart, {
  computeSlopeDelta,
} from "../../src/chart/kinds/slope/slope.validation.ts";

function corpusSpec(name: string): SlopeChartSpec {
  const found = releaseCorpus.cases.find((entry) => entry.name === name);
  assert(found !== undefined, `corpus case ${name} exists`);
  return found.spec;
}

function prepare(spec: unknown): {
  readonly validated: ValidatedSlopeChart;
  readonly scene: ChartScene;
} {
  const validated = validateSlopeChart(spec);
  return { validated, scene: conformChartScene(layoutSlopeChart(validated)) };
}

function project(
  spec: unknown,
  columns: number,
  profile: Partial<TerminalCapabilities> = {},
): ChartKindCliProjection {
  const validated = validateSlopeChart(spec);
  return projectSlopeChartCli(validated, {
    capabilities: testTerminalCapabilities({ columns, ...profile }),
    maxWidth: columns,
    theme: "dark",
    description: describeSlopeChart(validated),
  });
}

/** Strip frame borders and whitespace so wrapped facts compare whole. */
function compactTerminalSemantics(value: string): string {
  return stripAnsi(value)
    .split("\n")
    .map((line) => line.replace(/^[│|+]\s?/u, "").replace(/\s?[│|+]$/u, ""))
    .join("")
    .replaceAll(/\s+/gu, "");
}

Deno.test("every corpus case validates, lays out, conforms, and describes byte-identically", () => {
  for (const entry of releaseCorpus.cases) {
    const { validated, scene } = prepare(entry.spec);
    assertEquals(scene.sourceKind, "slope", entry.name);
    assert(scene.elements.length > 0, entry.name);
    const description = describeSlopeChart(validated);
    assertStringIncludes(description, `Title: ${entry.spec.title}`);
    assertEquals(
      JSON.stringify(prepare(entry.spec).scene),
      JSON.stringify(scene),
      `${entry.name} must lay out byte-identically`,
    );
    assertEquals(
      describeSlopeChart(validateSlopeChart(entry.spec)),
      description,
      `${entry.name} must describe byte-identically`,
    );
  }
});

Deno.test("the corpus proves every required release posture", () => {
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
    slopeKindMeta.budgets[releaseCorpus.overBudget.dimension]?.limit,
  );
});

Deno.test("a single before/after pair is refused toward the Stat component", () => {
  const single = releaseCorpus.invalid.find(
    (entry) => entry.name === "single-item",
  );
  assert(single !== undefined);
  const error = assertThrows(
    () => validateSlopeChart(single.spec),
    ChartValidationError,
  );
  assertEquals(error.code, "chart/invalid-spec");
  assertStringIncludes(error.message, "Stat");
});

Deno.test("deltas compute exactly in decimal space", () => {
  const pinned: readonly [number, number, string, string][] = [
    [0.1, 0.3, "+0.2", "up"],
    [0.3, 0.1, "-0.2", "down"],
    [1.05, 1.25, "+0.2", "up"],
    [0.7, 0.1, "-0.6", "down"],
    [5, 5, "0", "level"],
    [12, 18, "+6", "up"],
    [-8, 5, "+13", "up"],
    [2, -4, "-6", "down"],
    [1234.5, 1234.5, "0", "level"],
    [0.30000000000000004, 0.1, "-0.20000000000000004", "down"],
  ];
  for (const [before, after, deltaText, direction] of pinned) {
    const movement = computeSlopeDelta(before, after);
    assertEquals(movement.deltaText, deltaText, `${before} to ${after}`);
    assertEquals(movement.direction, direction, `${before} to ${after}`);
  }
  const description = describeSlopeChart(
    validateSlopeChart(corpusSpec("quantization-edge")),
  );
  assertStringIncludes(description, "One (one): 0.1 to 0.3, up +0.2");
  assertStringIncludes(description, "Three (three): 0.7 to 0.1, down -0.6");
  assert(!description.includes("0.19999"), "no floating increase artifact");
  assert(!description.includes("0.59999"), "no floating decrease artifact");
});

Deno.test("the direction vocabulary is pinned including the level wording", () => {
  assertEquals(slopeDirectionWord("up"), "up");
  assertEquals(slopeDirectionWord("down"), "down");
  assertEquals(slopeDirectionWord("level"), "unchanged");
  const description = describeSlopeChart(
    validateSlopeChart(corpusSpec("teams")),
  );
  assertStringIncludes(
    description,
    "Intake (intake): 12 reviews to 18 reviews, up +6 reviews",
  );
  assertStringIncludes(
    description,
    "Triage (triage): 24 reviews to 24 reviews, unchanged 0 reviews",
  );
  assertStringIncludes(
    description,
    "Review (review): 30 reviews to 21 reviews, down -9 reviews",
  );
  assertStringIncludes(description, "Largest increase: +6 reviews (Intake).");
  assertStringIncludes(description, "Largest decrease: -9 reviews (Review).");

  const allLevel = describeSlopeChart(validateSlopeChart({
    kind: "slope",
    title: "Nothing moved",
    summary: "Every item held level, which stays honest.",
    items: [
      { id: "a", label: "Alpha", before: 5, after: 5 },
      { id: "b", label: "Beta", before: 10, after: 10 },
    ],
  }));
  assert(!allLevel.includes("Largest increase"), "no increase to state");
  assert(!allLevel.includes("Largest decrease"), "no decrease to state");
  assertStringIncludes(allLevel, "Alpha (a): 5 to 5, unchanged 0");
});

Deno.test("the description skeleton and the data-table facts stay aligned", () => {
  const validated = validateSlopeChart(corpusSpec("teams"));
  const lines = describeSlopeChart(validated).trimEnd().split("\n");
  assertEquals(lines[2], "Comparison: Before to After across 5 items.");
  assertEquals(
    lines[3],
    "Value axis (Reviews): linear scale from 6 to 30 reviews.",
  );
  assertEquals(lines[4], "Data (5 items):");
  const facts = slopeDataTableFacts(validated);
  assertEquals(
    facts.columns.map(({ header }) => header),
    ["Item", "Before", "After", "Change"],
  );
  assertEquals(
    facts.columns.map(({ numeric }) => numeric),
    [false, true, true, true],
  );
  assertEquals(facts.rows.length, validated.items.length);
  facts.rows.forEach((row, index) => {
    const item = validated.items[index];
    const line = lines[5 + index];
    assert(item !== undefined && line !== undefined);
    assertEquals(row, [
      `${item.label} (${item.id})`,
      slopeValueText(item.before, " reviews"),
      slopeValueText(item.after, " reviews"),
      slopeDeltaCell(item, " reviews"),
    ]);
    assertEquals(
      line,
      `${row[0]}: ${row[1]} to ${row[2]}, ${
        slopeDirectionWord(item.direction)
      } ${row[3]}`,
      "data lines and table rows must state the same facts 1:1",
    );
  });

  const renamed = validateSlopeChart(corpusSpec("negative-balances"));
  assertStringIncludes(
    describeSlopeChart(renamed),
    "Comparison: Start to Finish across 3 items.",
  );
  assertEquals(
    slopeDataTableFacts(renamed).columns.map(({ header }) => header),
    ["Item", "Start", "Finish", "Change"],
  );
});

Deno.test("the exact frame prints every item's label, both values, and delta", () => {
  for (const entry of releaseCorpus.cases) {
    const validated = validateSlopeChart(entry.spec);
    const unit = slopeUnitSuffix(validated.value);
    const projection = project(entry.spec, 120);
    assert(
      projection.kind === "frame",
      `${entry.name} must render its exact frame at review width`,
    );
    const compact = compactTerminalSemantics(projection.frame);
    const facts = [
      validated.title,
      validated.summary,
      validated.endpoints.before,
      validated.endpoints.after,
      ...validated.items.flatMap((item) => [
        item.label,
        slopeValueText(item.before, unit),
        slopeValueText(item.after, unit),
        slopeDeltaCell(item, unit),
      ]),
    ];
    for (const fact of facts) {
      assert(
        compact.includes(fact.replaceAll(/\s+/gu, "")),
        `${entry.name} lost ${JSON.stringify(fact)}`,
      );
    }
  }
});

Deno.test("direction triangles are correct per direction in both repertoires", () => {
  // A data row carries the between-values separator; the title and summary
  // lines never do, so the pair pins the search to the item's row.
  const rowWith = (
    lines: readonly string[],
    label: string,
    separator: string,
  ): string => {
    const found = lines.find((line) =>
      line.includes(label) && line.includes(separator)
    );
    assert(found !== undefined, `a row states ${label}`);
    return found;
  };
  const unicode = project(corpusSpec("teams"), 80);
  assert(unicode.kind === "frame");
  const unicodeLines = stripAnsi(unicode.frame).split("\n");
  assertStringIncludes(rowWith(unicodeLines, "Intake", "→"), "▲");
  assertStringIncludes(rowWith(unicodeLines, "Triage", "→"), "▶");
  assertStringIncludes(rowWith(unicodeLines, "Review", "→"), "▼");

  const ascii = project(corpusSpec("teams"), 80, { unicode: false });
  assert(ascii.kind === "frame");
  const asciiLines = stripAnsi(ascii.frame).split("\n");
  assertStringIncludes(rowWith(asciiLines, "Intake", "->"), "^ ");
  assertStringIncludes(rowWith(asciiLines, "Review", "->"), "v ");
  // The level cue is the right-pointing triangle; in ASCII it degrades to
  // ">" beside the unsigned zero delta, distinct from the "->" separator.
  assertStringIncludes(rowWith(asciiLines, "Triage", "->"), ">  0 reviews");
});

Deno.test("the scene draws two vertical ordinal axes, two-point paths, and outside labels", () => {
  const { validated, scene } = prepare(corpusSpec("teams"));
  const plotRight = roundChartNumber(scene.plot.x + scene.plot.width);

  const axes = scene.elements.filter(
    (element): element is ChartAxisLine => element.kind === "axis-line",
  );
  assertEquals(axes.length, 2);
  for (const axis of axes) {
    assertEquals(axis.start.x, axis.end.x, `${axis.id} runs vertical`);
  }
  assertEquals(
    axes.map(({ start }) => start.x).toSorted((a, b) => a - b),
    [scene.plot.x, plotRight],
  );

  const paths = scene.elements.filter(
    (element): element is ChartDataPath => element.kind === "data-path",
  );
  assertEquals(paths.length, validated.items.length);
  for (const item of validated.items) {
    const path = paths.find(({ id }) => id === `path-${item.id}`);
    assert(path !== undefined, `path for ${item.id}`);
    assertEquals(path.points.length, 2);
    assertEquals(path.paint, "series-1", "identity comes from direct labels");
    assertEquals(path.points[0]?.x, scene.plot.x);
    assertEquals(path.points[1]?.x, plotRight);
  }

  const labels = scene.elements.filter(
    (element): element is ChartTickLabel => element.kind === "tick-label",
  );
  for (const item of validated.items) {
    const before = labels.find(({ id }) => id === `before-label-${item.id}`);
    const after = labels.find(({ id }) => id === `after-label-${item.id}`);
    assert(before !== undefined && after !== undefined);
    assert(
      before.bounds.x + before.bounds.width <= scene.plot.x,
      "direct labels sit left of the before axis",
    );
    assert(
      after.bounds.x >= plotRight,
      "direct labels sit right of the after axis",
    );
    assertStringIncludes(before.text, item.label);
  }
  for (const id of ["endpoint-before", "endpoint-after"]) {
    const endpoint = labels.find((label) => label.id === id);
    assert(endpoint !== undefined);
    assert(
      endpoint.bounds.y >= scene.plot.y + scene.plot.height,
      "endpoint names sit beneath the axes",
    );
  }
});

Deno.test("near-equal endpoint values refuse with the label-fit code", () => {
  const error = assertThrows(
    () =>
      prepare({
        kind: "slope",
        title: "Converging items",
        summary: "Two after values nearly coincide, so labels cannot place.",
        items: [
          { id: "a", label: "Alpha", before: 5, after: 10 },
          { id: "b", label: "Beta", before: 6, after: 10.2 },
        ],
      }),
    ChartValidationError,
  );
  assertEquals(error.code, "chart/layout/label-fit");
  assertStringIncludes(error.remedy, "fewer items");
  assertStringIncludes(error.remedy, "table");
});

Deno.test("an all-identical comparison stays valid and keeps its delta list while the drawing refuses", () => {
  const spec = {
    kind: "slope",
    title: "Nothing moved anywhere",
    summary: "Every item states one identical value at both endpoints.",
    items: [
      { id: "a", label: "Alpha", before: 5, after: 5 },
      { id: "b", label: "Beta", before: 5, after: 5 },
    ],
  };
  const validated = validateSlopeChart(spec);
  for (const item of validated.items) {
    assertEquals(item.direction, "level");
    assertEquals(item.deltaText, "0");
  }
  const projection = project(spec, 80);
  assert(projection.kind === "frame", "the permanent terminal form renders");
  // The degenerate one-value domain pads deterministically so the refusal
  // is the typed stacked-label one, never a scale crash.
  const error = assertThrows(
    () => layoutSlopeChart(validated),
    ChartValidationError,
  );
  assertEquals(error.code, "chart/layout/label-fit");
});

Deno.test("width declines carry the exceeded fact and its limit", () => {
  // Column plan for the teams corpus case: label 7, both value columns 10,
  // delta 10, separator 1 → one-cell-label minimum 44.
  assertEquals(project(corpusSpec("teams"), 28), {
    kind: "declined",
    code: "width",
    fact: 28,
    limit: 44,
  });
  assertEquals(project(corpusSpec("teams"), 44), {
    kind: "declined",
    code: "label-wrap",
    fact: 7,
    limit: 1,
  });

  const longTitle = {
    ...corpusSpec("minimum"),
    title:
      "A deliberately very long probe title that cannot embed in this frame border",
  };
  const titled = project(longTitle, 60);
  assert(titled.kind === "declined");
  assertEquals(titled.code, "title-width");
  assertEquals(titled.fact, measureText(longTitle.title));
  assertEquals(titled.limit, 54);
});

Deno.test("frames are deterministic, bounded, and ASCII-pure across widths", () => {
  const spec = corpusSpec("teams");
  for (const columns of [28, 44, 80, 120]) {
    for (const unicode of [true, false]) {
      for (const colorDepth of ["none", "truecolor"] as const) {
        const profile = { unicode, colorDepth };
        const first = project(spec, columns, profile);
        for (let run = 0; run < 3; run += 1) {
          assertEquals(project(spec, columns, profile), first);
        }
        if (first.kind === "declined") {
          assert(first.code.length > 0);
          assert(Number.isSafeInteger(first.fact));
          assert(Number.isSafeInteger(first.limit));
          continue;
        }
        for (const line of stripAnsi(first.frame).split("\n")) {
          assert(
            measureText(line) <= columns,
            `frame stays within ${columns} columns`,
          );
        }
        if (!unicode && colorDepth === "none") {
          assert(
            Array.from(first.frame).every((character) =>
              (character.codePointAt(0) ?? 0) <= 0x7f
            ),
            "the ASCII repertoire emits pure ASCII",
          );
        }
      }
    }
  }
});

Deno.test("metadata pins the enhanced exact stance and the permanent textual terminal form", () => {
  assertEquals(slopeKindMeta.slug, "slope");
  assertEquals(slopeKindMeta.order, 60);
  assertEquals(slopeKindMeta.cli, { stance: "enhanced", honesty: "exact" });
  assertStringIncludes(slopeKindMeta.description, "delta list");
  assertEquals(slopeKindMeta.budgets.items?.limit, 12);
  assertEquals(slopeKindMeta.budgets.itemLabelGraphemes?.limit, 32);
  assertEquals(slopeKindMeta.budgets.endpointLabelGraphemes?.limit, 16);
  assertEquals(slopeKindMeta.budgets.valueMagnitudeSpan?.limit, 4);
});

Deno.test("negative values are allowed because position, not length, encodes the value", () => {
  const { validated } = prepare(corpusSpec("negative-balances"));
  const intake = validated.items[0];
  assert(intake !== undefined);
  assertEquals(intake.deltaText, "+13");
  const description = describeSlopeChart(validated);
  assertStringIncludes(description, "Intake (intake): -8 to 5, up +13");
  const projection = project(corpusSpec("negative-balances"), 80);
  assert(projection.kind === "frame");
  const compact = compactTerminalSemantics(projection.frame);
  assert(compact.includes("Start"), "custom endpoint heads the list");
  assert(compact.includes("Finish"), "custom endpoint heads the list");
  assert(compact.includes("-8→5"), "the signed movement prints contiguously");
});
