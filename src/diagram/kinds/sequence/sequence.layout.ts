/** Deterministic participant-column layout for authored interaction order. */

import { DiagramValidationError } from "../../errors.ts";
import { DIAGRAM_GEOMETRY, roundDiagramNumber } from "../../geometry.ts";
import {
  createDiagramConnector,
  createDiagramGuide,
  createDiagramScene,
  type DiagramMeasuredText,
  measureDiagramLayoutText,
  positionDiagramText,
} from "../../layout-authority.ts";
import type {
  DiagramConnector,
  DiagramPoint,
  DiagramRect,
  DiagramScene,
  DiagramSceneElement,
  DiagramSceneGroup,
  DiagramShape,
  DiagramText,
} from "../../scene.ts";
import meta from "./sequence.meta.ts";
import type {
  SequenceMessageKind,
  ValidatedSequenceDiagram,
  ValidatedSequenceMessage,
  ValidatedSequenceNote,
  ValidatedSequenceParticipant,
} from "./sequence.spec.ts";

const G = DIAGRAM_GEOMETRY;
const SEQUENCE_GEOMETRY = Object.freeze({
  columnGap: 260,
  participantMinimumWidth: 128,
  participantTextWidth: 152,
  participantNoteWidth: 168,
  messageTextWidth: 176,
  noteTextWidth: 176,
  headerToNoteGap: 20,
  participantNoteGap: 8,
  notesToLifelineGap: 28,
  lifelineToFirstMessageGap: 16,
  labelToMessageGap: 14,
  messageToNoteGap: 14,
  messageRowGap: 36,
  selfWidth: 216,
  selfHeight: 44,
  lifelineTail: 28,
});

type SequenceTextBudget =
  | "participantLabelLines"
  | "annotationLines"
  | "messageLabelLines"
  | "noteLines";

interface MeasuredNote {
  readonly note: ValidatedSequenceNote;
  readonly text: DiagramMeasuredText;
}

interface ParticipantPlan {
  readonly participant: ValidatedSequenceParticipant;
  readonly label: DiagramMeasuredText;
  readonly annotation?: DiagramMeasuredText;
  readonly notes: readonly MeasuredNote[];
  readonly bounds: DiagramRect;
  readonly centerX: number;
}

interface MessagePlan {
  readonly message: ValidatedSequenceMessage;
  readonly label: DiagramMeasuredText;
  readonly notes: readonly MeasuredNote[];
  readonly connector: DiagramConnector;
  readonly labelText: DiagramText;
  readonly noteTexts: readonly DiagramText[];
  readonly bottom: number;
}

function lifelineSemanticId(participantId: string): string {
  return `@sequence-lifeline:${participantId}`;
}

function measuredText(
  text: string,
  maximumWidth: number,
  fontRole: "interface" | "mono",
  fontSize: number,
  lineHeight: number,
  budget: SequenceTextBudget,
  path: string,
): DiagramMeasuredText {
  return measureDiagramLayoutText({
    text,
    maximumWidth,
    fontRole,
    fontSize,
    lineHeight,
    meta,
    budget,
    path,
  });
}

function participantPlan(
  participant: ValidatedSequenceParticipant,
  notes: readonly ValidatedSequenceNote[],
): ParticipantPlan {
  const label = measuredText(
    participant.label,
    SEQUENCE_GEOMETRY.participantTextWidth,
    "interface",
    G.text.primarySize,
    G.text.primaryLineHeight,
    "participantLabelLines",
    `participant ${participant.id} label`,
  );
  const annotation = participant.annotation === undefined
    ? undefined
    : measuredText(
      participant.annotation,
      SEQUENCE_GEOMETRY.participantTextWidth,
      "mono",
      G.text.annotationSize,
      G.text.annotationLineHeight,
      "annotationLines",
      `participant ${participant.id} annotation`,
    );
  const contentWidth = Math.max(label.width, annotation?.width ?? 0);
  const contentHeight = label.height +
    (annotation === undefined ? 0 : G.node.annotationGap + annotation.height);
  const width = roundDiagramNumber(Math.max(
    SEQUENCE_GEOMETRY.participantMinimumWidth,
    contentWidth + G.node.horizontalPadding * 2,
  ));
  const height = roundDiagramNumber(Math.max(
    G.node.minimumHeight,
    contentHeight + G.node.verticalPadding * 2,
  ));
  const centerX = roundDiagramNumber(
    participant.sourceOrder * SEQUENCE_GEOMETRY.columnGap,
  );
  return {
    participant,
    label,
    ...(annotation === undefined ? {} : { annotation }),
    notes: notes.map((note) => ({
      note,
      text: measuredText(
        note.label,
        SEQUENCE_GEOMETRY.participantNoteWidth,
        "mono",
        G.text.annotationSize,
        G.text.annotationLineHeight,
        "noteLines",
        `note ${note.id} label`,
      ),
    })),
    centerX,
    bounds: {
      x: roundDiagramNumber(centerX - width / 2),
      y: 0,
      width,
      height,
    },
  };
}

