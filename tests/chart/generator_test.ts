import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  chartKindFamily,
  generateChartKindSources,
  loadChartKindSources,
} from "../../scripts/generate.ts";
import {
  generateKindFamilySources,
  type KindFamilyConfig,
  loadKindFamilySources,
} from "../../scripts/kind-family.ts";
import { CHART_RELEASE_POSTURES } from "../../src/chart/kind-meta.ts";
import { CHART_REFUSED_FORMS } from "../../src/chart/refusals.ts";
import {
  chartKindAuthorGuide,
  chartKindMetadata,
} from "../../src/chart/kinds.ts";
import {
  type FamilyVocabulary,
  type FixtureKindOptions,
  REQUIRED,
  withTemporaryRoot,
  writeKind,
} from "../kind_family_harness.ts";

const CHART_FAMILY: FamilyVocabulary = {
  word: "chart",
  typeName: "Chart",
  postures: CHART_RELEASE_POSTURES,
};

const CHART_PREFIX = "chart-kind-generator-";

function chartKind(options: FixtureKindOptions = {}): FixtureKindOptions {
  return {
    family: CHART_FAMILY,
    budgetRemedy: "split-figure",
    ...options,
  };
}

/** A family whose terminal surface has not shipped, for the machinery guard. */
function pendingSurfaceFamily(root: URL): KindFamilyConfig {
  const { cli: _cli, ...family } = chartKindFamily(root);
  return family;
}

Deno.test("one conforming chart kind enrols every generated consumer together", async () => {
  await withTemporaryRoot(async (path, url) => {
    await writeKind(path, "probe", chartKind());
    const generated = await generateChartKindSources(url);
    assert(generated.spec.includes("ProbeChartSpec"));
    assert(generated.spec.includes("ValidatedProbeChart"));
    assert(generated.metadata.includes("# Built-in Chart kinds"));
    assert(generated.metadata.includes("chartKindMetadata"));
    assert(generated.registry.includes("chartKindRegistry"));
    assert(generated.registry.includes("probe.fixtures.ts"));
    assert(generated.dispatch.includes('case "probe"'));
    assert(generated.dispatch.includes("conformChartScene"));
    assert(generated.dispatch.includes('"chart/invalid-spec"'));
    assert(generated.exports.includes("probe/mod.ts"));
    assert(
      generated.cliRegistry.includes('"probe": { stance: "description" }'),
      "the shipped terminal surface registers a description-only kind",
    );
    assert(generated.cliRegistry.includes("projectChartKindCli"));
  }, CHART_PREFIX);
});

Deno.test("missing mandatory chart kind surfaces fail generation", async () => {
  for (
    const missing of [
      "spec",
      "validation",
      "layout",
      "description",
      "fixtures",
      "mod",
    ] as const
  ) {
    await withTemporaryRoot(async (path, url) => {
      await writeKind(
        path,
        "probe",
        chartKind({
          include: REQUIRED.filter((surface) => surface !== missing),
        }),
      );
      await assertRejects(
        () => loadChartKindSources(url),
        Error,
        `missing required ${missing}`,
      );
    }, CHART_PREFIX);
  }
});

Deno.test("a chart release corpus must cover every required posture", async () => {
  for (const posture of CHART_RELEASE_POSTURES) {
    await withTemporaryRoot(async (path, url) => {
      await writeKind(
        path,
        "probe",
        chartKind({
          family: {
            ...CHART_FAMILY,
            postures: CHART_FAMILY.postures.filter(
              (candidate) => candidate !== posture,
            ),
          },
        }),
      );
      await assertRejects(
        () => loadChartKindSources(url),
        Error,
        `missing ${posture} posture`,
      );
    }, CHART_PREFIX);
  }
});

Deno.test("chart kind Metadata declares stance and honesty tier together at birth", async () => {
  await withTemporaryRoot(async (path, url) => {
    await writeKind(
      path,
      "probe",
      chartKind({ cliValue: '{ stance: "enhanced" }' }),
    );
    await assertRejects(
      () => loadChartKindSources(url),
      Error,
      "without exactly one valid honesty tier",
    );
  }, CHART_PREFIX);
  await withTemporaryRoot(async (path, url) => {
    await writeKind(
      path,
      "probe",
      chartKind({ cliValue: '{ stance: "enhanced", honesty: "vivid" }' }),
    );
    await assertRejects(
      () => loadChartKindSources(url),
      Error,
      "without exactly one valid honesty tier",
    );
  }, CHART_PREFIX);
  await withTemporaryRoot(async (path, url) => {
    await writeKind(
      path,
      "probe",
      chartKind({ cliValue: '{ stance: "description", honesty: "exact" }' }),
    );
    await assertRejects(
      () => loadChartKindSources(url),
      Error,
      "beyond its description stance",
    );
  }, CHART_PREFIX);
  await withTemporaryRoot(async (path, url) => {
    await writeKind(
      path,
      "probe",
      chartKind({
        cliValue: '{ stance: "enhanced", honesty: "exact" }',
        include: [...REQUIRED, "cli"],
      }),
    );
    assertEquals((await loadChartKindSources(url)).length, 1);
    assert(
      (await generateChartKindSources(url)).metadata.includes(
        "CLI stance: enhanced; honesty tier: exact.",
      ),
    );
  }, CHART_PREFIX);
});

