import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertThrows,
} from "@std/assert";
import { conformDiagramScene } from "../../src/diagram/conformance.ts";
import { DiagramConformanceError } from "../../src/diagram/errors.ts";
import {
  DIAGRAM_GEOMETRY,
  diagramPointBounds,
  diagramRectBottom,
  diagramRectRight,
  diagramRectUnion,
  roundDiagramNumber,
} from "../../src/diagram/geometry.ts";
import {
  createDiagramConnector,
  createDiagramGuide,
  translateDiagramElement,
} from "../../src/diagram/layout-authority.ts";
import type {
  DiagramConnector,
  DiagramPoint,
  DiagramRect,
  DiagramRegion,
  DiagramScene,
  DiagramShape,
  DiagramText,
} from "../../src/diagram/scene.ts";
import { layoutDiagram } from "../../src/generated/diagram-dispatch.ts";
import fixtures from "../../src/diagram/kinds/flow/flow.fixtures.ts";
import type { FlowDiagramSpec } from "../../src/diagram/kinds/flow/flow.spec.ts";

const EPSILON = 0.02;

Deno.test("diagram geometry shares symmetric decimal tie rounding", () => {
  assertEquals(roundDiagramNumber(1.005), 1.01);
  assertEquals(roundDiagramNumber(-1.005), -1.01);
  assertEquals(roundDiagramNumber(66.245), 66.25);
  assertEquals(roundDiagramNumber(-66.245), -66.25);
});

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

