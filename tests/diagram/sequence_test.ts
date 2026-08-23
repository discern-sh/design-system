import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertThrows,
} from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";
import { measureText } from "../../src/cli/text.ts";
import { conformDiagramScene } from "../../src/diagram/conformance.ts";
import {
  DiagramBudgetError,
  DiagramValidationError,
} from "../../src/diagram/errors.ts";
import {
  diagramRectBottom,
  diagramRectRight,
} from "../../src/diagram/geometry.ts";
import projectSequenceDiagramCli from "../../src/diagram/kinds/sequence/sequence.cli.ts";
import describeSequenceDiagram from "../../src/diagram/kinds/sequence/sequence.description.ts";
import fixtures from "../../src/diagram/kinds/sequence/sequence.fixtures.ts";
import layoutSequenceDiagram from "../../src/diagram/kinds/sequence/sequence.layout.ts";
import meta from "../../src/diagram/kinds/sequence/sequence.meta.ts";
import type {
  SequenceDiagramSpec,
  ValidatedSequenceDiagram,
} from "../../src/diagram/kinds/sequence/sequence.spec.ts";
import validateSequenceDiagram from "../../src/diagram/kinds/sequence/sequence.validation.ts";
import type {
  DiagramConnector,
  DiagramGuide,
  DiagramRect,
  DiagramScene,
  DiagramText,
} from "../../src/diagram/scene.ts";

const [representative, minimal, dense] = fixtures;

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

function prepare(
  spec: SequenceDiagramSpec = representative,
): ValidatedSequenceDiagram {
  return validateSequenceDiagram(spec);
}

function scene(spec: SequenceDiagramSpec = representative): DiagramScene {
  return conformDiagramScene(layoutSequenceDiagram(prepare(spec)));
}

function overlaps(left: DiagramRect, right: DiagramRect): boolean {
  return left.x < diagramRectRight(right) &&
    diagramRectRight(left) > right.x &&
    left.y < diagramRectBottom(right) &&
    diagramRectBottom(left) > right.y;
}

function project(
  spec: SequenceDiagramSpec,
  capabilities: TerminalCapabilities,
) {
  const validated = prepare(spec);
  return projectSequenceDiagramCli(validated, {
    capabilities,
    maxWidth: capabilities.columns,
    theme: "dark",
    description: describeSequenceDiagram(validated),
  });
}

const REPRESENTATIVE_DESCRIPTION = `Title: Coordinate a review
Summary: A requester delegates a check and receives the verified result.
Participants:
1. participant requester: Requester
   Annotation: Starts the exchange
2. participant coordinator: Coordinator
3. participant worker: Worker
   Annotation: Performs the check
Messages:
1. call submit: requester to coordinator; label: Submit request
2. signal dispatch: coordinator to worker; label: Dispatch check
3. self verify: worker to worker; label: Verify evidence
4. return result: worker to coordinator; label: Return result
5. return reply: coordinator to requester; label: Reply with outcome
Notes:
1. participant note worker-scope on worker: Uses the recorded review criteria
2. message note delivery on dispatch: Delivery may be deferred
`;

const STANDARD_UNICODE_FRAME =
  `┌ Coordinate a review ─────────────────────────────────────────────────────────────────┐
│ Summary: A requester delegates a check and receives the verified result.             │
│                                                                                      │
│ Participants                                                                         │
│ ▸ 1. participant requester: Requester                                                │
│   annotation: Starts the exchange                                                    │
│ ▸ 2. participant coordinator: Coordinator                                            │
│ ▸ 3. participant worker: Worker                                                      │
│   annotation: Performs the check                                                     │
│                                                                                      │
│ Messages in authored order                                                           │
│ 1. call submit: requester ──▸ coordinator — Submit request                           │
│ 2. signal dispatch: coordinator ┄┄▷ worker — Dispatch check                          │
│ 3. self verify: worker ↻▸ worker — Verify evidence                                   │
│ 4. return result: worker ┈┈▸ coordinator — Return result                             │
│ 5. return reply: coordinator ┈┈▸ requester — Reply with outcome                      │
│                                                                                      │
│ Notes                                                                                │
│ 1. participant note worker-scope on worker: Uses the recorded review criteria        │
│ 2. message note delivery on dispatch: Delivery may be deferred                       │
└──────────────────────────── 3 participants · 5 messages ─────────────────────────────┘`;

