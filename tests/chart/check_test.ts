import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  ChartBudgetError,
  checkChart,
  renderChartSvg,
} from "../../src/chart/mod.ts";
import { chartKindRegistry } from "../../src/generated/chart-registry.ts";

Deno.test("checkChart reports every budget refusal and ends at a structural one", () => {
  const entry = chartKindRegistry[0];
  assert(entry !== undefined);
  const base = entry.releaseCorpus.cases[0]?.spec as Record<string, unknown>;
  const overBudget = {
    ...base,
    title: "t".repeat(97),
    summary: "s".repeat(241),
  };
  const result = checkChart(overBudget);
  assertEquals(result.ok, false);
  assertEquals(
    result.findings.map(({ code, path }) => `${code} ${path}`),
    [
      "chart/budget/titleGraphemes spec.title",
      "chart/budget/summaryGraphemes spec.summary",
    ],
  );
  for (const finding of result.findings) {
    assert(
      finding.path !== undefined && finding.message.includes(finding.path),
    );
    assert(finding.remedy.length > 0);
  }
  const structural = checkChart({ ...overBudget, kind: "unknown" });
  assertEquals(structural.findings.map(({ code }) => code), [
    "chart/unknown-kind",
  ]);
  const error = assertThrows(
    () => renderChartSvg(overBudget as never),
    ChartBudgetError,
  );
  assertEquals(error.dimension, "titleGraphemes");
});

Deno.test("every chart kind's release refusal and corpus case check as Metadata says", () => {
  for (const entry of chartKindRegistry) {
    const refusal = entry.releaseCorpus.overBudget;
    const result = checkChart(refusal.spec);
    assertEquals(result.ok, false, `${entry.meta.slug} refusal checks clean`);
    assert(
      result.findings.some((finding) =>
        finding.facts.dimension === refusal.dimension &&
        finding.facts.authorAction === refusal.authorAction
      ),
      `${entry.meta.slug} refusal is missing ${refusal.dimension}`,
    );
    for (const releaseCase of entry.releaseCorpus.cases) {
      assertEquals(
        checkChart(releaseCase.spec),
        { ok: true, findings: [] },
        `${entry.meta.slug} ${releaseCase.name}`,
      );
    }
  }
});
