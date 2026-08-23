import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertThrows,
} from "@std/assert";
import { conformDiagramScene } from "../../src/diagram/conformance.ts";
import {
  DiagramBudgetError,
  DiagramValidationError,
} from "../../src/diagram/errors.ts";
import {
  diagramRectBottom,
  diagramRectContains,
  diagramRectRight,
  diagramRectsOverlap,
} from "../../src/diagram/geometry.ts";
import type {
  DiagramConnector,
  DiagramRegion,
  DiagramScene,
  DiagramShape,
  DiagramText,
} from "../../src/diagram/scene.ts";
import describeArchitectureDiagram from "../../src/diagram/kinds/architecture/architecture.description.ts";
import fixtures from "../../src/diagram/kinds/architecture/architecture.fixtures.ts";
import layoutArchitectureDiagram from "../../src/diagram/kinds/architecture/architecture.layout.ts";
import meta from "../../src/diagram/kinds/architecture/architecture.meta.ts";
import type { ArchitectureDiagramSpec } from "../../src/diagram/kinds/architecture/architecture.spec.ts";
import validateArchitectureDiagram from "../../src/diagram/kinds/architecture/architecture.validation.ts";

const minimum = {
  kind: "architecture",
  title: "Transfer a reference",
  summary: "One external source transfers a reference to a service.",
  nodes: [
    { id: "source", label: "Source system", role: "external" },
    { id: "sink", label: "Reference service", role: "service" },
  ],
  relationships: [
    {
      id: "transfer",
      from: "source",
      to: "sink",
      label: "Transfer reference",
    },
  ],
} as const satisfies ArchitectureDiagramSpec;

function prepare(spec: ArchitectureDiagramSpec): DiagramScene {
  return conformDiagramScene(
    layoutArchitectureDiagram(validateArchitectureDiagram(spec)),
  );
}

function elementsOfKind<Kind extends DiagramScene["elements"][number]["kind"]>(
  scene: DiagramScene,
  kind: Kind,
): readonly Extract<DiagramScene["elements"][number], { kind: Kind }>[] {
  return scene.elements.filter((element) =>
    element.kind === kind
  ) as unknown as readonly Extract<
    DiagramScene["elements"][number],
    { kind: Kind }
  >[];
}

