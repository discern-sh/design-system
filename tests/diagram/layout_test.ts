import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertThrows,
} from "@std/assert";
import { conformDiagramScene } from "../../src/diagram/conformance.ts";
import { DiagramConformanceError } from "../../src/diagram/errors.ts";
import {
  diagramRectBottom,
  diagramRectRight,
  diagramRectUnion,
} from "../../src/diagram/geometry.ts";
import type {
  DiagramConnector,
  DiagramPoint,
  DiagramRect,
  DiagramScene,
  DiagramShape,
  DiagramText,
} from "../../src/diagram/scene.ts";
import { layoutDiagram } from "../../src/generated/diagram-dispatch.ts";
import fixtures from "../../src/diagram/kinds/flow/flow.fixtures.ts";
import type { FlowDiagramSpec } from "../../src/diagram/kinds/flow/flow.spec.ts";

const EPSILON = 0.02;

function overlap(left: DiagramRect, right: DiagramRect): boolean {
  return left.x < diagramRectRight(right) &&
    diagramRectRight(left) > right.x &&
    left.y < diagramRectBottom(right) &&
    diagramRectBottom(left) > right.y;
}

function contains(outer: DiagramRect, inner: DiagramRect): boolean {
  return inner.x >= outer.x - EPSILON && inner.y >= outer.y - EPSILON &&
    diagramRectRight(inner) <= diagramRectRight(outer) + EPSILON &&
    diagramRectBottom(inner) <= diagramRectBottom(outer) + EPSILON;
}

function cardinalBoundary(point: DiagramPoint, bounds: DiagramRect): boolean {
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  return (Math.abs(point.x - centerX) <= EPSILON &&
    (Math.abs(point.y - bounds.y) <= EPSILON ||
      Math.abs(point.y - diagramRectBottom(bounds)) <= EPSILON)) ||
    (Math.abs(point.y - centerY) <= EPSILON &&
      (Math.abs(point.x - bounds.x) <= EPSILON ||
        Math.abs(point.x - diagramRectRight(bounds)) <= EPSILON));
}

function segments(connector: DiagramConnector): readonly (
  readonly [DiagramPoint, DiagramPoint]
)[] {
  return connector.points.slice(1).map((end, index) =>
    [
      connector.points[index] as DiagramPoint,
      end,
    ] as const
  );
}

function segmentCrossesRect(
  start: DiagramPoint,
  end: DiagramPoint,
  rect: DiagramRect,
): boolean {
  if (Math.abs(start.x - end.x) <= EPSILON) {
    return start.x > rect.x && start.x < diagramRectRight(rect) &&
      Math.max(start.y, end.y) > rect.y &&
      Math.min(start.y, end.y) < diagramRectBottom(rect);
  }
  assert(Math.abs(start.y - end.y) <= EPSILON, "connector is not orthogonal");
  return start.y > rect.y && start.y < diagramRectBottom(rect) &&
    Math.max(start.x, end.x) > rect.x &&
    Math.min(start.x, end.x) < diagramRectRight(rect);
}

function assertDeepFrozen(value: unknown, visited = new Set<object>()): void {
  if (typeof value !== "object" || value === null || visited.has(value)) return;
  visited.add(value);
  assert(Object.isFrozen(value));
  for (const child of Object.values(value)) assertDeepFrozen(child, visited);
}

function assertStablePrecision(value: unknown): void {
  if (typeof value === "number") {
    assert(Number.isFinite(value));
    assert(Math.abs(Math.round(value * 100) - value * 100) < 1e-7);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const child of Object.values(value)) assertStablePrecision(child);
}

function assertIndependentSceneInvariants(scene: DiagramScene): void {
  const shapes = scene.elements.filter((element): element is DiagramShape =>
    element.kind === "shape"
  );
  const texts = scene.elements.filter((element): element is DiagramText =>
    element.kind === "text"
  );
  const connectors = scene.elements.filter((
    element,
  ): element is DiagramConnector => element.kind === "connector");
  for (const element of scene.elements) {
    assert(element.bounds.width > 0 && element.bounds.height > 0);
    assert(contains(scene.canvas.bounds, element.bounds));
  }
  for (let left = 0; left < shapes.length; left += 1) {
    for (let right = left + 1; right < shapes.length; right += 1) {
      assert(
        !overlap(
          (shapes[left] as DiagramShape).bounds,
          (shapes[right] as DiagramShape).bounds,
        ),
      );
    }
  }
  for (const connector of connectors) {
    const source = shapes.find((shape) =>
      shape.semanticId === connector.sourceId
    );
    const target = shapes.find((shape) =>
      shape.semanticId === connector.targetId
    );
    assert(source !== undefined && target !== undefined);
    assert(
      cardinalBoundary(connector.points[0] as DiagramPoint, source.bounds),
    );
    assert(cardinalBoundary(connector.arrowhead.tip, target.bounds));
    for (const [start, end] of segments(connector)) {
      for (const shape of shapes) {
        if (shape === source || shape === target) continue;
        assert(!segmentCrossesRect(start, end, shape.bounds));
      }
      for (const text of texts) {
        assert(!segmentCrossesRect(start, end, text.bounds));
      }
    }
  }
  const content = diagramRectUnion(
    scene.elements.map((element) => element.bounds),
  );
  assertEquals(content.x, scene.canvas.padding);
  assertEquals(content.y, scene.canvas.padding);
  assertEquals(
    scene.canvas.bounds.width,
    content.width + scene.canvas.padding * 2,
  );
  assertEquals(
    scene.canvas.bounds.height,
    content.height + scene.canvas.padding * 2,
  );
  assertDeepFrozen(scene);
  assertStablePrecision(scene);
}

