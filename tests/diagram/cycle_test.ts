import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertThrows,
} from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";
import { conformDiagramScene } from "../../src/diagram/conformance.ts";
import {
  DiagramBudgetError,
  DiagramValidationError,
} from "../../src/diagram/errors.ts";
import {
  diagramRectBottom,
  diagramRectRight,
  diagramRectsOverlap,
  expandDiagramRect,
} from "../../src/diagram/geometry.ts";
import type {
  DiagramConnector,
  DiagramPoint,
  DiagramRect,
  DiagramScene,
  DiagramShape,
  DiagramText,
} from "../../src/diagram/scene.ts";
import projectCycleDiagramCli from "../../src/diagram/kinds/cycle/cycle.cli.ts";
import describeCycleDiagram from "../../src/diagram/kinds/cycle/cycle.description.ts";
import fixtures from "../../src/diagram/kinds/cycle/cycle.fixtures.ts";
import layoutCycleDiagram from "../../src/diagram/kinds/cycle/cycle.layout.ts";
import type {
  CycleDiagramSpec,
  ValidatedCycleDiagram,
} from "../../src/diagram/kinds/cycle/cycle.spec.ts";
import validateCycleDiagram from "../../src/diagram/kinds/cycle/cycle.validation.ts";

const EPSILON = 0.02;

const minimum = {
  kind: "cycle",
  title: "Repeat a learning practice",
  summary: "Three ordered stages form the smallest coherent repeating loop.",
  stages: [
    { id: "notice", label: "Notice evidence" },
    { id: "adjust", label: "Choose an adjustment" },
    { id: "learn", label: "Learn from the result" },
  ],
} as const satisfies CycleDiagramSpec;

const longLabel = {
  kind: "cycle",
  title: "Keep long wording legible",
  summary:
    "Conservative wrapping keeps stage and relationship wording inside the documented envelope.",
  stages: [
    {
      id: "gather",
      label: "Gather observations from the completed review",
      annotation: "Preserve authored source order",
    },
    {
      id: "compare",
      label: "Compare evidence against the shared baseline",
      annotation: "Record material differences",
    },
    {
      id: "adapt",
      label: "Adapt one focused part of the practice",
    },
  ],
  hub: { id: "baseline", label: "Shared evidence baseline" },
  spokes: [
    {
      id: "new-evidence",
      stageId: "gather",
      direction: "to-hub",
      label: "Newly observed evidence",
    },
  ],
} as const satisfies CycleDiagramSpec;

const denseSupported = fixtures[2];

function scene(spec: CycleDiagramSpec): DiagramScene {
  return conformDiagramScene(layoutCycleDiagram(validateCycleDiagram(spec)));
}

function center(rect: DiagramRect): DiagramPoint {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

function segments(connector: DiagramConnector): readonly (
  readonly [DiagramPoint, DiagramPoint]
)[] {
  return connector.points.slice(1).map((end, index) =>
    [connector.points[index] as DiagramPoint, end] as const
  );
}

function segmentIntersectsRect(
  start: DiagramPoint,
  end: DiagramPoint,
  rect: DiagramRect,
): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  let entry = 0;
  let exit = 1;
  const boundaries = [
    [-dx, start.x - rect.x],
    [dx, diagramRectRight(rect) - start.x],
    [-dy, start.y - rect.y],
    [dy, diagramRectBottom(rect) - start.y],
  ] as const;
  for (const [direction, distance] of boundaries) {
    if (Math.abs(direction) <= EPSILON) {
      if (distance < -EPSILON) return false;
      continue;
    }
    const ratio = distance / direction;
    if (direction < 0) entry = Math.max(entry, ratio);
    else exit = Math.min(exit, ratio);
    if (entry > exit + EPSILON) return false;
  }
  return true;
}

function projection(
  spec: ValidatedCycleDiagram,
  capabilities: TerminalCapabilities,
) {
  return projectCycleDiagramCli(spec, {
    capabilities,
    maxWidth: capabilities.columns,
    theme: "light",
    description: describeCycleDiagram(spec),
  });
}

Deno.test("cycle validation preserves authored order and freezes normalized facts", () => {
  const validated = validateCycleDiagram(fixtures[1]);
  assertEquals(
    validated.stages.map((stage) => stage.id),
    ["collect", "compare", "decide", "evaluate"],
  );
  assertEquals(
    validated.spokes.map((spoke) => [spoke.id, spoke.direction]),
    [
      ["observations", "to-hub"],
      ["context", "from-hub"],
      ["decision", "to-hub"],
      ["baseline", "from-hub"],
    ],
  );
  assert(Object.isFrozen(validated));
  assert(Object.isFrozen(validated.stages));
  assert(Object.isFrozen(validated.spokes));
});