function shapeBoundary(point: DiagramPoint, shape: DiagramShape): boolean {
  const { bounds } = shape;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  if (shape.shape === "diamond") {
    return Math.abs(
      Math.abs(point.x - centerX) / (bounds.width / 2) +
        Math.abs(point.y - centerY) / (bounds.height / 2) - 1,
    ) <= EPSILON;
  }
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

function positiveSegmentOverlap(
  left: readonly [DiagramPoint, DiagramPoint],
  right: readonly [DiagramPoint, DiagramPoint],
): boolean {
  const [leftStart, leftEnd] = left;
  const [rightStart, rightEnd] = right;
  if (
    Math.abs(leftStart.x - leftEnd.x) <= EPSILON &&
    Math.abs(rightStart.x - rightEnd.x) <= EPSILON &&
    Math.abs(leftStart.x - rightStart.x) <= EPSILON
  ) {
    return Math.min(
          Math.max(leftStart.y, leftEnd.y),
          Math.max(rightStart.y, rightEnd.y),
        ) - Math.max(
          Math.min(leftStart.y, leftEnd.y),
          Math.min(rightStart.y, rightEnd.y),
        ) > EPSILON;
  }
  if (
    Math.abs(leftStart.y - leftEnd.y) <= EPSILON &&
    Math.abs(rightStart.y - rightEnd.y) <= EPSILON &&
    Math.abs(leftStart.y - rightStart.y) <= EPSILON
  ) {
    return Math.min(
          Math.max(leftStart.x, leftEnd.x),
          Math.max(rightStart.x, rightEnd.x),
        ) - Math.max(
          Math.min(leftStart.x, leftEnd.x),
          Math.min(rightStart.x, rightEnd.x),
        ) > EPSILON;
  }
  return false;
}

function repeatedPorts(connectors: readonly DiagramConnector[]): string[] {
  const ports = connectors.flatMap((connector) => [
    {
      node: connector.sourceId,
      relationship: connector.semanticId,
      point: connector.points[0] as DiagramPoint,
    },
    {
      node: connector.targetId,
      relationship: connector.semanticId,
      point: connector.arrowhead.tip,
    },
  ]);
  const repeated: string[] = [];
  for (let left = 0; left < ports.length; left += 1) {
    for (let right = left + 1; right < ports.length; right += 1) {
      const a = ports[left];
      const b = ports[right];
      if (
        a !== undefined && b !== undefined && a.node === b.node &&
        Math.abs(a.point.x - b.point.x) <= EPSILON &&
        Math.abs(a.point.y - b.point.y) <= EPSILON
      ) {
        repeated.push(`${a.node}: ${a.relationship}/${b.relationship}`);
      }
    }
  }
  return repeated;
}

function overlappingRuns(connectors: readonly DiagramConnector[]): string[] {
  const overlaps: string[] = [];
  for (let left = 0; left < connectors.length; left += 1) {
    for (let right = left + 1; right < connectors.length; right += 1) {
      const a = connectors[left];
      const b = connectors[right];
      if (
        a !== undefined && b !== undefined &&
        segments(a).some((leftSegment) =>
          segments(b).some((rightSegment) =>
            positiveSegmentOverlap(leftSegment, rightSegment)
          )
        )
      ) overlaps.push(`${a.semanticId}/${b.semanticId}`);
    }
  }
  return overlaps;
}

function syntheticShape(
  semanticId: string,
  x: number,
  y: number,
): DiagramShape {
  return {
    kind: "shape",
    id: `${semanticId}-shape`,
    semanticId,
    shape: "rounded-rectangle",
    style: "ordinary",
    bounds: { x, y, width: 40, height: 40 },
    radius: 0,
  };
}

function syntheticConnector(
  semanticId: string,
  sourceId: string,
  targetId: string,
  pathWithTip: readonly DiagramPoint[],
): DiagramConnector {
  const tip = pathWithTip.at(-1) as DiagramPoint;
  const beforeTip = pathWithTip.at(-2) as DiagramPoint;
  assertEquals(tip.y, beforeTip.y);
  const base = { x: tip.x - 10, y: tip.y };
  const points = [...pathWithTip.slice(0, -1), base];
  const arrowhead = {
    tip,
    left: { x: base.x, y: base.y + 5 },
    right: { x: base.x, y: base.y - 5 },
    bounds: diagramPointBounds([
      tip,
      { x: base.x, y: base.y + 5 },
      { x: base.x, y: base.y - 5 },
    ]),
  };
  return {
    kind: "connector",
    id: `${semanticId}-connector`,
    semanticId,
    sourceId,
    targetId,
    style: "primary",
    routing: "orthogonal",
    lineWidth: 2,
    points,
    arrowhead,
    bounds: diagramRectUnion([
      diagramPointBounds(points, 1),
      arrowhead.bounds,
    ]),
  };
}

function syntheticScene(
  elements: DiagramScene["elements"],
): DiagramScene {
  const padding = DIAGRAM_GEOMETRY.canvasPadding;
  const content = diagramRectUnion(elements.map((element) => element.bounds));
  return {
    kind: "diagram-scene",
    sourceKind: "synthetic",
    canvas: {
      bounds: {
        x: content.x - padding,
        y: content.y - padding,
        width: content.width + padding * 2,
        height: content.height + padding * 2,
      },
      role: "canvas",
      padding,
    },
    root: elements.map((element) => element.id),
    groups: [],
    elements,
  };
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
      shapeBoundary(connector.points[0] as DiagramPoint, source),
    );
    assert(shapeBoundary(connector.arrowhead.tip, target));
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

Deno.test("flow relationships keep distinct ports and non-overlapping runs", () => {
  const unrelatedBranch = {
    kind: "flow",
    title: "Choose a reference route",
    summary: "A neutral decision sends one source to either destination.",
    nodes: [
      { id: "origin", label: "Begin", role: "start" },
      { id: "choice", label: "Choose route", role: "decision" },
      { id: "alpha", label: "First destination", role: "end" },
      { id: "omega", label: "Second destination", role: "end" },
    ],
    edges: [
      { id: "enter", from: "origin", to: "choice" },
      { id: "first", from: "choice", to: "alpha", label: "First route" },
      { id: "second", from: "choice", to: "omega", label: "Second route" },
    ],
  } as const satisfies FlowDiagramSpec;
  for (const spec of [fixtures[0], unrelatedBranch]) {
    const connectors = layoutDiagram(spec).elements.filter((
      element,
    ): element is DiagramConnector => element.kind === "connector");
    assertEquals(repeatedPorts(connectors), []);
    assertEquals(overlappingRuns(connectors), []);
  }
});

Deno.test("shared conformance rejects a reused semantic node port", () => {
  const scene = syntheticScene([
    syntheticShape("junction", 20, 80),
    syntheticShape("north", 220, 20),
    syntheticShape("south", 220, 140),
    syntheticConnector(
      "upper-route",
      "junction",
      "north",
      [
        { x: 60, y: 100 },
        { x: 100, y: 100 },
        { x: 100, y: 40 },
        { x: 220, y: 40 },
      ],
    ),
    syntheticConnector(
      "lower-route",
      "junction",
      "south",
      [
        { x: 60, y: 100 },
        { x: 60, y: 160 },
        { x: 220, y: 160 },
      ],
    ),
  ]);
  const error = assertThrows(() => conformDiagramScene(scene));
  assertInstanceOf(error, DiagramConformanceError);
  assert(error.message.includes("port"));
});

Deno.test("shared conformance rejects overlapping relationship runs", () => {
  const scene = syntheticScene([
    syntheticShape("northwest", 20, 20),
    syntheticShape("northeast", 220, 20),
    syntheticShape("southwest", 20, 120),
    syntheticShape("southeast", 220, 120),
    syntheticConnector(
      "upper-passage",
      "northwest",
      "northeast",
      [
        { x: 60, y: 40 },
        { x: 100, y: 40 },
        { x: 100, y: 80 },
        { x: 180, y: 80 },
        { x: 180, y: 40 },
        { x: 220, y: 40 },
      ],
    ),
    syntheticConnector(
      "lower-passage",
      "southwest",
      "southeast",
      [
        { x: 60, y: 140 },
        { x: 100, y: 140 },
        { x: 100, y: 80 },
        { x: 180, y: 80 },
        { x: 180, y: 140 },
        { x: 220, y: 140 },
      ],
    ),
  ]);
  const error = assertThrows(() => conformDiagramScene(scene));
  assertInstanceOf(error, DiagramConformanceError);
  assert(error.message.includes("overlap"));
});

Deno.test("shared conformance rejects inverted or detached arrow geometry", () => {
  const scene = structuredClone(layoutDiagram(fixtures[1])) as DiagramScene;
  const connector = scene.elements.find((element) =>
    element.kind === "connector"
  );
  assert(connector?.kind === "connector");
  const tip = connector.arrowhead.tip;
  const mutable = connector as unknown as {
    bounds: DiagramRect;
    arrowhead: {
      left: DiagramPoint;
      right: DiagramPoint;
      bounds: DiagramRect;
    };
  };
  mutable.arrowhead.left = { x: tip.x + 10, y: tip.y - 5 };
  mutable.arrowhead.right = { x: tip.x + 10, y: tip.y + 5 };
  mutable.arrowhead.bounds = diagramPointBounds([
    tip,
    mutable.arrowhead.left,
    mutable.arrowhead.right,
  ]);
  mutable.bounds = diagramRectUnion([
    diagramPointBounds(connector.points, connector.lineWidth / 2),
    mutable.arrowhead.bounds,
  ]);
  assertThrows(
    () => conformDiagramScene(scene),
    DiagramConformanceError,
    "arrowhead",
  );
});

Deno.test("shared conformance rejects connector re-entry through endpoint fill", () => {
  const source = syntheticShape("source", 20, 20);
  const target = syntheticShape("target", 220, 20);
  const connector = syntheticConnector(
    "route",
    "source",
    "target",
    [
      { x: 60, y: 40 },
      { x: 100, y: 40 },
      { x: 100, y: 30 },
      { x: 40, y: 30 },
      { x: 40, y: 80 },
      { x: 180, y: 80 },
      { x: 180, y: 40 },
      { x: 220, y: 40 },
    ],
  );
  assertThrows(
    () => conformDiagramScene(syntheticScene([source, target, connector])),
    DiagramConformanceError,
    "source fill",
  );
});

Deno.test("shared conformance rejects zero-length connector runs", () => {
  const scene = structuredClone(layoutDiagram(fixtures[1])) as DiagramScene;
  const connector = scene.elements.find((element) =>
    element.kind === "connector"
  );
  assert(connector?.kind === "connector");
  const mutable = connector as unknown as {
    points: DiagramPoint[];
    bounds: DiagramRect;
  };
  mutable.points.splice(1, 0, { ...mutable.points[0] as DiagramPoint });
  mutable.bounds = diagramRectUnion([
    diagramPointBounds(mutable.points, connector.lineWidth / 2),
    connector.arrowhead.bounds,
  ]);
  assertThrows(
    () => conformDiagramScene(scene),
    DiagramConformanceError,
    "zero-length run",
  );
});

Deno.test("shared conformance rejects same-owner and free-text collisions", () => {
  const scene = structuredClone(layoutDiagram(fixtures[0])) as DiagramScene;
  const label = scene.elements.find((element) =>
    element.kind === "text" && element.id === "node-revise-label"
  );
  const annotation = scene.elements.find((element) =>
    element.kind === "text" && element.id === "node-revise-annotation"
  );
  assert(label?.kind === "text" && annotation?.kind === "text");
  const text = annotation as unknown as {
    bounds: DiagramRect;
    lines: Array<{ text: string; x: number; baseline: number; width: number }>;
  };
  const dx = label.bounds.x + label.bounds.width / 2 -
    (annotation.bounds.x + annotation.bounds.width / 2);
  const dy = label.bounds.y - annotation.bounds.y;
  text.bounds = {
    ...annotation.bounds,
    x: annotation.bounds.x + dx,
    y: annotation.bounds.y + dy,
  };
  text.lines = annotation.lines.map((line) => ({
    ...line,
    x: line.x + dx,
    baseline: line.baseline + dy,
  }));
  assertThrows(
    () => conformDiagramScene(scene),
    DiagramConformanceError,
    "collides",
  );

  const freeScene = syntheticScene([
    syntheticShape("unrelated", 20, 20),
    {
      kind: "text",
      id: "relationship-label",
      ownerId: "route",
      placement: "free",
      role: "connector-label",
      fontRole: "interface",
      fontSize: 13,
      lineHeight: 17,
      bounds: { x: 25, y: 25, width: 20, height: 17 },
      lines: [{ text: "Route", x: 25, baseline: 38, width: 20 }],
    },
    syntheticShape("source", 20, 100),
    syntheticShape("target", 220, 100),
    syntheticConnector("route", "source", "target", [
      { x: 60, y: 120 },
      { x: 220, y: 120 },
    ]),
  ]);
  assertThrows(
    () => conformDiagramScene(freeScene),
    DiagramConformanceError,
    "overlaps unrelated node",
  );
});

Deno.test("shared conformance enforces the canonical minimum canvas padding", () => {
  const scene = structuredClone(layoutDiagram(fixtures[1])) as DiagramScene;
  const shift = scene.canvas.padding - 1;
  const mutable = scene as unknown as {
    canvas: { padding: number; bounds: DiagramRect };
    elements: DiagramScene["elements"];
  };
  const canvas = mutable.canvas;
  canvas.padding = 1;
  canvas.bounds = {
    x: 0,
    y: 0,
    width: canvas.bounds.width - shift * 2,
    height: canvas.bounds.height - shift * 2,
  };
  mutable.elements = scene.elements.map((element) =>
    translateDiagramElement(element, -shift, -shift)
  );
  assertThrows(
    () => conformDiagramScene(scene),
    DiagramConformanceError,
    "padding",
  );
});

Deno.test("shared regions, guides, and explicit polyline routing conform together", () => {
  const source = createDiagramGuide({
    id: "source-guide",
    semanticId: "source-lifeline",
    style: "dashed",
    points: [{ x: 20, y: 20 }, { x: 20, y: 100 }],
  });
  const target = createDiagramGuide({
    id: "target-guide",
    semanticId: "target-lifeline",
    points: [{ x: 180, y: 20 }, { x: 180, y: 100 }],
  });
  const boundary: DiagramRegion = {
    kind: "region",
    id: "shared-boundary",
    semanticId: "shared-boundary",
    style: "boundary",
    bounds: { x: 0, y: 0, width: 200, height: 120 },
    radius: 8,
    lineWidth: 2,
  };
  const connector = createDiagramConnector({
    id: "signal-connector",
    semanticId: "signal",
    sourceId: source.semanticId,
    targetId: target.semanticId,
    style: "secondary",
    routing: "polyline",
    pathWithTip: [
      { x: 20, y: 60 },
      { x: 100, y: 28 },
      { x: 180, y: 60 },
    ],
  });
  const scene = syntheticScene([boundary, source, target, connector]);
  assertEquals(conformDiagramScene(scene).sourceKind, "synthetic");

  const invalid = structuredClone(scene);
  const mutable = invalid.elements.find((element) =>
    element.kind === "connector"
  ) as DiagramConnector;
  Object.assign(mutable, { routing: "orthogonal" });
  assertThrows(
    () => conformDiagramScene(invalid),
    DiagramConformanceError,
    "contains a diagonal segment",
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
