import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertMatch,
  assertThrows,
} from "@std/assert";
import {
  describeDiagram,
  diagramAltText,
  DiagramBudgetError,
  DiagramValidationError,
  renderDiagramSvg,
} from "../../src/diagram/mod.ts";
import {
  layoutDiagram,
  validateDiagram,
} from "../../src/generated/diagram-dispatch.ts";
import { diagramKindCliRegistry } from "../../src/generated/diagram-cli-registry.ts";
import { diagramKindRegistry } from "../../src/generated/diagram-registry.ts";
import type { FlowDiagramSpec } from "../../src/diagram/kinds/flow/flow.spec.ts";

const minimal = Object.freeze(
  {
    kind: "flow",
    title: "Publish a change",
    summary: "A checked change progresses from draft to publication.",
    nodes: Object.freeze([
      Object.freeze({ id: "draft", label: "Draft change", role: "start" }),
      Object.freeze({ id: "publish", label: "Publish change", role: "end" }),
    ]),
    edges: Object.freeze([
      Object.freeze({ id: "ready", from: "draft", to: "publish" }),
    ]),
  } as const satisfies FlowDiagramSpec,
);

function mutableMinimal(): Record<string, unknown> {
  return structuredClone(minimal) as unknown as Record<string, unknown>;
}

function expectDiagramError(
  action: () => unknown,
  code: string,
): DiagramValidationError {
  const error = assertThrows(action);
  assertInstanceOf(error, DiagramValidationError);
  assertEquals(error.code, code);
  assert(error.remedy.length > 0);
  return error;
}

Deno.test("diagram accessibility validates once and derives one concise alternative", () => {
  assertEquals(
    diagramAltText(minimal),
    "Publish a change: A checked change progresses from draft to publication.",
  );
  const validated = validateDiagram(minimal);
  assertEquals(validated.kind, "flow");
  assertEquals(layoutDiagram(minimal).sourceKind, "flow");
});

Deno.test("generated registry fixtures and terminal stances remain executable", () => {
  assert(diagramKindRegistry.length > 0);
  for (const entry of diagramKindRegistry) {
    assert(entry.meta.useWhen.length > 0 && entry.meta.notWhen.length > 0);
    assert(Object.keys(entry.meta.budgets).length > 0);
    assertEquals(
      diagramKindCliRegistry[
        entry.meta.slug as keyof typeof diagramKindCliRegistry
      ]
        ?.stance,
      entry.meta.cli.stance,
    );
    assert(entry.fixtures.length > 0);
    for (const fixture of entry.fixtures) {
      assertEquals(layoutDiagram(fixture).sourceKind, entry.meta.slug);
      assert(describeDiagram(fixture).includes(`Title: ${fixture.title}`));
    }
  }
});

Deno.test("flow description preserves accessible context, ordered entities, and relationships", () => {
  const spec = {
    kind: "flow",
    title: "Review evidence",
    summary: "Evidence is accepted or revised and reviewed again.",
    nodes: [
      { id: "submit", label: "Submit evidence", role: "start" },
      {
        id: "review",
        label: "Review evidence",
        annotation: "Compare against the recorded bar",
        role: "decision",
      },
      { id: "revise", label: "Revise evidence" },
      { id: "accept", label: "Accept evidence", role: "end" },
    ],
    edges: [
      { id: "arrival", from: "submit", to: "review" },
      {
        id: "yes",
        from: "review",
        to: "accept",
        label: "Meets the bar",
      },
      {
        id: "no",
        from: "review",
        to: "revise",
        label: "Needs work",
        emphasis: "secondary",
      },
      {
        id: "again",
        from: "revise",
        to: "review",
        label: "Review again",
        emphasis: "return",
      },
    ],
  } as const satisfies FlowDiagramSpec;
  const description = describeDiagram(spec);
  for (
    const fact of [
      "Title: Review evidence",
      "Summary: Evidence is accepted or revised and reviewed again.",
      "decision review: Review evidence",
      "Annotation: Compare against the recorded bar",
      "primary progression yes: review to accept; label: Meets the bar",
      "secondary progression no: review to revise; label: Needs work",
      "return again: revise to review; label: Review again",
    ]
  ) {
    assert(description.includes(fact), `missing description fact: ${fact}`);
  }
  assert(!description.includes("→"));
  assert(description.endsWith("\n"));
});