const WIDE_ASCII_FRAME =
  `+ Coordinate a review ---------------------------------------------------------------------------------+
| Summary: A requester delegates a check and receives the verified result.                             |
|                                                                                                      |
| Participants                                                                                         |
| > 1. participant requester: Requester                                                                |
|   annotation: Starts the exchange                                                                    |
| > 2. participant coordinator: Coordinator                                                            |
| > 3. participant worker: Worker                                                                      |
|   annotation: Performs the check                                                                     |
|                                                                                                      |
| Messages in authored order                                                                           |
| 1. call submit: requester --> coordinator - Submit request                                           |
| 2. signal dispatch: coordinator -.> worker - Dispatch check                                          |
| 3. self verify: worker [self]> worker - Verify evidence                                              |
| 4. return result: worker ~~> coordinator - Return result                                             |
| 5. return reply: coordinator ~~> requester - Reply with outcome                                      |
|                                                                                                      |
| Notes                                                                                                |
| 1. participant note worker-scope on worker: Uses the recorded review criteria                        |
| 2. message note delivery on dispatch: Delivery may be deferred                                       |
+------------------------------------ 3 participants | 5 messages -------------------------------------+`;

Deno.test("sequence anatomy validates and freezes generic fixtures", () => {
  assertEquals(meta.slug, "sequence");
  assertEquals(meta.order, 40);
  assertEquals(meta.cli.stance, "enhanced");
  assert(meta.useWhen.length > 0 && meta.notWhen.length > 0);
  assert(Object.keys(meta.budgets).length > 0);
  for (const fixture of fixtures) {
    const validated = validateSequenceDiagram(fixture);
    assert(Object.isFrozen(validated));
    assert(Object.isFrozen(validated.participants));
    assert(Object.isFrozen(validated.messages));
    assert(Object.isFrozen(validated.notes));
    assertEquals(scene(fixture).sourceKind, "sequence");
  }
});

Deno.test("sequence description preserves every fact in authored order", () => {
  assertEquals(
    describeSequenceDiagram(prepare()),
    REPRESENTATIVE_DESCRIPTION,
  );
  assertEquals(
    describeSequenceDiagram(prepare(minimal)),
    `Title: Request one record
Summary: A reader asks a source for one stable record.
Participants:
1. participant reader: Reader
2. participant source: Source
Messages:
1. call request: reader to source; label: Request record
Notes:
None.
`,
  );
  assert(!REPRESENTATIVE_DESCRIPTION.includes("→"));
});

Deno.test("sequence validation rejects identity, reference, and attachment ambiguity", () => {
  expectDiagramError(
    () =>
      validateSequenceDiagram({
        ...minimal,
        participants: [
          minimal.participants[0],
          { ...minimal.participants[1], id: "reader" },
        ],
      }),
    "diagram/duplicate-id",
  );
  expectDiagramError(
    () =>
      validateSequenceDiagram({
        ...minimal,
        messages: [{ ...minimal.messages[0], target: "missing" }],
      }),
    "diagram/dangling-reference",
  );
  expectDiagramError(
    () =>
      validateSequenceDiagram({
        ...minimal,
        notes: [{
          id: "ambiguous",
          label: "Names two owners",
          participantId: "reader",
          messageId: "request",
        }],
      }),
    "diagram/invalid-spec",
  );
  expectDiagramError(
    () =>
      validateSequenceDiagram({
        ...minimal,
        notes: [{
          id: "detached",
          label: "Names no owner",
        }],
      }),
    "diagram/invalid-spec",
  );
  expectDiagramError(
    () =>
      validateSequenceDiagram({
        ...minimal,
        notes: [{
          id: "missing-note-owner",
          label: "Names a missing message",
          messageId: "missing",
        }],
      }),
    "diagram/dangling-reference",
  );
  expectDiagramError(
    () =>
      validateSequenceDiagram({
        ...minimal,
        messages: [{
          ...minimal.messages[0],
          source: "reader",
          target: "reader",
        }],
      }),
    "diagram/invalid-spec",
  );
  expectDiagramError(
    () =>
      validateSequenceDiagram({
        ...minimal,
        messages: [{ ...minimal.messages[0], kind: "self" }],
      }),
    "diagram/invalid-spec",
  );
  expectDiagramError(
    () => validateSequenceDiagram({ ...minimal, activationBars: true }),
    "diagram/invalid-spec",
  );
});

