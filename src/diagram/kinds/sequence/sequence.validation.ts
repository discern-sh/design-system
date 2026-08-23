/** Complete semantic preflight for an authored interaction sequence. */

import { DiagramValidationError } from "../../errors.ts";
import { diagramGraphemeCount } from "../../font-metrics.ts";
import {
  assertDiagramExactKeys,
  assertDiagramIdentifier,
  assertDiagramKindBudget,
  assertDiagramText,
  isDiagramRecord,
  validateDiagramCommonSpec,
} from "../../validation.ts";
import meta from "./sequence.meta.ts";
import type {
  SequenceMessageKind,
  ValidatedSequenceDiagram,
  ValidatedSequenceMessage,
  ValidatedSequenceNote,
  ValidatedSequenceParticipant,
} from "./sequence.spec.ts";

const MESSAGE_KINDS: readonly SequenceMessageKind[] = [
  "call",
  "signal",
  "return",
  "self",
];

function invalid(
  code:
    | "diagram/invalid-spec"
    | "diagram/duplicate-id"
    | "diagram/dangling-reference",
  message: string,
  path: string,
  remedy: string,
  facts: Readonly<Record<string, string | number | boolean>> = {},
): never {
  throw new DiagramValidationError({ code, message, path, remedy, facts });
}

function claimIdentity(
  value: unknown,
  path: string,
  identities: Set<string>,
): string {
  assertDiagramIdentifier(value, path);
  if (identities.has(value)) {
    invalid(
      "diagram/duplicate-id",
      `Duplicate semantic identity ${value}.`,
      path,
      "Give every participant, message, and note one stable unique identifier.",
      { id: value },
    );
  }
  identities.add(value);
  return value;
}

function assertTextBudget(
  text: string,
  dimension:
    | "participantLabelGraphemes"
    | "annotationGraphemes"
    | "messageLabelGraphemes"
    | "noteGraphemes",
  path: string,
): void {
  assertDiagramKindBudget(
    meta,
    dimension,
    diagramGraphemeCount(text),
    path,
  );
}

