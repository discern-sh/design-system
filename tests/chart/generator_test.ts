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

/** The chart family exactly as wave 3A enables its terminal surface. */
function shippedSurfaceFamily(root: URL): KindFamilyConfig {
  return {
    ...chartKindFamily(root),
    cli: {
      moduleStance: "enhanced",
      registryFile: "chart-cli-registry.ts",
      contractsModule: "../cli/chart-kinds.ts",
    },
  };
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
    assertEquals(
      generated.cliRegistry,
      undefined,
      "no chart CLI registry exists before the terminal surface ships",
    );
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

Deno.test("a chart release corpus must cover the chart-specific postures", async () => {
  for (const posture of ["quantization-edge", "formatter-table"]) {
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
      chartKind({ cliValue: '{ stance: "enhanced", honesty: "exact" }' }),
    );
    assertEquals((await loadChartKindSources(url)).length, 1);
  }, CHART_PREFIX);
});

Deno.test("a chart projector module is refused while the family surface is pending", async () => {
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
      () => loadChartKindSources(url),
      Error,
      "supplies a kind CLI module before the chart family's terminal surface exists",
    );
  }, CHART_PREFIX);
});

Deno.test("the moment the terminal surface ships, a missing projector fails loudly", async () => {
  await withTemporaryRoot(async (path, url) => {
    await writeKind(
      path,
      "probe",
      chartKind({ cliValue: '{ stance: "enhanced", honesty: "exact" }' }),
    );
    await assertRejects(
      () => loadKindFamilySources(shippedSurfaceFamily(url)),
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
      shippedSurfaceFamily(url),
      url,
    );
    assert(generated.cliRegistry?.includes("projectProbeChartCli"));
  }, CHART_PREFIX);
});

Deno.test("the real bar kind enrols through the canonical chart root", async () => {
  const kinds = await loadChartKindSources();
  assertEquals(kinds.length, 1);
  const bar = kinds[0];
  assert(bar !== undefined);
  assertEquals(bar.meta.slug, "bar");
  assertEquals(bar.meta.cli, { stance: "enhanced", honesty: "exact" });
  assertEquals(bar.meta.budgets.series?.limit, 6);
  assertEquals(bar.meta.budgets.categories?.limit, 12);
  assertEquals(bar.meta.budgets.categoryLabelGraphemes?.limit, 48);
  assertEquals(bar.meta.budgets.seriesLabelGraphemes?.limit, 32);
  assertEquals(bar.meta.budgets.valueMagnitudeSpan?.limit, 4);
});