Deno.test("sequence budgets prescribe practical decomposition", () => {
  const participantError = expectDiagramError(
    () =>
      validateSequenceDiagram({
        ...minimal,
        participants: Array.from({ length: 6 }, (_, index) => ({
          id: `participant-${index + 1}`,
          label: `Participant ${index + 1}`,
        })),
        messages: [{
          id: "first",
          source: "participant-1",
          target: "participant-2",
          label: "Begin",
          kind: "call",
        }],
      }),
    "diagram/budget/participants",
  );
  assertInstanceOf(participantError, DiagramBudgetError);
  assertEquals(participantError.authorAction, "reduce-participants");
  assert(participantError.message.includes("allows 5 participants"));
  assert(participantError.remedy.includes("consecutive sequences"));

  const messageError = expectDiagramError(
    () =>
      validateSequenceDiagram({
        ...minimal,
        messages: Array.from({ length: 15 }, (_, index) => ({
          id: `message-${index + 1}`,
          source: "reader",
          target: "source",
          label: `Request ${index + 1}`,
          kind: "call" as const,
        })),
      }),
    "diagram/budget/messages",
  );
  assertInstanceOf(messageError, DiagramBudgetError);
  assertEquals(messageError.authorAction, "split-overview");
  assert(messageError.remedy.includes("overview"));

  const labelError = expectDiagramError(
    () =>
      validateSequenceDiagram({
        ...minimal,
        participants: [
          { ...minimal.participants[0], label: "x".repeat(49) },
          minimal.participants[1],
        ],
      }),
    "diagram/budget/participantLabelGraphemes",
  );
  assertInstanceOf(labelError, DiagramBudgetError);
  assertEquals(labelError.authorAction, "shorten-label");
});

Deno.test("sequence layout preserves participant columns and message chronology", () => {
  const first = scene();
  assertEquals(first.canvas.bounds, {
    x: 0,
    y: 0,
    width: 725.13,
    height: 652,
  });
  for (let run = 0; run < 5; run += 1) {
    assertEquals(JSON.stringify(scene()), JSON.stringify(first));
  }
  const guides = first.elements.filter((element): element is DiagramGuide =>
    element.kind === "guide"
  );
  assertEquals(
    guides.map(({ semanticId }) => semanticId),
    [
      "@sequence-lifeline:requester",
      "@sequence-lifeline:coordinator",
      "@sequence-lifeline:worker",
    ],
  );
  assertEquals(
    guides.map((guide) => guide.points[0]?.x),
    [90.24, 350.24, 610.24],
  );
  assert(guides.every(({ style }) => style === "dashed"));

  const connectors = first.elements.filter(
    (element): element is DiagramConnector => element.kind === "connector",
  );
  assertEquals(
    connectors.map(({ semanticId }) => semanticId),
    ["submit", "dispatch", "verify", "result", "reply"],
  );
  assertEquals(
    connectors.map(({ style }) => style),
    ["primary", "secondary", "primary", "return", "return"],
  );
  assertEquals(
    connectors.map((connector) => connector.points[0]?.y),
    [239, 306, 421, 532, 599],
  );
  assert(connectors.every(({ routing }) => routing === "polyline"));
  const self = connectors.find(({ semanticId }) => semanticId === "verify");
  assert(self !== undefined);
  assertEquals(self.sourceId, "@sequence-lifeline:worker");
  assertEquals(self.targetId, "@sequence-lifeline:worker");
  assertEquals(self.points.length, 4);
  assertEquals(self.arrowhead.tip, { x: 610.24, y: 465 });

  for (const connector of connectors) {
    const target = guides.find(({ semanticId }) =>
      semanticId === connector.targetId
    );
    assert(target !== undefined);
    assertEquals(connector.arrowhead.tip.x, target.points[0]?.x);
    const base = connector.points.at(-1);
    assert(base !== undefined);
    if (connector.sourceId !== connector.targetId) {
      const source = guides.find(({ semanticId }) =>
        semanticId === connector.sourceId
      );
      assert(source !== undefined);
      const expectedDirection = Math.sign(
        (target.points[0]?.x ?? 0) - (source.points[0]?.x ?? 0),
      );
      assertEquals(
        Math.sign(connector.arrowhead.tip.x - base.x),
        expectedDirection,
      );
    }
  }
});