Deno.test("flow validation rejects unknown, non-data, and extra renderer fields", () => {
  expectDiagramError(
    () => validateDiagram({ ...minimal, kind: "other" }),
    "diagram/unknown-kind",
  );
  expectDiagramError(
    () => validateDiagram({ kind: "flow", title: "x" }),
    "diagram/invalid-text",
  );
  expectDiagramError(
    () => validateDiagram({ ...minimal, svg: "<path/>" }),
    "diagram/invalid-spec",
  );
  expectDiagramError(
    () => validateDiagram({ ...minimal, render: () => "no" }),
    "diagram/invalid-spec",
  );
  expectDiagramError(
    () => validateDiagram({ ...minimal, createdAt: new Date(0) }),
    "diagram/invalid-spec",
  );
  const cyclic = mutableMinimal();
  cyclic.self = cyclic;
  expectDiagramError(() => validateDiagram(cyclic), "diagram/invalid-spec");

  const symbolKeyed = mutableMinimal();
  Object.defineProperty(symbolKeyed, Symbol("hidden"), { value: "hidden" });
  expectDiagramError(
    () => validateDiagram(symbolKeyed),
    "diagram/invalid-spec",
  );

  const accessor = mutableMinimal();
  Object.defineProperty(accessor, "summary", {
    enumerable: true,
    get: () => "Accessor text",
  });
  expectDiagramError(() => validateDiagram(accessor), "diagram/invalid-spec");

  const customArray = mutableMinimal();
  const customNodes = customArray.nodes as unknown[] & { extra?: string };
  customNodes.extra = "hidden from JSON";
  expectDiagramError(
    () => validateDiagram(customArray),
    "diagram/invalid-spec",
  );
});

Deno.test("flow validation rejects empty, control-bearing, and normalization-hostile text", () => {
  for (
    const label of [
      "",
      " edge",
      "edge  label",
      "edge\nlabel",
      "edge\u200blabel",
      "edge\u00a0label",
      "edge\ud800label",
    ]
  ) {
    const spec = mutableMinimal();
    const nodes = spec.nodes as Array<Record<string, unknown>>;
    const first = nodes[0];
    assert(first !== undefined);
    first.label = label;
    expectDiagramError(() => validateDiagram(spec), "diagram/invalid-text");
  }
  const visibleMarkup = {
    ...minimal,
    nodes: [
      { id: "draft", label: "Compare <before> and <after>", role: "start" },
      minimal.nodes[1],
    ],
  } as const;
  assertEquals(validateDiagram(visibleMarkup).kind, "flow");
});

Deno.test("every public diagram preflight contains hostile kind containers", () => {
  const getter = Object.defineProperty({}, "kind", {
    enumerable: true,
    get(): never {
      throw new Error("ambient getter escaped");
    },
  });
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();

  for (const hostile of [getter, revoked.proxy]) {
    for (
      const projection of [
        () => validateDiagram(hostile),
        () => layoutDiagram(hostile),
        () => describeDiagram(hostile),
        () => diagramAltText(hostile as FlowDiagramSpec),
        () => renderDiagramSvg(hostile as FlowDiagramSpec),
      ]
    ) {
      expectDiagramError(projection, "diagram/invalid-spec");
    }
  }
});

Deno.test("diagram text rejects every Unicode format-control class", () => {
  for (const character of ["\u{13430}", "\u{1BCA0}"]) {
    const spec = mutableMinimal();
    const nodes = spec.nodes as Record<string, unknown>[];
    const first = nodes[0];
    assert(first !== undefined);
    first.label = `Draft${character}change`;
    const error = expectDiagramError(
      () => validateDiagram(spec),
      "diagram/invalid-text",
    );
    assertEquals(error.path, "spec.nodes[0].label");
  }
});

Deno.test("flow validation rejects duplicate and dangling identities", () => {
  expectDiagramError(
    () =>
      validateDiagram({
        ...minimal,
        nodes: [minimal.nodes[0], { ...minimal.nodes[1], id: "draft" }],
      }),
    "diagram/duplicate-id",
  );
  expectDiagramError(
    () =>
      validateDiagram({
        ...minimal,
        edges: [{ ...minimal.edges[0], to: "missing" }],
      }),
    "diagram/dangling-reference",
  );
  expectDiagramError(
    () =>
      validateDiagram({
        ...minimal,
        edges: [{ ...minimal.edges[0], id: "draft" }],
      }),
    "diagram/duplicate-id",
  );
  expectDiagramError(
    () =>
      validateDiagram({
        ...minimal,
        edges: [
          minimal.edges[0],
          { id: "also-ready", from: "draft", to: "publish" },
        ],
      }),
    "diagram/invalid-spec",
  );
});

