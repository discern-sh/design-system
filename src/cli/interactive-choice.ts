/** Pure helpers shared by Component renderers for interactive choice entries. */

import type {
  InteractiveChoiceEntryState,
  InteractiveChoiceGroupHeadingState,
  InteractiveChoiceState,
} from "./interactive-states.ts";

/** One visible entry paired with its index in the complete frame state. */
export interface InteractiveChoiceWindowEntry {
  readonly entry: InteractiveChoiceEntryState;
  readonly sourceIndex: number;
}

/** Narrow one frame entry to a semantic group heading. */
export function isInteractiveChoiceGroupHeading(
  entry: InteractiveChoiceEntryState,
): entry is InteractiveChoiceGroupHeadingState {
  return entry.kind === "group-heading";
}

/** Narrow one frame entry to a caller-selectable choice shape. */
export function isInteractiveChoice(
  entry: InteractiveChoiceEntryState,
): entry is InteractiveChoiceState {
  return entry.kind !== "group-heading";
}

/**
 * Resolve a contiguous viewport and retain its preceding group heading as a
 * sticky structural row. The retained heading does not consume the caller's
 * requested choice count.
 */
export function interactiveChoiceWindow(
  entries: readonly InteractiveChoiceEntryState[],
  start: number,
  count: number,
): readonly InteractiveChoiceWindowEntry[] {
  if (!Number.isSafeInteger(start) || start < 0 || start > entries.length) {
    throw new TypeError(
      `choice visible start must be between 0 and ${entries.length}; received ${start}`,
    );
  }
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new TypeError(
      `choice visible count must be a non-negative safe integer; received ${count}`,
    );
  }

  const visible = entries.slice(start, start + count).map(
    (entry, offset): InteractiveChoiceWindowEntry => ({
      entry,
      sourceIndex: start + offset,
    }),
  );
  if (
    visible.length === 0 || start === 0 ||
    isInteractiveChoiceGroupHeading(entries[start]!)
  ) {
    return visible;
  }
  for (let index = start - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry !== undefined && isInteractiveChoiceGroupHeading(entry)) {
      return [{ entry, sourceIndex: index }, ...visible];
    }
  }
  return visible;
}