Deno.test("sequence notes and labels remain clear of message geometry", () => {
  const value = scene();
  const texts = value.elements.filter((element): element is DiagramText =>
    element.kind === "text"
  );
  const workerNote = texts.find(({ id }) => id === "note-worker-scope-text");
  const deliveryNote = texts.find(({ id }) => id === "note-delivery-text");
  assertEquals(workerNote?.ownerId, "@sequence-lifeline:worker");
  assertEquals(deliveryNote?.ownerId, "dispatch");
  assertEquals(workerNote?.placement, "free");
  assertEquals(deliveryNote?.placement, "free");
  for (let left = 0; left < texts.length; left += 1) {
    for (let right = left + 1; right < texts.length; right += 1) {
      const a = texts[left];
      const b = texts[right];
      if (a !== undefined && b !== undefined && a.ownerId !== b.ownerId) {
        assert(!overlaps(a.bounds, b.bounds), `${a.id} overlaps ${b.id}`);
      }
    }
  }
  for (const element of value.elements) {
    for (const scalar of Object.values(element.bounds)) {
      assert(Number.isFinite(scalar));
    }
    assert(element.bounds.x >= value.canvas.bounds.x);
    assert(element.bounds.y >= value.canvas.bounds.y);
    assert(
      diagramRectRight(element.bounds) <= diagramRectRight(value.canvas.bounds),
    );
    assert(
      diagramRectBottom(element.bounds) <=
        diagramRectBottom(value.canvas.bounds),
    );
  }
});

Deno.test("sequence private lifelines cannot alias authored participant IDs", () => {
  const adversarial = {
    kind: "sequence",
    title: "Keep endpoint identities distinct",
    summary: "A valid public identifier resembles an ordinary suffix.",
    participants: [
      { id: "reader", label: "Reader" },
      { id: "reader-lifeline", label: "Named endpoint" },
    ],
    messages: [{
      id: "respond",
      source: "reader-lifeline",
      target: "reader",
      label: "Respond",
      kind: "return",
    }],
  } as const satisfies SequenceDiagramSpec;
  const value = scene(adversarial);
  const connector = value.elements.find((element) =>
    element.kind === "connector"
  );
  assert(connector?.kind === "connector");
  assertEquals(connector.sourceId, "@sequence-lifeline:reader-lifeline");
  assertEquals(connector.targetId, "@sequence-lifeline:reader");
});

Deno.test("sequence supports bounded long labels and dense authored order", () => {
  const long = {
    kind: "sequence",
    title: "Compare complete records",
    summary: "Two participants exchange a deliberately detailed request.",
    participants: [
      {
        id: "requester",
        label: "Reference requester",
        annotation: "Keeps the complete comparison context",
      },
      {
        id: "provider",
        label: "Reviewed provider",
        annotation: "Returns one stable checked response",
      },
    ],
    messages: [{
      id: "compare",
      source: "requester",
      target: "provider",
      label: "Request evidence for complete comparison and confirmation",
      kind: "call",
    }],
    notes: [{
      id: "scope",
      messageId: "compare",
      label: "Preserves the context used during the recorded review",
    }],
  } as const satisfies SequenceDiagramSpec;
  const longScene = scene(long);
  const messageLabel = longScene.elements.find((element) =>
    element.id === "message-compare-label"
  );
  assert(messageLabel?.kind === "text");
  assertEquals(messageLabel.lines.length, 3);

  const denseScene = scene(dense);
  assertEquals(
    denseScene.elements.filter(({ kind }) => kind === "connector").length,
    14,
  );
});