Deno.test("flow validation proves connectivity, acyclic main flow, and role semantics", () => {
  expectDiagramError(
    () =>
      validateDiagram({
        ...minimal,
        nodes: [...minimal.nodes, {
          id: "island",
          label: "Island",
          role: "end",
        }],
      }),
    "diagram/disconnected-graph",
  );
  expectDiagramError(
    () =>
      validateDiagram({
        ...minimal,
        edges: [
          minimal.edges[0],
          { id: "back", from: "publish", to: "draft" },
        ],
      }),
    "diagram/primary-cycle",
  );
  expectDiagramError(
    () =>
      validateDiagram({
        ...minimal,
        nodes: [{ ...minimal.nodes[0], role: "step" }, minimal.nodes[1]],
      }),
    "diagram/invalid-flow-role",
  );
  expectDiagramError(
    () =>
      validateDiagram({
        ...minimal,
        nodes: [
          minimal.nodes[0],
          { id: "check", label: "Check change" },
          minimal.nodes[1],
        ],
        edges: [
          { id: "check-edge", from: "draft", to: "check" },
          { id: "publish-edge", from: "check", to: "publish" },
          {
            id: "forward-return",
            from: "draft",
            to: "publish",
            emphasis: "return",
          },
        ],
      }),
    "diagram/invalid-return-edge",
  );
});

Deno.test("decisions require labelled main-flow branches", () => {
  const branch = {
    ...minimal,
    nodes: [
      { id: "start", label: "Start", role: "start" },
      { id: "choose", label: "Choose path", role: "decision" },
      { id: "left", label: "Left finish", role: "end" },
      { id: "right", label: "Right finish", role: "end" },
    ],
    edges: [
      { id: "enter", from: "start", to: "choose" },
      { id: "left-edge", from: "choose", to: "left", label: "Left" },
      { id: "right-edge", from: "choose", to: "right" },
    ],
  };
  expectDiagramError(
    () => validateDiagram(branch),
    "diagram/invalid-flow-role",
  );
});

Deno.test("budget refusals expose stable facts and one practical author action", () => {
  const tooLong = "x".repeat(73);
  const error = expectDiagramError(
    () =>
      validateDiagram({
        ...minimal,
        nodes: [{ ...minimal.nodes[0], label: tooLong }, minimal.nodes[1]],
      }),
    "diagram/budget/nodeLabelGraphemes",
  );
  assertInstanceOf(error, DiagramBudgetError);
  assertEquals(error.facts.limit, 72);
  assertEquals(error.facts.actual, 73);
  assertEquals(error.facts.authorAction, "shorten-label");
  assertMatch(error.message, /Shorten the named label/u);

  const nodes = Array.from({ length: 16 }, (_, index) => ({
    id: `node-${index}`,
    label: `Node ${index}`,
    role: index === 0 ? "start" : index === 15 ? "end" : "step",
  }));
  const population = expectDiagramError(
    () => validateDiagram({ ...minimal, nodes }),
    "diagram/budget/nodes",
  );
  assertEquals(population.facts.authorAction, "split-overview");

  const deepNodes = Array.from({ length: 10 }, (_, index) => ({
    id: `tier-${index}`,
    label: `Tier ${index}`,
    role: index === 0 ? "start" : index === 9 ? "end" : "step",
  }));
  const deepEdges = Array.from({ length: 9 }, (_, index) => ({
    id: `advance-${index}`,
    from: `tier-${index}`,
    to: `tier-${index + 1}`,
  }));
  const depth = expectDiagramError(
    () => validateDiagram({ ...minimal, nodes: deepNodes, edges: deepEdges }),
    "diagram/budget/rankDepth",
  );
  assertEquals(depth.facts.authorAction, "reduce-tier");

  const wide = expectDiagramError(
    () =>
      validateDiagram({
        ...minimal,
        nodes: [
          { id: "start", label: "Start", role: "start" },
          { id: "choose", label: "Choose", role: "decision" },
          ...Array.from({ length: 5 }, (_, index) => ({
            id: `finish-${index}`,
            label: `Finish ${index}`,
            role: "end",
          })),
        ],
        edges: [
          { id: "enter", from: "start", to: "choose" },
          ...Array.from({ length: 5 }, (_, index) => ({
            id: `branch-${index}`,
            from: "choose",
            to: `finish-${index}`,
            label: `Branch ${index}`,
          })),
        ],
      }),
    "diagram/budget/rankWidth",
  );
  assertEquals(wide.facts.authorAction, "split-overview");

  const edgePopulation = expectDiagramError(
    () =>
      validateDiagram({
        ...minimal,
        edges: Array.from({ length: 25 }, (_, index) => ({
          id: `edge-${index}`,
          from: "draft",
          to: "publish",
        })),
      }),
    "diagram/budget/edges",
  );
  assertEquals(edgePopulation.facts.limit, 24);
});

Deno.test("the exact label budget remains valid and deterministic", () => {
  const label = "x".repeat(72);
  const spec = {
    ...minimal,
    nodes: [{ ...minimal.nodes[0], label }, minimal.nodes[1]],
  } as const;
  assertEquals(validateDiagram(spec).kind, "flow");
  assertEquals(describeDiagram(spec), describeDiagram(structuredClone(spec)));
});