Deno.test("cycle description is exact, lossless, and states repetition", () => {
  assertEquals(
    describeCycleDiagram(validateCycleDiagram(fixtures[1])),
    `Title: Maintain shared understanding
Summary: Each stage exchanges one named fact with a shared record before the cycle repeats.
Repeats: yes; after the final stage, the sequence returns to stage 1.
Stages in repeating order:
1. collect: Collect observations
   Annotation: Keep source order
2. compare: Compare evidence
   Annotation: Name disagreements
3. decide: Choose one adjustment
4. evaluate: Evaluate the outcome
Hub: record: Shared record
Hub annotation: Current evidence
Hub relationships:
1. observations: collect to record; label: New observations
2. context: record to compare; label: Prior context
3. decision: decide to record; label: Chosen adjustment
4. baseline: record to evaluate; label: Expected outcome
`,
  );
  assertEquals(
    describeCycleDiagram(validateCycleDiagram(minimum)).split("\n").slice(-3),
    ["Hub relationships:", "None.", ""],
  );
});

Deno.test("minimum, representative, long-label, and dense cycles conform", () => {
  for (const spec of [minimum, ...fixtures, longLabel]) {
    const first = scene(spec);
    assertEquals(first.sourceKind, "cycle");
    assert(first.canvas.bounds.width > 0 && first.canvas.bounds.height > 0);
    assertEquals(
      JSON.stringify(scene(structuredClone(spec))),
      JSON.stringify(first),
    );
  }
});

Deno.test("cycle stages keep clockwise authored order and upright text", () => {
  const result = scene(fixtures[1]);
  const shapes = result.elements.filter((element): element is DiagramShape =>
    element.kind === "shape"
  );
  const hub = shapes.find((shape) => shape.semanticId === "record");
  assert(hub !== undefined);
  const hubCenter = center(hub.bounds);
  const angles = ["collect", "compare", "decide", "evaluate"].map((id) => {
    const shape = shapes.find((candidate) => candidate.semanticId === id);
    assert(shape !== undefined);
    const point = center(shape.bounds);
    return Math.atan2(point.y - hubCenter.y, point.x - hubCenter.x);
  });
  assert(Math.abs((angles[0] as number) + Math.PI / 2) < EPSILON);
  assert((angles[1] as number) > (angles[0] as number));
  assert((angles[2] as number) > (angles[1] as number));
  // atan2 wraps the final left-hand stage; its position still follows the
  // authored clockwise quarter-turn from the preceding stage.
  assert(Math.abs((angles[3] as number) - Math.PI) < EPSILON);

  const stageTexts = result.elements.filter((element): element is DiagramText =>
    element.kind === "text" && element.id.startsWith("stage-")
  );
  assert(stageTexts.length >= 4);
  for (const text of stageTexts) {
    assert(!("rotation" in text));
    for (let index = 1; index < text.lines.length; index += 1) {
      assert(
        (text.lines[index]?.baseline ?? 0) >
          (text.lines[index - 1]?.baseline ?? 0),
      );
    }
  }
});

Deno.test("outer arrows follow the clockwise tangent and close one loop", () => {
  const result = scene(fixtures[1]);
  const shapes = result.elements.filter((element): element is DiagramShape =>
    element.kind === "shape"
  );
  const hub = shapes.find((shape) => shape.semanticId === "record");
  assert(hub !== undefined);
  const hubCenter = center(hub.bounds);
  const loop = result.elements.filter((element): element is DiagramConnector =>
    element.kind === "connector" &&
    element.semanticId.startsWith("cycle-order-")
  );
  assertEquals(
    loop.map((connector) => [connector.sourceId, connector.targetId]),
    [
      ["collect", "compare"],
      ["compare", "decide"],
      ["decide", "evaluate"],
      ["evaluate", "collect"],
    ],
  );
  for (const connector of loop) {
    assertEquals(connector.routing, "polyline");
    const target = shapes.find((shape) =>
      shape.semanticId === connector.targetId
    );
    assert(target !== undefined);
    const targetCenter = center(target.bounds);
    const angle = Math.atan2(
      targetCenter.y - hubCenter.y,
      targetCenter.x - hubCenter.x,
    );
    const tangent = { x: -Math.sin(angle), y: Math.cos(angle) };
    const base = connector.points.at(-1) as DiagramPoint;
    const arrow = {
      x: connector.arrowhead.tip.x - base.x,
      y: connector.arrowhead.tip.y - base.y,
    };
    const dot = (arrow.x * tangent.x + arrow.y * tangent.y) /
      Math.hypot(arrow.x, arrow.y);
    assert(dot > 0.99, `${connector.semanticId} arrow is not tangent-forward`);
  }
});