function assertFiniteAndInBounds(scene: DiagramScene): void {
  const inspect = (value: unknown): void => {
    if (typeof value === "number") assert(Number.isFinite(value));
    else if (typeof value === "object" && value !== null) {
      Object.values(value).forEach(inspect);
    }
  };
  inspect(scene);
  for (const element of scene.elements) {
    assert(diagramRectContains(scene.canvas.bounds, element.bounds));
  }
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

Deno.test("architecture Metadata fixes a bounded description-first grammar", () => {
  assertEquals(meta.slug, "architecture");
  assertEquals(meta.order, 20);
  assertEquals(meta.cli, { stance: "description" });
  assert(meta.useWhen.some((guidance) => guidance.includes("Mapping")));
  assert(meta.notWhen.some((guidance) => guidance.includes("Nested")));
  assertEquals(meta.budgets.groups?.remedy, "split-group");
});

Deno.test("architecture minimum has exact lossless plain-text description", () => {
  const validated = validateArchitectureDiagram(minimum);
  assertEquals(
    describeArchitectureDiagram(validated),
    `Title: Transfer a reference
Summary: One external source transfers a reference to a service.
Direction: left to right
Boundaries:
None.
Uncontained nodes: source, sink
Nodes:
1. external source: Source system
   Boundary: uncontained
2. service sink: Reference service
   Boundary: uncontained
Relationships:
1. primary relationship transfer: source to sink; label: Transfer reference
`,
  );
  assert(!describeArchitectureDiagram(validated).includes("→"));
});

Deno.test("architecture representative boundary contains every declared member", () => {
  const spec = fixtures[0];
  const scene = prepare(spec);
  assertFiniteAndInBounds(scene);
  const region = elementsOfKind(scene, "region").find((candidate) =>
    candidate.semanticId === "managed-system"
  );
  assert(region !== undefined);
  for (const member of ["gateway", "worker", "records"]) {
    const shape = elementsOfKind(scene, "shape").find((candidate) =>
      candidate.semanticId === member
    );
    assert(shape !== undefined);
    assert(diagramRectContains(region.bounds, shape.bounds, 16));
  }
  const boundaryGroup = scene.groups.find((group) =>
    group.id === "architecture-boundary-managed-system-group"
  );
  assertEquals(boundaryGroup?.children, [
    "architecture-boundary-managed-system-region",
    "architecture-boundary-managed-system-label",
    "architecture-node-gateway-group",
    "architecture-node-worker-group",
    "architecture-node-records-group",
  ]);
});

Deno.test("architecture focal and relationship emphasis survive without colour", () => {
  const scene = prepare(fixtures[0]);
  const focal = elementsOfKind(scene, "shape").find((shape) =>
    shape.semanticId === "gateway"
  );
  assertEquals(focal?.style, "focus");
  const roleText = elementsOfKind(scene, "text").find((text) =>
    text.ownerId === "gateway" && text.role === "quiet-annotation"
  );
  assert(roleText?.lines.some((line) => line.text.includes("Role: Focal")));
  const styles = Object.fromEntries(
    elementsOfKind(scene, "connector").map((connector) => [
      connector.semanticId,
      connector.style,
    ]),
  );
  assertEquals(styles.submit, "primary");
  assertEquals(styles.persist, "secondary");
  assertEquals(styles.outcome, "return");
  assert(
    describeArchitectureDiagram(validateArchitectureDiagram(fixtures[0]))
      .includes(
        "return relationship outcome: worker to gateway; label: Return outcome",
      ),
  );
});

Deno.test("architecture directions preserve authored order on their primary axis", () => {
  for (const spec of fixtures) {
    const scene = prepare(spec);
    const shapes = spec.nodes.map((node) =>
      elementsOfKind(scene, "shape").find((shape) =>
        shape.semanticId === node.id
      ) as DiagramShape
    );
    const positions = shapes.map((shape) =>
      spec.direction === "top-to-bottom"
        ? shape.bounds.y + shape.bounds.height / 2
        : shape.bounds.x + shape.bounds.width / 2
    );
    assertEquals(
      positions,
      [...positions].toSorted((left, right) => left - right),
    );
  }
});

Deno.test("architecture routing is deterministic, local, orthogonal, and conformant", () => {
  const first = prepare(fixtures[0]);
  const second = prepare(fixtures[0]);
  assertEquals(JSON.stringify(first), JSON.stringify(second));
  const shapes = elementsOfKind(first, "shape");
  const structuralBottom = Math.max(
    ...shapes.map((shape) => diagramRectBottom(shape.bounds)),
    ...elementsOfKind(first, "region").map((region) =>
      diagramRectBottom(region.bounds)
    ),
  );
  const connectors = elementsOfKind(first, "connector");
  assert(connectors.every((connector) => connector.routing === "orthogonal"));
  const returnConnector = connectors.find((connector) =>
    connector.semanticId === "outcome"
  );
  assert(returnConnector !== undefined);
  assert(returnConnector.points.some((point) => point.y > structuralBottom));
  for (const connector of connectors) {
    connector.points.slice(1).forEach((end, index) => {
      const start = connector.points[index];
      assert(start !== undefined);
      assert(start.x === end.x || start.y === end.y);
    });
  }
  const nodeShapes = elementsOfKind(first, "shape");
  nodeShapes.forEach((left, leftIndex) =>
    nodeShapes.slice(leftIndex + 1).forEach((rightShape) =>
      assert(!diagramRectsOverlap(left.bounds, rightShape.bounds))
    )
  );
});

Deno.test("architecture keeps adjacent forward relationships in the primary gap", () => {
  const futureSibling = {
    kind: "architecture",
    title: "Pass a bounded signal",
    summary: "Unrelated same-boundary peers pass one signal in authored order.",
    direction: "top-to-bottom",
    nodes: [
      { id: "origin", label: "Origin peer", role: "service" },
      { id: "destination", label: "Destination peer", role: "store" },
    ],
    groups: [{
      id: "scope",
      label: "Shared scope",
      members: ["origin", "destination"],
    }],
    relationships: [{
      id: "signal",
      from: "origin",
      to: "destination",
      label: "Pass signal",
    }],
  } as const satisfies ArchitectureDiagramSpec;

  for (const spec of [...fixtures, futureSibling]) {
    const scene = prepare(spec);
    const shapes = elementsOfKind(scene, "shape");
    const connectors = elementsOfKind(scene, "connector");
    const labels = elementsOfKind(scene, "text").filter((text) =>
      text.role === "connector-label"
    );
    for (const relationship of spec.relationships) {
      const groups = "groups" in spec ? spec.groups : [];
      const sourceIndex = spec.nodes.findIndex((node) =>
        node.id === relationship.from
      );
      const targetIndex = spec.nodes.findIndex((node) =>
        node.id === relationship.to
      );
      const sourceLane = groups.find((group) =>
        group.members.some((member: string) =>
          member === relationship.from
        )
      )?.id ?? "architecture:uncontained";
      const targetLane = groups.find((group) =>
        group.members.some((member: string) => member === relationship.to)
      )?.id ?? "architecture:uncontained";
      if (
        ("emphasis" in relationship && relationship.emphasis === "return") ||
        targetIndex !== sourceIndex + 1 ||
        (spec.direction === "top-to-bottom" && sourceLane !== targetLane)
      ) continue;
      const source = shapes.find((shape) =>
        shape.semanticId === relationship.from
      );
      const target = shapes.find((shape) =>
        shape.semanticId === relationship.to
      );
      const connector = connectors.find((candidate) =>
        candidate.semanticId === relationship.id
      );
      const label = labels.find((candidate) =>
        candidate.ownerId === relationship.id
      );
      assert(source !== undefined);
      assert(target !== undefined);
      assert(connector !== undefined);
      assert(label !== undefined);
      assert(connector.points.length <= 4);

      if (spec.direction === "top-to-bottom") {
        const gapStart = diagramRectBottom(source.bounds);
        const gapEnd = target.bounds.y;
        assert(gapStart < gapEnd);
        assert(
          connector.bounds.y >= gapStart - connector.lineWidth / 2 - 0.01,
        );
        assert(
          diagramRectBottom(connector.bounds) <=
            gapEnd + connector.lineWidth / 2 + 0.01,
        );
        assert(label.bounds.y >= gapStart);
        assert(diagramRectBottom(label.bounds) <= gapEnd);
        assert(
          Math.abs(
            label.bounds.y + label.bounds.height / 2 -
              (gapStart + gapEnd) / 2,
          ) <= 0.01,
        );
        const sourceCenterX = source.bounds.x + source.bounds.width / 2;
        const targetCenterX = target.bounds.x + target.bounds.width / 2;
        if (Math.abs(sourceCenterX - targetCenterX) <= 0.01) {
          assertEquals(connector.points.length, 2);
          assert(label.bounds.x > sourceCenterX);
        }
      } else {
        const gapStart = diagramRectRight(source.bounds);
        const gapEnd = target.bounds.x;
        assert(gapStart < gapEnd);
        assert(
          connector.bounds.x >= gapStart - connector.lineWidth / 2 - 0.01,
        );
        assert(
          diagramRectRight(connector.bounds) <=
            gapEnd + connector.lineWidth / 2 + 0.01,
        );
        assert(label.bounds.x >= gapStart);
        assert(diagramRectRight(label.bounds) <= gapEnd);
        assert(
          Math.abs(
            label.bounds.x + label.bounds.width / 2 -
              (gapStart + gapEnd) / 2,
          ) <= 0.01,
        );
      }
      assert(
        shapes.every((shape) =>
          !diagramRectsOverlap(label.bounds, shape.bounds, 4)
        ),
      );
    }
  }
});

Deno.test("architecture wraps long supported labels without clipping", () => {
  const spec = {
    kind: "architecture",
    title: "Route a carefully described reference",
    summary:
      "A compact topology keeps long but supported facts inside measured bounds.",
    nodes: [
      {
        id: "origin",
        label: "External source provides scoped payload",
        annotation: "Provides a stable input",
        role: "external",
      },
      {
        id: "processor",
        label: "Service checks supplied reference",
        annotation: "Owns the bounded contract",
        role: "focal",
      },
    ],
    groups: [{
      id: "processing-boundary",
      label: "Managed transform boundary",
      members: ["processor"],
    }],
    relationships: [{
      id: "provide-reference",
      from: "origin",
      to: "processor",
      label: "Provide scoped reference",
    }],
  } as const satisfies ArchitectureDiagramSpec;
  const scene = prepare(spec);
  assertFiniteAndInBounds(scene);
  assert(
    elementsOfKind(scene, "text").some((text) => text.lines.length > 1),
  );
  for (const text of elementsOfKind(scene, "text")) {
    assert(diagramRectContains(scene.canvas.bounds, text.bounds));
  }
});

Deno.test("architecture supports a dense bounded reference topology", () => {
  const spec = fixtures[2];
  const scene = prepare(spec);
  assertFiniteAndInBounds(scene);
  assertEquals(elementsOfKind(scene, "shape").length, 8);
  assertEquals(elementsOfKind(scene, "connector").length, 7);
  assert(scene.canvas.bounds.width <= meta.budgets.sceneExtent!.limit);
  assert(scene.canvas.bounds.height <= meta.budgets.sceneExtent!.limit);
});

Deno.test("architecture rejects ambiguous, nested, cyclic, and dangling references", () => {
  expectDiagramError(
    () =>
      validateArchitectureDiagram({
        ...minimum,
        groups: [
          { id: "first", label: "First", members: ["source"] },
          { id: "second", label: "Second", members: ["source"] },
        ],
      }),
    "diagram/invalid-spec",
  );
  const cycle = expectDiagramError(
    () =>
      validateArchitectureDiagram({
        ...minimum,
        groups: [
          { id: "first", label: "First", members: ["second"] },
          { id: "second", label: "Second", members: ["first"] },
        ],
      }),
    "diagram/invalid-spec",
  );
  assert(cycle.message.includes("group cycles"));
  expectDiagramError(
    () =>
      validateArchitectureDiagram({
        ...minimum,
        groups: [{ id: "owned", label: "Owned", members: ["missing"] }],
      }),
    "diagram/dangling-reference",
  );
  expectDiagramError(
    () =>
      validateArchitectureDiagram({
        ...minimum,
        relationships: [{
          ...minimum.relationships[0],
          to: "missing",
        }],
      }),
    "diagram/dangling-reference",
  );
  expectDiagramError(
    () =>
      validateArchitectureDiagram({
        ...minimum,
        groups: [{ id: "source", label: "Collision", members: ["sink"] }],
      }),
    "diagram/duplicate-id",
  );
});

Deno.test("architecture budget refusals name the dimension and decomposition", () => {
  const groups = Array.from({ length: 5 }, (_, index) => ({
    id: `group-${index}`,
    label: `Group ${index}`,
    members: [index === 0 ? "source" : "sink"],
  }));
  const groupError = expectDiagramError(
    () => validateArchitectureDiagram({ ...minimum, groups }),
    "diagram/budget/groups",
  );
  assertInstanceOf(groupError, DiagramBudgetError);
  assertEquals(groupError.facts.dimension, "groups");
  assertEquals(groupError.facts.authorAction, "split-group");
  assert(groupError.remedy.includes("Split the dense group"));

  const longLabel = expectDiagramError(
    () =>
      validateArchitectureDiagram({
        ...minimum,
        nodes: [
          { ...minimum.nodes[0], label: "x".repeat(65) },
          minimum.nodes[1],
        ],
      }),
    "diagram/budget/nodeLabelGraphemes",
  );
  assertEquals(longLabel.facts.authorAction, "shorten-label");
});

Deno.test("architecture scene facts stay deeply immutable after conformance", () => {
  const scene = prepare(minimum);
  const visited = new Set<object>();
  const inspect = (value: unknown): void => {
    if (typeof value !== "object" || value === null || visited.has(value)) {
      return;
    }
    visited.add(value);
    assert(Object.isFrozen(value));
    Object.values(value).forEach(inspect);
  };
  inspect(scene);
});

// Type-level aliases ensure the dedicated tests observe all scene fact kinds.
const _architectureSceneTypes: readonly [
  DiagramRegion?,
  DiagramConnector?,
  DiagramText?,
] = [];
void _architectureSceneTypes;