function participantElements(
  plan: ParticipantPlan,
  notesTop: number,
  lifelineStart: number,
  lifelineEnd: number,
): readonly DiagramSceneElement[] {
  const semanticId = plan.participant.id;
  const lifelineId = lifelineSemanticId(semanticId);
  const contentHeight = plan.label.height +
    (plan.annotation === undefined
      ? 0
      : G.node.annotationGap + plan.annotation.height);
  const contentTop = plan.bounds.y + (plan.bounds.height - contentHeight) / 2;
  const shape: DiagramShape = {
    kind: "shape",
    id: `participant-${semanticId}-shape`,
    semanticId,
    shape: "rounded-rectangle",
    style: "ordinary",
    bounds: plan.bounds,
    radius: G.node.radius,
  };
  const label = positionDiagramText({
    id: `participant-${semanticId}-label`,
    ownerId: semanticId,
    placement: "inside-shape",
    role: "node-text",
    measured: plan.label,
    centerX: plan.centerX,
    top: contentTop,
  });
  const elements: DiagramSceneElement[] = [
    createDiagramGuide({
      id: `participant-${semanticId}-lifeline`,
      semanticId: lifelineId,
      style: "dashed",
      points: [
        { x: plan.centerX, y: lifelineStart },
        { x: plan.centerX, y: lifelineEnd },
      ],
    }),
    shape,
    label,
  ];
  if (plan.annotation !== undefined) {
    elements.push(positionDiagramText({
      id: `participant-${semanticId}-annotation`,
      ownerId: semanticId,
      placement: "inside-shape",
      role: "quiet-annotation",
      measured: plan.annotation,
      centerX: plan.centerX,
      top: contentTop + plan.label.height + G.node.annotationGap,
    }));
  }
  let top = notesTop;
  for (const { note, text } of plan.notes) {
    elements.push(positionDiagramText({
      id: `note-${note.id}-text`,
      ownerId: lifelineId,
      placement: "free",
      role: "quiet-annotation",
      measured: text,
      centerX: plan.centerX,
      top,
    }));
    top += text.height + SEQUENCE_GEOMETRY.participantNoteGap;
  }
  return elements;
}

function messageStyle(kind: SequenceMessageKind): DiagramConnector["style"] {
  if (kind === "signal") return "secondary";
  if (kind === "return") return "return";
  return "primary";
}

function requireParticipant(
  participants: ReadonlyMap<string, ParticipantPlan>,
  id: string,
  messageId: string,
): ParticipantPlan {
  const participant = participants.get(id);
  if (participant === undefined) {
    throw new DiagramValidationError({
      code: "diagram/layout/connector",
      message: `Message ${messageId} lost validated participant ${id}.`,
      path: `message ${messageId}`,
      remedy: "Fix the sequence layout implementation.",
    });
  }
  return participant;
}

function safeGapCenter(
  source: ParticipantPlan,
  target: ParticipantPlan,
): number {
  const direction = target.centerX > source.centerX ? 1 : -1;
  return roundDiagramNumber(
    source.centerX + direction * SEQUENCE_GEOMETRY.columnGap / 2,
  );
}

function selfSide(
  participant: ValidatedSequenceParticipant,
  participantCount: number,
): -1 | 1 {
  return participant.sourceOrder === participantCount - 1 ? -1 : 1;
}