/** Validate identities, references, chronology, and measurable density. */
export default function validateSequenceDiagram(
  input: unknown,
): ValidatedSequenceDiagram {
  const spec = validateDiagramCommonSpec(input, "sequence", [
    "kind",
    "title",
    "summary",
    "participants",
    "messages",
    "notes",
  ]);
  if (!Array.isArray(spec.participants) || spec.participants.length < 2) {
    invalid(
      "diagram/invalid-spec",
      "spec.participants must contain at least two stable participants.",
      "spec.participants",
      "Name the sender and receiver, or use flow for an actor-free process.",
    );
  }
  if (!Array.isArray(spec.messages) || spec.messages.length === 0) {
    invalid(
      "diagram/invalid-spec",
      "spec.messages must contain at least one authored interaction.",
      "spec.messages",
      "Add the first call, signal, return, or self-message in temporal order.",
    );
  }
  if (spec.notes !== undefined && !Array.isArray(spec.notes)) {
    invalid(
      "diagram/invalid-spec",
      "spec.notes must be a JSON-safe array when present.",
      "spec.notes",
      "Attach notes through the documented participantId or messageId fields.",
    );
  }
  const notesInput = (spec.notes ?? []) as readonly unknown[];
  assertDiagramKindBudget(
    meta,
    "participants",
    spec.participants.length,
    "spec.participants",
  );
  assertDiagramKindBudget(
    meta,
    "messages",
    spec.messages.length,
    "spec.messages",
  );
  assertDiagramKindBudget(meta, "notes", notesInput.length, "spec.notes");

  const identities = new Set<string>();
  const participants: ValidatedSequenceParticipant[] = [];
  for (const [index, value] of spec.participants.entries()) {
    const path = `spec.participants[${index}]`;
    if (!isDiagramRecord(value)) {
      invalid(
        "diagram/invalid-spec",
        `${path} must be an object.`,
        path,
        "Use the documented participant id, label, and optional annotation fields.",
      );
    }
    assertDiagramExactKeys(value, ["id", "label", "annotation"], path);
    const id = claimIdentity(value.id, `${path}.id`, identities);
    assertDiagramText(value.label, `${path}.label`);
    assertTextBudget(
      value.label,
      "participantLabelGraphemes",
      `${path}.label`,
    );
    if (value.annotation !== undefined) {
      assertDiagramText(value.annotation, `${path}.annotation`);
      assertTextBudget(
        value.annotation,
        "annotationGraphemes",
        `${path}.annotation`,
      );
    }
    const participant = {
      id,
      label: value.label,
      sourceOrder: index,
      ...(value.annotation === undefined
        ? {}
        : { annotation: value.annotation }),
    } satisfies ValidatedSequenceParticipant;
    participants.push(Object.freeze(participant));
  }

  const participantIds = new Set(participants.map(({ id }) => id));
  const messages: ValidatedSequenceMessage[] = [];
  for (const [index, value] of spec.messages.entries()) {
    const path = `spec.messages[${index}]`;
    if (!isDiagramRecord(value)) {
      invalid(
        "diagram/invalid-spec",
        `${path} must be an object.`,
        path,
        "Use the documented message fields in authored temporal order.",
      );
    }
    assertDiagramExactKeys(
      value,
      ["id", "source", "target", "label", "kind"],
      path,
    );
    const id = claimIdentity(value.id, `${path}.id`, identities);
    assertDiagramIdentifier(value.source, `${path}.source`);
    assertDiagramIdentifier(value.target, `${path}.target`);
    for (
      const [field, endpoint] of [
        ["source", value.source],
        ["target", value.target],
      ] as const
    ) {
      if (!participantIds.has(endpoint)) {
        invalid(
          "diagram/dangling-reference",
          `${path}.${field} refers to missing participant ${endpoint}.`,
          `${path}.${field}`,
          "Add the participant or correct the message endpoint identifier.",
          { missing: endpoint },
        );
      }
    }
    assertDiagramText(value.label, `${path}.label`);
    assertTextBudget(
      value.label,
      "messageLabelGraphemes",
      `${path}.label`,
    );
    if (
      typeof value.kind !== "string" ||
      !MESSAGE_KINDS.includes(value.kind as SequenceMessageKind)
    ) {
      invalid(
        "diagram/invalid-spec",
        `${path}.kind must be one of ${MESSAGE_KINDS.join(", ")}.`,
        `${path}.kind`,
        "Choose the interaction semantic that the reader must distinguish.",
      );
    }
    const kind = value.kind as SequenceMessageKind;
    const sameEndpoint = value.source === value.target;
    if ((kind === "self") !== sameEndpoint) {
      invalid(
        "diagram/invalid-spec",
        sameEndpoint
          ? `${path} must use kind self when source and target are identical.`
          : `${path} with kind self must target its source participant.`,
        `${path}.kind`,
        sameEndpoint
          ? "Use kind self, or name a distinct target participant."
          : "Set target to the source participant, or choose call, signal, or return.",
      );
    }
    messages.push(Object.freeze({
      id,
      source: value.source,
      target: value.target,
      label: value.label,
      kind,
      sourceOrder: index,
    }));
  }

  const messageIds = new Set(messages.map(({ id }) => id));
  const notes: ValidatedSequenceNote[] = [];
  for (const [index, value] of notesInput.entries()) {
    const path = `spec.notes[${index}]`;
    if (!isDiagramRecord(value)) {
      invalid(
        "diagram/invalid-spec",
        `${path} must be an object.`,
        path,
        "Attach one plain-text note to one participant or message.",
      );
    }
    assertDiagramExactKeys(
      value,
      ["id", "label", "participantId", "messageId"],
      path,
    );
    const id = claimIdentity(value.id, `${path}.id`, identities);
    assertDiagramText(value.label, `${path}.label`);
    assertTextBudget(value.label, "noteGraphemes", `${path}.label`);
    const hasParticipant = value.participantId !== undefined;
    const hasMessage = value.messageId !== undefined;
    if (hasParticipant === hasMessage) {
      invalid(
        "diagram/invalid-spec",
        `${path} must attach to exactly one participantId or messageId.`,
        path,
        "Remove one attachment field, or add the one missing attachment.",
      );
    }
    const attachment = hasParticipant ? "participant" : "message";
    const attachmentValue = hasParticipant
      ? value.participantId
      : value.messageId;
    const attachmentPath = hasParticipant
      ? `${path}.participantId`
      : `${path}.messageId`;
    assertDiagramIdentifier(attachmentValue, attachmentPath);
    const attachments = hasParticipant ? participantIds : messageIds;
    if (!attachments.has(attachmentValue)) {
      invalid(
        "diagram/dangling-reference",
        `${attachmentPath} refers to missing ${attachment} ${attachmentValue}.`,
        attachmentPath,
        `Attach the note to an existing ${attachment} identifier.`,
        { missing: attachmentValue },
      );
    }
    notes.push(Object.freeze({
      id,
      label: value.label,
      attachment,
      attachmentId: attachmentValue,
      sourceOrder: index,
    }));
  }

  const totalText = [
    spec.title,
    spec.summary,
    ...participants.flatMap((participant) => [
      participant.label,
      ...(participant.annotation === undefined ? [] : [participant.annotation]),
    ]),
    ...messages.map(({ label }) => label),
    ...notes.map(({ label }) => label),
  ].reduce((total, text) => total + diagramGraphemeCount(text), 0);
  assertDiagramKindBudget(
    meta,
    "totalTextGraphemes",
    totalText,
    "spec",
  );

  return Object.freeze({
    kind: "sequence",
    title: spec.title,
    summary: spec.summary,
    participants: Object.freeze(participants),
    messages: Object.freeze(messages),
    notes: Object.freeze(notes),
  });
}