Deno.test("representative top-to-bottom flow independently satisfies scene invariants", () => {
  const scene = layoutDiagram(fixtures[0]);
  assertIndependentSceneInvariants(scene);
  const returnConnector = scene.elements.find((element) =>
    element.kind === "connector" && element.style === "return"
  );
  assert(returnConnector?.kind === "connector");
  const nodeLeft = Math.min(
    ...scene.elements.filter((element) => element.kind === "shape").map((
      element,
    ) => element.bounds.x),
  );
  assert(
    Math.min(...returnConnector.points.map((point) => point.x)) < nodeLeft,
  );
});

Deno.test("left-to-right flow uses the same deterministic semantic scene", () => {
  const scene = layoutDiagram(fixtures[1]);
  assertIndependentSceneInvariants(scene);
  const shapes = scene.elements.filter((element): element is DiagramShape =>
    element.kind === "shape"
  );
  const author = shapes.find((shape) => shape.semanticId === "author");
  const publish = shapes.find((shape) => shape.semanticId === "publish");
  assert(author !== undefined && publish !== undefined);
  assert(author.bounds.x < publish.bounds.x);
});

Deno.test("equal input produces byte-equal scenes across repeated runs", () => {
  const expected = JSON.stringify(layoutDiagram(fixtures[0]));
  for (let run = 0; run < 25; run += 1) {
    assertEquals(
      JSON.stringify(layoutDiagram(structuredClone(fixtures[0]))),
      expected,
    );
  }
});

Deno.test("Latin, wide-script, combining, and mono annotations wrap conservatively", () => {
  const cases = [
    {
      label: "Review evidence before accepting change",
      annotation: "check --evidence recorded-and-current",
    },
    {
      label: "準備された変更内容を確認して承認する",
      annotation: "監査ログを確認する",
    },
    {
      label: "Cafe\u0301 evidence remains attached",
      annotation: "result=cafe\u0301-reviewed",
    },
  ] as const;
  for (const [index, value] of cases.entries()) {
    const spec = {
      kind: "flow",
      title: `Wrapping case ${index}`,
      summary:
        "Conservative text bounds remain independent of browser measurement.",
      nodes: [
        {
          id: "start",
          label: value.label,
          annotation: value.annotation,
          role: "start",
        },
        { id: "end", label: "Finish", role: "end" },
      ],
      edges: [{ id: "next", from: "start", to: "end" }],
    } as const satisfies FlowDiagramSpec;
    const scene = layoutDiagram(spec);
    assertIndependentSceneInvariants(scene);
    const primary = scene.elements.find((element) =>
      element.kind === "text" && element.id === "node-start-label"
    );
    const annotation = scene.elements.find((element) =>
      element.kind === "text" && element.id === "node-start-annotation"
    );
    assert(
      primary?.kind === "text" && primary.lines.length >= 1 &&
        primary.lines.length <= 3,
    );
    assert(annotation?.kind === "text" && annotation.fontRole === "mono");
  }
});

Deno.test("impossible wrapped labels refuse with the authored label-line budget", () => {
  const error = assertThrows(() =>
    layoutDiagram({
      ...fixtures[1],
      nodes: [
        {
          ...fixtures[1].nodes[0],
          label: "x".repeat(72),
        },
        ...fixtures[1].nodes.slice(1),
      ],
    })
  );
  assertEquals(
    (error as { readonly code?: string }).code,
    "diagram/budget/nodeLabelLines",
  );
  assertEquals(
    (error as { readonly authorAction?: string }).authorAction,
    "shorten-label",
  );
});

Deno.test("shared conformance rejects a connector detached from its source", () => {
  const scene = structuredClone(layoutDiagram(fixtures[1])) as DiagramScene;
  const connector = scene.elements.find((element) =>
    element.kind === "connector"
  );
  assert(connector?.kind === "connector");
  const mutable = connector as unknown as {
    points: DiagramPoint[];
  };
  const first = mutable.points[0];
  assert(first !== undefined);
  mutable.points[0] = { x: first.x + 12, y: first.y };
  const error = assertThrows(() => conformDiagramScene(scene));
  assertInstanceOf(error, DiagramConformanceError);
  assertEquals(error.code, "diagram/conformance");
});

Deno.test("shared conformance rejects orphaned scene members", () => {
  const scene = structuredClone(layoutDiagram(fixtures[1])) as DiagramScene;
  const group = scene.groups.find((candidate) =>
    candidate.id.startsWith("node-")
  );
  assert(group !== undefined);
  const mutable = group as unknown as { children: string[] };
  mutable.children = mutable.children.slice(1);
  const error = assertThrows(() => conformDiagramScene(scene));
  assertInstanceOf(error, DiagramConformanceError);
  assert(error.message.includes("reachable exactly once"));
});