Deno.test("hub spokes stay inside the ring with clear labels and distinct ports", () => {
  const result = scene(denseSupported);
  const shapes = result.elements.filter((element): element is DiagramShape =>
    element.kind === "shape"
  );
  const texts = result.elements.filter((element): element is DiagramText =>
    element.kind === "text"
  );
  const connectors = result.elements.filter((
    element,
  ): element is DiagramConnector => element.kind === "connector");
  const hub = shapes.find((shape) => shape.semanticId === "shared");
  assert(hub !== undefined && hub.style === "focus");
  const spokeLabels = texts.filter((text) => text.id.startsWith("spoke-"));
  assertEquals(spokeLabels.length, 8);
  for (const label of spokeLabels) {
    for (const shape of shapes) {
      assert(!diagramRectsOverlap(label.bounds, shape.bounds, 4));
    }
  }
  for (let left = 0; left < spokeLabels.length; left += 1) {
    for (let right = left + 1; right < spokeLabels.length; right += 1) {
      assert(
        !diagramRectsOverlap(
          (spokeLabels[left] as DiagramText).bounds,
          (spokeLabels[right] as DiagramText).bounds,
          4,
        ),
      );
    }
  }
  const outer = connectors.filter((connector) =>
    connector.semanticId.startsWith("cycle-order-")
  );
  for (const connector of outer) {
    assert(
      segments(connector).every(([start, end]) =>
        !segmentIntersectsRect(start, end, hub.bounds)
      ),
    );
  }
  for (const connector of connectors) {
    for (const label of texts) {
      assert(
        segments(connector).every(([start, end]) =>
          !segmentIntersectsRect(start, end, expandDiagramRect(label.bounds, 4))
        ),
      );
    }
  }
  const ports = connectors.flatMap((connector) => [
    `${connector.sourceId}:${connector.points[0]?.x},${connector.points[0]?.y}`,
    `${connector.targetId}:${connector.arrowhead.tip.x},${connector.arrowhead.tip.y}`,
  ]);
  assertEquals(new Set(ports).size, ports.length);
});

Deno.test("cycle validation rejects incoherent identities, references, and spokes", () => {
  const tooShort = assertThrows(() =>
    validateCycleDiagram({ ...minimum, stages: minimum.stages.slice(0, 2) })
  );
  assertInstanceOf(tooShort, DiagramValidationError);
  assert(tooShort.message.includes("at least three"));

  const noHub = assertThrows(() =>
    validateCycleDiagram({
      ...minimum,
      spokes: [{
        id: "signal",
        stageId: "notice",
        direction: "to-hub",
        label: "Signal",
      }],
    })
  );
  assertEquals(
    (noHub as DiagramValidationError).code,
    "diagram/dangling-reference",
  );

  const dangling = assertThrows(() =>
    validateCycleDiagram({
      ...minimum,
      hub: { id: "shared", label: "Shared context" },
      spokes: [{
        id: "signal",
        stageId: "missing",
        direction: "to-hub",
        label: "Signal",
      }],
    })
  );
  assertEquals(
    (dangling as DiagramValidationError).code,
    "diagram/dangling-reference",
  );

  const duplicate = assertThrows(() =>
    validateCycleDiagram({
      ...minimum,
      hub: { id: "notice", label: "Duplicate identity" },
    })
  );
  assertEquals(
    (duplicate as DiagramValidationError).code,
    "diagram/duplicate-id",
  );

  const parallel = assertThrows(() =>
    validateCycleDiagram({
      ...minimum,
      hub: { id: "shared", label: "Shared context" },
      spokes: [
        {
          id: "first",
          stageId: "notice",
          direction: "to-hub",
          label: "First fact",
        },
        {
          id: "second",
          stageId: "notice",
          direction: "from-hub",
          label: "Second fact",
        },
      ],
    })
  );
  assert((parallel as Error).message.includes("second hub relationship"));
});

Deno.test("cycle budgets name the exceeded dimension and author action", () => {
  const tooMany = assertThrows(() =>
    validateCycleDiagram({
      ...minimum,
      stages: Array.from({ length: 9 }, (_, index) => ({
        id: `stage-${index + 1}`,
        label: `Stage ${index + 1}`,
      })),
    })
  );
  assertInstanceOf(tooMany, DiagramBudgetError);
  assertEquals(tooMany.dimension, "stages");
  assertEquals(tooMany.authorAction, "split-overview");
  assert(tooMany.message.includes("received 9"));

  const wrapped = assertThrows(() =>
    scene({
      ...minimum,
      stages: [
        { id: "notice", label: "x".repeat(56) },
        ...minimum.stages.slice(1),
      ],
    })
  );
  assertInstanceOf(wrapped, DiagramBudgetError);
  assertEquals(wrapped.dimension, "stageLabelLines");
  assertEquals(wrapped.authorAction, "shorten-label");
});