function messagePlan(
  message: ValidatedSequenceMessage,
  notes: readonly ValidatedSequenceNote[],
  participants: ReadonlyMap<string, ParticipantPlan>,
  participantCount: number,
  top: number,
): MessagePlan {
  const source = requireParticipant(participants, message.source, message.id);
  const target = requireParticipant(participants, message.target, message.id);
  const label = measuredText(
    message.label,
    SEQUENCE_GEOMETRY.messageTextWidth,
    "interface",
    G.text.edgeSize,
    G.text.edgeLineHeight,
    "messageLabelLines",
    `message ${message.id} label`,
  );
  const measuredNotes: MeasuredNote[] = notes.map((note) => ({
    note,
    text: measuredText(
      note.label,
      SEQUENCE_GEOMETRY.noteTextWidth,
      "mono",
      G.text.annotationSize,
      G.text.annotationLineHeight,
      "noteLines",
      `note ${note.id} label`,
    ),
  }));
  const lineY = roundDiagramNumber(
    top + label.height + SEQUENCE_GEOMETRY.labelToMessageGap,
  );
  let labelCenter: number;
  let pathWithTip: readonly DiagramPoint[];
  let messageBottom: number;
  if (message.kind === "self") {
    const side = selfSide(source.participant, participantCount);
    const outsideX = roundDiagramNumber(
      source.centerX + side * SEQUENCE_GEOMETRY.selfWidth,
    );
    const targetY = roundDiagramNumber(
      lineY + SEQUENCE_GEOMETRY.selfHeight,
    );
    labelCenter = roundDiagramNumber((source.centerX + outsideX) / 2);
    pathWithTip = [
      { x: source.centerX, y: lineY },
      { x: outsideX, y: lineY },
      { x: outsideX, y: targetY },
      { x: source.centerX, y: targetY },
    ];
    messageBottom = targetY;
  } else {
    labelCenter = safeGapCenter(source, target);
    pathWithTip = [
      { x: source.centerX, y: lineY },
      { x: target.centerX, y: lineY },
    ];
    messageBottom = lineY;
  }
  const connector = createDiagramConnector({
    id: `message-${message.id}-connector`,
    semanticId: message.id,
    sourceId: lifelineSemanticId(message.source),
    targetId: lifelineSemanticId(message.target),
    style: messageStyle(message.kind),
    routing: "polyline",
    pathWithTip,
    path: `message ${message.id}`,
    remedy:
      "Show fewer participants or split the interaction into consecutive sequences.",
  });
  const labelText = positionDiagramText({
    id: `message-${message.id}-label`,
    ownerId: message.id,
    placement: "free",
    role: "connector-label",
    measured: label,
    centerX: labelCenter,
    top,
  });
  let noteTop = messageBottom + SEQUENCE_GEOMETRY.messageToNoteGap;
  const noteTexts = measuredNotes.map(({ note, text }) => {
    const positioned = positionDiagramText({
      id: `note-${note.id}-text`,
      ownerId: message.id,
      placement: "free",
      role: "quiet-annotation",
      measured: text,
      centerX: labelCenter,
      top: noteTop,
    });
    noteTop += text.height + SEQUENCE_GEOMETRY.participantNoteGap;
    return positioned;
  });
  const bottom = measuredNotes.length === 0
    ? messageBottom
    : noteTop - SEQUENCE_GEOMETRY.participantNoteGap;
  return {
    message,
    label,
    notes: measuredNotes,
    connector,
    labelText,
    noteTexts,
    bottom: roundDiagramNumber(bottom),
  };
}

/** Lay a validated sequence into one projection-neutral scene. */
export default function layoutSequenceDiagram(
  spec: ValidatedSequenceDiagram,
): DiagramScene {
  const participantNotes = spec.notes.filter((note) =>
    note.attachment === "participant"
  );
  const participants = spec.participants.map((participant) =>
    participantPlan(
      participant,
      participantNotes.filter((note) => note.attachmentId === participant.id),
    )
  );
  const byId = new Map(participants.map((plan) => [plan.participant.id, plan]));
  const maximumHeaderHeight = Math.max(
    ...participants.map(({ bounds }) => bounds.height),
  );
  const notesTop = maximumHeaderHeight + SEQUENCE_GEOMETRY.headerToNoteGap;
  const maximumParticipantNotesHeight = Math.max(
    0,
    ...participants.map((plan) =>
      plan.notes.reduce(
        (height, { text }, index) =>
          height + text.height +
          (index === 0 ? 0 : SEQUENCE_GEOMETRY.participantNoteGap),
        0,
      )
    ),
  );
  const lifelineStart = roundDiagramNumber(
    notesTop + maximumParticipantNotesHeight +
      SEQUENCE_GEOMETRY.notesToLifelineGap,
  );
  let cursor = lifelineStart + SEQUENCE_GEOMETRY.lifelineToFirstMessageGap;
  const messageNotes = spec.notes.filter((note) =>
    note.attachment === "message"
  );
  const messages: MessagePlan[] = [];
  for (const message of spec.messages) {
    const plan = messagePlan(
      message,
      messageNotes.filter((note) => note.attachmentId === message.id),
      byId,
      participants.length,
      cursor,
    );
    messages.push(plan);
    cursor = plan.bottom + SEQUENCE_GEOMETRY.messageRowGap;
  }
  const lifelineEnd = roundDiagramNumber(
    Math.max(
      lifelineStart + 1,
      cursor - SEQUENCE_GEOMETRY.messageRowGap +
        SEQUENCE_GEOMETRY.lifelineTail,
    ),
  );

  const participantElementsValue = participants.flatMap((plan) =>
    participantElements(plan, notesTop, lifelineStart, lifelineEnd)
  );
  const messageElements = messages.flatMap((plan) => [
    plan.connector,
    plan.labelText,
    ...plan.noteTexts,
  ]);
  const groups: DiagramSceneGroup[] = [
    ...participants.map((plan) => ({
      id: `participant-${plan.participant.id}-group`,
      children: [
        `participant-${plan.participant.id}-lifeline`,
        `participant-${plan.participant.id}-shape`,
        `participant-${plan.participant.id}-label`,
        ...(plan.annotation === undefined
          ? []
          : [`participant-${plan.participant.id}-annotation`]),
        ...plan.notes.map(({ note }) => `note-${note.id}-text`),
      ],
    })),
    ...messages.map((plan) => ({
      id: `message-${plan.message.id}-group`,
      children: [
        plan.connector.id,
        plan.labelText.id,
        ...plan.noteTexts.map(({ id }) => id),
      ],
    })),
  ];
  return createDiagramScene({
    sourceKind: "sequence",
    elements: [...participantElementsValue, ...messageElements],
    groups,
    root: groups.map(({ id }) => id),
    meta,
  });
}
