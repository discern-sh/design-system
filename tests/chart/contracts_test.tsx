import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import {
  chartAltText,
  ChartBudgetError,
  ChartValidationError,
  describeChart,
  renderChartSvg,
} from "../../src/chart/mod.ts";
import {
  CHART_CLI_HONESTY_TIERS,
  CHART_RELEASE_POSTURES,
} from "../../src/chart/kind-meta.ts";
import { chartKindAuthorGuide } from "../../src/chart/kinds.ts";
import { conformChartScene } from "../../src/chart/conformance.ts";
import { cliReleaseFixtures } from "../../src/components/editorial/chart/chart.cli.ts";
import ChartExamples from "../../src/components/editorial/chart/chart.examples.tsx";
import { chartKindCliRegistry } from "../../src/generated/chart-cli-registry.ts";
import {
  prepareChart,
  validateChart,
} from "../../src/generated/chart-dispatch.ts";
import { chartKindRegistry } from "../../src/generated/chart-registry.ts";
import type { ChartSpec } from "../../src/generated/chart-spec.ts";

function expectChartError(
  action: () => unknown,
  code: string,
): ChartValidationError {
  const error = assertThrows(action);
  assertInstanceOf(error, ChartValidationError);
  assertEquals(error.code, code);
  assert(error.remedy.length > 0);
  return error;
}

function assertFiniteTree(
  value: unknown,
  path = "value",
  seen = new Set<object>(),
): void {
  if (typeof value === "number") {
    assert(Number.isFinite(value), `${path} must be finite`);
    assert(!Object.is(value, -0), `${path} must normalize negative zero`);
    return;
  }
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    assertFiniteTree(child, `${path}.${key}`, seen);
  }
}

function assertDeeplyFrozen(
  value: unknown,
  path = "value",
  seen = new Set<object>(),
): void {
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  seen.add(value);
  assert(Object.isFrozen(value), `${path} must be frozen`);
  for (const [key, child] of Object.entries(value)) {
    assertDeeplyFrozen(child, `${path}.${key}`, seen);
  }
}

Deno.test("generated chart release corpus enrolls every posture and refusal", () => {
  assert(chartKindRegistry.length > 0);
  for (const entry of chartKindRegistry) {
    const context = entry.meta.slug;
    assert(entry.meta.useWhen.length > 0 && entry.meta.notWhen.length > 0);
    assert(Object.keys(entry.meta.budgets).length > 0);
    const cli = chartKindCliRegistry[
      entry.meta.slug as keyof typeof chartKindCliRegistry
    ];
    assert(cli !== undefined, `${context} has no generated CLI entry`);
    assertEquals(cli.stance, entry.meta.cli.stance);
    if (entry.meta.cli.stance === "enhanced") {
      assert(
        CHART_CLI_HONESTY_TIERS.includes(entry.meta.cli.honesty),
        `${context} has no admitted honesty tier`,
      );
    }

    assertEquals(entry.releaseCorpus.kind, entry.meta.slug);
    assertEquals(entry.fixtures.length, entry.releaseCorpus.cases.length);
    const postures = new Set(
      entry.releaseCorpus.cases.flatMap(({ postures }) => postures),
    );
    assertEquals(postures, new Set(CHART_RELEASE_POSTURES));
    assertEquals(
      new Set(entry.releaseCorpus.cases.map(({ name }) => name)).size,
      entry.releaseCorpus.cases.length,
      `${context} release case names must be unique`,
    );

    for (const [index, releaseCase] of entry.releaseCorpus.cases.entries()) {
      const caseContext = `${context}/${releaseCase.name}`;
      assertEquals(entry.fixtures[index], releaseCase.spec);
      const prepared = prepareChart(releaseCase.spec);
      assertEquals(prepared.validated.kind, entry.meta.slug);
      assertEquals(conformChartScene(prepared.scene), prepared.scene);
      assertStringIncludes(
        prepared.description,
        `Title: ${releaseCase.spec.title}`,
      );
      assertEquals(describeChart(releaseCase.spec), prepared.description);
      assertStringIncludes(
        chartAltText(releaseCase.spec as ChartSpec),
        releaseCase.spec.title,
      );
      assertStringIncludes(
        renderChartSvg(releaseCase.spec as ChartSpec),
        "<svg",
      );
      assertFiniteTree(prepared.scene, `${caseContext}.scene`);
      assertDeeplyFrozen(prepared.scene, `${caseContext}.scene`);
      assertDeeplyFrozen(releaseCase.spec, `${caseContext}.spec`);
    }

    const refusal = expectChartError(
      () => validateChart(entry.releaseCorpus.overBudget.spec),
      `chart/budget/${entry.releaseCorpus.overBudget.dimension}`,
    );
    assertInstanceOf(refusal, ChartBudgetError);
    assertEquals(refusal.dimension, entry.releaseCorpus.overBudget.dimension);
    assertEquals(
      refusal.authorAction,
      entry.releaseCorpus.overBudget.authorAction,
    );
    for (const invalid of entry.releaseCorpus.invalid) {
      expectChartError(() => validateChart(invalid.spec), invalid.code);
    }
    assertDeeplyFrozen(entry.releaseCorpus, `${context}.releaseCorpus`);
  }
});

Deno.test("every generated chart kind reaches Catalogue, CLI examples, and author guidance", () => {
  const catalogue = renderToStaticMarkup(<ChartExamples />);
  const exampleNames = new Set(cliReleaseFixtures.map(({ name }) => name));
  for (const entry of chartKindRegistry) {
    const slug = entry.meta.slug;
    assertStringIncludes(catalogue, `data-chart-kind="${slug}"`);
    for (const releaseCase of entry.releaseCorpus.cases) {
      assertStringIncludes(
        catalogue,
        `${releaseCase.name}: ${releaseCase.postures.join(", ")}`,
      );
    }
    for (
      const suffix of [
        entry.meta.cli.stance,
        "structural",
        "universal-description",
        "maximum-density",
        "narrow-ascii-fallback",
      ]
    ) {
      assert(exampleNames.has(`${slug}-${suffix}`), `${slug}-${suffix}`);
    }
    assertStringIncludes(
      chartKindAuthorGuide,
      `## ${entry.meta.name} (\`${slug}\`)`,
    );
    if (entry.meta.cli.stance === "enhanced") {
      assertStringIncludes(
        chartKindAuthorGuide,
        `CLI stance: enhanced; honesty tier: ${entry.meta.cli.honesty}.`,
      );
    }
  }
  assertEquals(exampleNames.size, chartKindRegistry.length * 5);
});