const NARROW_UNICODE_FRAME =
  `┌ Review the evidence loop ──────────────────────────────┐
│ Summary: A small learning practice repeats             │
│ observation, interpretation, action, and review.       │
│ Repeats: after the final stage, return to stage 1.     │
│                                                        │
│ Stages in repeating order                              │
│ ▸ 1. observe: Observe evidence                         │
│ ▸ 2. interpret: Interpret patterns                     │
│ ▸ 3. act: Try a focused change                         │
│ ▸ 4. review: Review the result                         │
│                                                        │
│ Shared hub                                             │
│ Hub: none                                              │
│                                                        │
│ Hub relationships                                      │
│ none                                                   │
└──────────── 4 stages · 0 hub relationships ────────────┘`;

const STANDARD_ASCII_FRAME =
  `+ Review the evidence loop --------------------------------------------+
| Summary: A small learning practice repeats observation,              |
| interpretation, action, and review.                                  |
| Repeats: after the final stage, return to stage 1.                   |
|                                                                      |
| Stages in repeating order                                            |
| > 1. observe: Observe evidence                                       |
| > 2. interpret: Interpret patterns                                   |
| > 3. act: Try a focused change                                       |
| > 4. review: Review the result                                       |
|                                                                      |
| Shared hub                                                           |
| Hub: none                                                            |
|                                                                      |
| Hub relationships                                                    |
| none                                                                 |
+------------------- 4 stages | 0 hub relationships -------------------+`;

const WIDE_UNICODE_FRAME =
  `┌ Review the evidence loop ────────────────────────────────────────────────────────────────────────┐
│ Summary: A small learning practice repeats observation, interpretation, action, and review.      │
│ Repeats: after the final stage, return to stage 1.                                               │
│                                                                                                  │
│ Stages in repeating order                                                                        │
│ ▸ 1. observe: Observe evidence                                                                   │
│ ▸ 2. interpret: Interpret patterns                                                               │
│ ▸ 3. act: Try a focused change                                                                   │
│ ▸ 4. review: Review the result                                                                   │
│                                                                                                  │
│ Shared hub                                                                                       │
│ Hub: none                                                                                        │
│                                                                                                  │
│ Hub relationships                                                                                │
│ none                                                                                             │
└───────────────────────────────── 4 stages · 0 hub relationships ─────────────────────────────────┘`;

Deno.test("cycle enhanced CLI has exact narrow, standard ASCII, and wide frames", () => {
  const validated = validateCycleDiagram(fixtures[0]);
  const cases = [
    [
      testTerminalCapabilities({ columns: 58, unicode: true }),
      NARROW_UNICODE_FRAME,
    ],
    [
      testTerminalCapabilities({ columns: 72, unicode: false }),
      STANDARD_ASCII_FRAME,
    ],
    [
      testTerminalCapabilities({ columns: 100, unicode: true }),
      WIDE_UNICODE_FRAME,
    ],
  ] as const;
  for (const [capabilities, expected] of cases) {
    const result = projection(validated, capabilities);
    assertEquals(result.kind, "frame");
    if (result.kind === "frame") assertEquals(result.frame, expected);
  }
});

Deno.test("cycle enhanced CLI preserves exact facts with colour and no colour", () => {
  const validated = validateCycleDiagram(fixtures[0]);
  for (const unicode of [true, false]) {
    const plainCapabilities = testTerminalCapabilities({
      colorDepth: "none",
      columns: 72,
      unicode,
    });
    const colorCapabilities = testTerminalCapabilities({
      colorDepth: "ansi16",
      columns: 72,
      unicode,
    });
    const plain = projection(validated, plainCapabilities);
    const colored = projection(validated, colorCapabilities);
    assert(plain.kind === "frame" && colored.kind === "frame");
    assert(colored.frame.includes("\u001b["));
    assertEquals(stripAnsi(colored.frame), plain.frame);
  }
});

Deno.test("cycle enhanced CLI declines with typed, factual reasons", () => {
  const validated = validateCycleDiagram(fixtures[0]);
  assertEquals(
    projection(
      validated,
      testTerminalCapabilities({ columns: 57, unicode: true }),
    ),
    { kind: "declined", code: "width", fact: 57, limit: 58 },
  );
  const dense = validateCycleDiagram(denseSupported);
  assertEquals(
    projection(
      dense,
      testTerminalCapabilities({ columns: 100, unicode: true }),
    ),
    { kind: "declined", code: "stage-count", fact: 8, limit: 6 },
  );
});
