import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import {
  ChartBudgetError,
  ChartValidationError,
} from "../../src/chart/errors.ts";
import { roundChartNumber } from "../../src/chart/geometry.ts";
import { CHART_RELEASE_POSTURES } from "../../src/chart/kind-meta.ts";
import type { ChartMark } from "../../src/chart/scene.ts";
import barKindMeta from "../../src/chart/kinds/bar/bar.meta.ts";
import { releaseCorpus } from "../../src/chart/kinds/bar/bar.fixtures.ts";
import {
  describeChart,
  prepareChart,
} from "../../src/generated/chart-dispatch.ts";
import { chartKindRegistry } from "../../src/generated/chart-registry.ts";

function corpusSpec(name: string): unknown {
  const found = releaseCorpus.cases.find((entry) => entry.name === name);
  assert(found !== undefined, `corpus case ${name} exists`);
  return found.spec;
}

Deno.test("every corpus case validates, lays out, conforms, and describes", () => {
  for (const entry of releaseCorpus.cases) {
    const prepared = prepareChart(entry.spec);
    assertEquals(prepared.scene.sourceKind, "bar");
    assert(prepared.scene.elements.length > 0);
    assertStringIncludes(prepared.description, `Title: ${entry.spec.title}`);
    assertEquals(
      JSON.stringify(prepareChart(entry.spec).scene),
      JSON.stringify(prepared.scene),
      `${entry.name} must lay out byte-identically`,
    );
  }
});

Deno.test("every invalid corpus case refuses with its declared code", () => {
  for (const entry of releaseCorpus.invalid) {
    const error = assertThrows(
      () => prepareChart(entry.spec),
      ChartValidationError,
      undefined,
      entry.name,
    );
    assertEquals(error.code, entry.code, `${entry.name} refusal code`);
  }
});

Deno.test("the over-budget refusal matches the Metadata dimension and remedy", () => {
  const error = assertThrows(
    () => prepareChart(releaseCorpus.overBudget.spec),
    ChartBudgetError,
  );
  assertEquals(error.dimension, releaseCorpus.overBudget.dimension);
  assertEquals(error.authorAction, releaseCorpus.overBudget.authorAction);
  assertEquals(
    error.limit,
    barKindMeta.budgets[releaseCorpus.overBudget.dimension]?.limit,
  );
});

Deno.test("negative values name the deferred diverging variant in the refusal", () => {
  const invalid = releaseCorpus.invalid.find(
    (entry) => entry.name === "negative-value",
  );
  assert(invalid !== undefined);
  const error = assertThrows(
    () => prepareChart(invalid.spec),
    ChartValidationError,
  );
  assertEquals(error.code, "chart/negative-value");
  assertStringIncludes(error.message, "zero baseline");
  assertStringIncludes(error.message, "diverging");
});

Deno.test("declared gaps stay distinct from zero in the description", () => {
  const description = describeChart(corpusSpec("regions"));
  assertStringIncludes(description, "Open 0 reviews");
  assertStringIncludes(description, "Open no stated value");
  assertStringIncludes(description, "Largest value: 42 reviews");
  assertStringIncludes(
    description,
    "Smallest stated value: 0 reviews",
  );
});

Deno.test("the orientation hint changes no described fact", () => {
  const description = describeChart(corpusSpec("proportion-horizontal"));
  assert(!description.includes("horizontal"));
  assert(!description.includes("vertical"));
  assertStringIncludes(description, "proportion of each category's whole");
});

Deno.test("proportion segments stack exactly with shared boundaries", () => {
  const prepared = prepareChart(corpusSpec("proportion-horizontal"));
  const marks = prepared.scene.elements.filter(
    (element): element is ChartMark => element.kind === "mark",
  );
  const byCategory = new Map<string, ChartMark[]>();
  for (const mark of marks) {
    byCategory.set(mark.categoryId, [
      ...byCategory.get(mark.categoryId) ?? [],
      mark,
    ]);
  }
  for (const [category, stack] of byCategory) {
    const ordered = stack.toSorted((left, right) =>
      left.bounds.x - right.bounds.x
    );
    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1];
      const current = ordered[index];
      assert(previous !== undefined && current !== undefined);
      assertEquals(
        current.bounds.x,
        roundChartNumber(previous.bounds.x + previous.bounds.width),
        `${category} segments must share exact boundaries`,
      );
    }
  }
});

