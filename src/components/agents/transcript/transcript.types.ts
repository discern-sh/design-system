import { routinePositions, type RoutineRecord } from "../routine-groups.ts";

/** Caller-owned identity and routine boundaries shared by both transcript projections. */
export interface TranscriptRoutine extends RoutineRecord {
  /** Stable identity for rich speaker nodes; string speakers can use their exact text. */
  readonly speakerId?: string;
  readonly speaker: unknown;
}

/** Adjacent routine turns group only when their speaker identity is known and equal. */
export function transcriptPositions<T extends TranscriptRoutine>(
  turns: readonly T[],
) {
  const identity = (turn: TranscriptRoutine) =>
    typeof turn.speaker === "string" ? turn.speaker : turn.speakerId;
  return routinePositions(
    turns,
    (left, right) =>
      identity(left) !== undefined && identity(left) === identity(right),
  );
}
