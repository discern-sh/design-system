/** Semantic authoring and validated data contracts for sequence diagrams. */

import type { ValidatedDiagramSpec } from "../../dispatch.ts";
import type { DiagramCommonSpec } from "../../spec.ts";

/** Restrained interaction semantics with distinct non-colour line treatment. */
export type SequenceMessageKind = "call" | "signal" | "return" | "self";

/** One stable actor or system in the authored interaction. */
export interface SequenceParticipantSpec {
  readonly id: string;
  readonly label: string;
  readonly annotation?: string;
}

/** One interaction at an exact authored position in the chronology. */
export interface SequenceMessageSpec {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly label: string;
  readonly kind: SequenceMessageKind;
}

/** One qualification attached to exactly one participant or message. */
export interface SequenceNoteSpec {
  readonly id: string;
  readonly label: string;
  readonly participantId?: string;
  readonly messageId?: string;
}

/** JSON-safe, documentation-scale ordered interaction. */
export interface SequenceDiagramSpec extends DiagramCommonSpec {
  readonly kind: "sequence";
  readonly participants: readonly SequenceParticipantSpec[];
  readonly messages: readonly SequenceMessageSpec[];
  readonly notes?: readonly SequenceNoteSpec[];
}

/** Normalized participant returned by complete sequence preflight. */
export interface ValidatedSequenceParticipant {
  readonly id: string;
  readonly label: string;
  readonly annotation?: string;
  readonly sourceOrder: number;
}

/** Normalized authored message returned by complete sequence preflight. */
export interface ValidatedSequenceMessage {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly label: string;
  readonly kind: SequenceMessageKind;
  readonly sourceOrder: number;
}

/** Normalized note with one explicit attachment. */
export interface ValidatedSequenceNote {
  readonly id: string;
  readonly label: string;
  readonly attachment: "participant" | "message";
  readonly attachmentId: string;
  readonly sourceOrder: number;
}

/** Fully checked sequence consumed by descriptions and layout. */
export interface ValidatedSequenceDiagram extends ValidatedDiagramSpec {
  readonly kind: "sequence";
  readonly title: string;
  readonly summary: string;
  readonly participants: readonly ValidatedSequenceParticipant[];
  readonly messages: readonly ValidatedSequenceMessage[];
  readonly notes: readonly ValidatedSequenceNote[];
}
