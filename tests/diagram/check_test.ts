import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  checkDiagram,
  DiagramBudgetError,
  renderDiagramSvg,
} from "../../src/diagram/mod.ts";
import { diagramKindRegistry } from "../../src/generated/diagram-registry.ts";
import type { FlowDiagramSpec } from "../../src/diagram/kinds/flow/flow.spec.ts";

const valid = {
  kind: "flow",
  title: "Publish a change",
  summary: "A checked change progresses from draft to publication.",
  nodes: [
    { id: "draft", label: "Draft change", role: "start" },
    { id: "publish", label: "Publish change", role: "end" },
  ],
  edges: [{ id: "ready", from: "draft", to: "publish" }],
} as const satisfies FlowDiagramSpec;

const overBudget: FlowDiagramSpec = {
  ...valid,
  summary: "s".repeat(241),
  nodes: [
    {
      id: "draft",
      label: "x".repeat(73),
      annotation: "one two three four five six seven eight nine ten eleven",
      role: "start",
    },
    {
      id: "publish",
      label: "Publish change",
      annotation: "twelve thirteen fourteen fifteen sixteen seventeen eighteen",
      role: "end",
    },
  ],
};

Deno.test("checkDiagram reports nothing for a valid spec", () => {
  assertEquals(checkDiagram(valid), { ok: true, findings: [] });
});

Deno.test("checkDiagram reports every budget refusal with its path and remedy", () => {
  const result = checkDiagram(overBudget);
  assertEquals(result.ok, false);
  assertEquals(
    result.findings.map(({ code, path }) => `${code} ${path}`),
    [
      "diagram/budget/summaryGraphemes spec.summary",
      "diagram/budget/nodeLabelGraphemes spec.nodes[0].label",
      "diagram/budget/nodeLabelLines node draft label",
      "diagram/budget/annotationLines node draft annotation",
      "diagram/budget/annotationLines node publish annotation",
    ],
  );
  for (const finding of result.findings) {
    assert(finding.remedy.length > 0);
    assert(
      finding.path !== undefined && finding.message.includes(finding.path),
      `${finding.message} names ${finding.path}`,
    );
    assertEquals(finding.facts.authorAction, "shorten-label");
  }
});

Deno.test("checkDiagram ends at a structural refusal and reports it last", () => {
  const result = checkDiagram({
    ...overBudget,
    edges: [{ id: "ready", from: "draft", to: "missing" }],
  });
  assertEquals(result.ok, false);
  const last = result.findings.at(-1);
  assertEquals(last?.code, "diagram/dangling-reference");
  assertEquals(last?.path, "spec.edges[0]");
  assertEquals(
    result.findings.slice(0, -1).map(({ code }) => code),
    [
      "diagram/budget/summaryGraphemes",
      "diagram/budget/nodeLabelGraphemes",
    ],
  );
});

Deno.test("rendering still refuses at the first budget when nothing collects", () => {
  const error = assertThrows(
    () => renderDiagramSvg(overBudget),
    DiagramBudgetError,
  );
  assertEquals(error.dimension, "summaryGraphemes");
});

Deno.test("every kind's release refusal and corpus case check as Metadata says", () => {
  for (const entry of diagramKindRegistry) {
    const refusal = entry.releaseCorpus.overBudget;
    const result = checkDiagram(refusal.spec);
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
        checkDiagram(releaseCase.spec),
        { ok: true, findings: [] },
        `${entry.meta.slug} ${releaseCase.name}`,
      );
    }
  }
});