Deno.test("proportion geometry stays complete when finite shares would overflow a binary total", () => {
  const prepared = prepareChart({
    kind: "bar",
    title: "Extreme equal shares",
    summary: "Two finite extremes still divide one whole equally.",
    variant: "proportion",
    categories: [{ id: "whole", label: "Whole" }],
    series: [
      { id: "first", label: "First", values: [Number.MAX_VALUE] },
      { id: "second", label: "Second", values: [Number.MAX_VALUE] },
    ],
  });
  const marks = prepared.scene.elements.filter(
    (element): element is ChartMark => element.kind === "mark",
  );
  assertEquals(marks.length, 2);
  assertEquals(marks[0]?.bounds.height, marks[1]?.bounds.height);
  assertEquals(
    roundChartNumber(
      (marks[0]?.bounds.height ?? 0) + (marks[1]?.bounds.height ?? 0),
    ),
    prepared.scene.plot.height,
  );
});

Deno.test("tick labels ride the nice-step authority and the authored format", () => {
  const minimal = prepareChart(corpusSpec("minimum"));
  const minimalLabels = minimal.scene.elements
    .filter((element) => element.kind === "tick-label")
    .filter((element) => element.axis === "value")
    .map((element) => element.text);
  assertEquals(minimalLabels, ["0", "5", "10", "15", "20"]);

  const formatted = prepareChart(corpusSpec("formatter-table"));
  const formattedLabels = formatted.scene.elements
    .filter((element) => element.kind === "tick-label")
    .filter((element) => element.axis === "value")
    .map((element) => element.text);
  assertEquals(
    formattedLabels,
    ["0.0", "5.0k", "10.0k", "15.0k", "20.0k", "25.0k"],
  );

  const proportion = prepareChart(corpusSpec("proportion-horizontal"));
  const shareLabels = proportion.scene.elements
    .filter((element) => element.kind === "tick-label")
    .filter((element) => element.axis === "value")
    .map((element) => element.text);
  assertEquals(shareLabels, ["0%", "20%", "40%", "60%", "80%", "100%"]);
});

Deno.test("a stated value too small to render truthfully is refused", () => {
  const error = assertThrows(
    () =>
      prepareChart({
        kind: "bar",
        title: "Sub-resolution",
        summary: "A sliver beside a large value cannot render truthfully.",
        categories: [
          { id: "large", label: "Large" },
          { id: "small", label: "Small" },
        ],
        series: [{ id: "value", label: "Value", values: [1000, 0.1] }],
      }),
    ChartValidationError,
  );
  assertEquals(error.code, "chart/sub-resolution");
});

Deno.test("colliding axis labels are refused with an actionable remedy", () => {
  const error = assertThrows(
    () =>
      prepareChart({
        kind: "bar",
        title: "Crowded ticks",
        summary: "Wide grouped numerals collide under a horizontal axis.",
        orientation: "horizontal",
        value: { format: { kind: "decimal", decimals: 0, grouping: true } },
        categories: [{ id: "one", label: "One" }],
        series: [{ id: "value", label: "Value", values: [45_000] }],
      }),
    ChartValidationError,
  );
  assertEquals(error.code, "chart/layout/label-fit");
  assertStringIncludes(error.remedy, "compact value format");
});

Deno.test("the generated registry carries the bar corpus and Metadata", () => {
  assertEquals(
    chartKindRegistry.map((entry) => entry.meta.slug),
    ["bar", "line", "distribution", "heatmap", "scatter", "slope"],
  );
  const entry = chartKindRegistry[0];
  assert(entry !== undefined);
  assertEquals(entry.meta.slug, "bar");
  assertEquals(entry.releaseCorpus.kind, "bar");
  assertEquals(entry.fixtures.length, releaseCorpus.cases.length);
  for (const registered of chartKindRegistry) {
    const postures = new Set(
      registered.releaseCorpus.cases.flatMap((kase) => kase.postures),
    );
    for (const posture of CHART_RELEASE_POSTURES) {
      assert(
        postures.has(posture),
        `${registered.meta.slug} corpus covers ${posture}`,
      );
    }
  }
});