Deno.test("sequence CLI has exact narrow, standard, and wide degradation", () => {
  const narrow = testTerminalCapabilities({
    columns: 60,
    unicode: true,
    colorDepth: "none",
  });
  assertEquals(project(representative, narrow), {
    kind: "declined",
    code: "width",
    fact: 60,
    limit: 68,
  });
  assertEquals(describeSequenceDiagram(prepare()), REPRESENTATIVE_DESCRIPTION);

  const standard = testTerminalCapabilities({
    columns: 88,
    unicode: true,
    colorDepth: "none",
  });
  const standardResult = project(representative, standard);
  assertEquals(standardResult.kind, "frame");
  if (standardResult.kind === "frame") {
    assertExactFrame(standardResult.frame, STANDARD_UNICODE_FRAME, standard);
  }

  const wide = testTerminalCapabilities({
    columns: 104,
    unicode: false,
    colorDepth: "none",
  });
  const wideResult = project(representative, wide);
  assertEquals(wideResult.kind, "frame");
  if (wideResult.kind === "frame") {
    assertExactFrame(wideResult.frame, WIDE_ASCII_FRAME, wide);
    assert(
      Array.from(wideResult.frame).every((character) =>
        (character.codePointAt(0) ?? 0) <= 0x7f
      ),
    );
  }
});

Deno.test("sequence CLI preserves facts across Unicode, ASCII, colour, and no colour", () => {
  const validated = prepare();
  for (const columns of [88, 104]) {
    for (const unicode of [true, false]) {
      const plainCapabilities = testTerminalCapabilities({
        columns,
        unicode,
        colorDepth: "none",
      });
      const styledCapabilities = testTerminalCapabilities({
        columns,
        unicode,
        colorDepth: "truecolor",
      });
      const plain = project(representative, plainCapabilities);
      const styled = project(representative, styledCapabilities);
      assertEquals(plain.kind, "frame");
      assertEquals(styled.kind, "frame");
      if (plain.kind !== "frame" || styled.kind !== "frame") continue;
      assertExactFrame(plain.frame, stripAnsi(styled.frame), plainCapabilities);
      assertStyledFrame(styled.frame, plain.frame, styledCapabilities);
      for (const line of plain.frame.split("\n")) {
        assert(measureText(line) <= columns);
      }
      for (
        const fact of [
          validated.title,
          validated.summary,
          ...validated.participants.flatMap((participant) => [
            `participant ${participant.id}`,
            participant.label,
            ...(participant.annotation === undefined
              ? []
              : [participant.annotation]),
          ]),
          ...validated.messages.flatMap((message) => [
            message.kind,
            message.id,
            message.source,
            message.target,
            message.label,
          ]),
          ...validated.notes.flatMap((note) => [
            note.attachment,
            note.id,
            note.attachmentId,
            note.label,
          ]),
        ]
      ) {
        assert(plain.frame.includes(fact), `enhanced frame omitted ${fact}`);
      }
    }
  }
});

Deno.test("sequence enhanced viability declines before cropping facts", () => {
  const capabilities = testTerminalCapabilities({ columns: 96 });
  const fiveParticipants = {
    ...minimal,
    participants: Array.from({ length: 5 }, (_, index) => ({
      id: `participant-${index + 1}`,
      label: `Participant ${index + 1}`,
    })),
    messages: [{
      id: "begin",
      source: "participant-1",
      target: "participant-2",
      label: "Begin exchange",
      kind: "call" as const,
    }],
  } satisfies SequenceDiagramSpec;
  assertEquals(project(fiveParticipants, capabilities), {
    kind: "declined",
    code: "participant-count",
    fact: 5,
    limit: 4,
  });
  const nineMessages = {
    ...minimal,
    messages: Array.from({ length: 9 }, (_, index) => ({
      id: `message-${index + 1}`,
      source: "reader",
      target: "source",
      label: `Request ${index + 1}`,
      kind: "call" as const,
    })),
  } satisfies SequenceDiagramSpec;
  assertEquals(project(nineMessages, capabilities), {
    kind: "declined",
    code: "message-count",
    fact: 9,
    limit: 8,
  });
});