Deno.test("a kind CLI module is refused while a family surface is pending", async () => {
  await withTemporaryRoot(async (path, url) => {
    await writeKind(
      path,
      "probe",
      chartKind({
        cliValue: '{ stance: "enhanced", honesty: "exact" }',
        include: [...REQUIRED, "cli"],
      }),
    );
    await assertRejects(
      () => loadKindFamilySources(pendingSurfaceFamily(url)),
      Error,
      "supplies a kind CLI module before the chart family's terminal surface exists",
    );
  }, CHART_PREFIX);
});

Deno.test("the shipped terminal surface makes a missing projector fail loudly", async () => {
  await withTemporaryRoot(async (path, url) => {
    await writeKind(
      path,
      "probe",
      chartKind({ cliValue: '{ stance: "enhanced", honesty: "exact" }' }),
    );
    await assertRejects(
      () => loadChartKindSources(url),
      Error,
      "declares enhanced chart CLI but has no .cli.ts file",
    );
  }, CHART_PREFIX);
  await withTemporaryRoot(async (path, url) => {
    await writeKind(
      path,
      "probe",
      chartKind({
        cliValue: '{ stance: "enhanced", honesty: "exact" }',
        include: [...REQUIRED, "cli"],
      }),
    );
    const generated = await generateKindFamilySources(
      chartKindFamily(url),
      url,
    );
    assert(generated.cliRegistry?.includes("projectProbeChartCli"));
  }, CHART_PREFIX);
});

Deno.test("the complete kind library enrols through the canonical chart root", async () => {
  const kinds = await loadChartKindSources();
  assertEquals(
    kinds.map((kind) => kind.meta.slug),
    ["bar", "line", "distribution", "heatmap", "scatter", "slope"],
  );
  const generated = await generateChartKindSources();
  for (const kind of kinds) {
    const projector = `project${kind.meta.slug[0]?.toUpperCase()}${
      kind.meta.slug.slice(1)
    }ChartCli`;
    assert(generated.cliRegistry.includes(projector));
    assert(
      generated.cliRegistry.includes(
        `"${kind.meta.slug}": { stance: "enhanced", project:`,
      ),
    );
  }
  const tiers = Object.fromEntries(
    kinds.map((kind) => [kind.meta.slug, kind.meta.cli]),
  );
  assertEquals(tiers, {
    bar: { stance: "enhanced", honesty: "exact" },
    line: { stance: "enhanced", honesty: "faithful" },
    distribution: { stance: "enhanced", honesty: "exact" },
    heatmap: { stance: "enhanced", honesty: "faithful" },
    scatter: { stance: "enhanced", honesty: "faithful" },
    slope: { stance: "enhanced", honesty: "exact" },
  });
  const bar = kinds[0];
  assert(bar !== undefined);
  assertEquals(bar.meta.budgets.series?.limit, 6);
  assertEquals(bar.meta.budgets.categories?.limit, 12);
  assertEquals(bar.meta.budgets.categoryLabelGraphemes?.limit, 48);
  assertEquals(bar.meta.budgets.seriesLabelGraphemes?.limit, 32);
  assertEquals(bar.meta.budgets.valueMagnitudeSpan?.limit, 4);
});

Deno.test("the generated author guide names every refused form with its remedy", () => {
  assert(chartKindAuthorGuide.includes("## Refused forms"));
  for (const { form, remedy } of CHART_REFUSED_FORMS) {
    assert(
      chartKindAuthorGuide.includes(`- ${form} — ${remedy}`),
      `author guide must name ${form} with its remedy`,
    );
  }
});

Deno.test("the generated author guide preserves every terminal honesty tier", () => {
  for (const meta of chartKindMetadata) {
    const terminal = meta.cli.stance === "enhanced"
      ? `CLI stance: enhanced; honesty tier: ${meta.cli.honesty}.`
      : `CLI stance: ${meta.cli.stance}.`;
    assert(
      chartKindAuthorGuide.includes(terminal),
      `${meta.slug} must publish ${terminal}`,
    );
  }
});
