/** Shared internal choice validation, viewport, and keyboard navigation. */

import type { InteractiveChoiceEntryState } from "../interactive-states.ts";
import type { TerminalKey } from "./keys.ts";
import type {
  InteractionChoice,
  InteractionEntry,
  InteractionGroupHeading,
} from "./types.ts";

const DEFAULT_VISIBLE_CHOICES = 5;

export function isInteractionGroupHeading<T>(
  entry: InteractionEntry<T>,
): entry is InteractionGroupHeading {
  return entry.kind === "group-heading";
}

export function isInteractionChoice<T>(
  entry: InteractionEntry<T>,
): entry is InteractionChoice<T> {
  return entry.kind !== "group-heading";
}

export function assertChoices<T>(
  choices: readonly InteractionEntry<T>[],
  requireSelectable = false,
): void {
  const ids = new Set<string>();
  for (const [index, entry] of choices.entries()) {
    if (entry.id === "" || /[\p{Cc}\p{Cf}]/u.test(entry.id)) {
      throw new TypeError(`choice ${index + 1} has an invalid id`);
    }
    if (ids.has(entry.id)) {
      throw new TypeError(`choice id ${JSON.stringify(entry.id)} is repeated`);
    }
    const invalidHeading = isInteractionGroupHeading(entry) &&
      (entry.label.trim() === "" || entry.label.trim() !== entry.label);
    if (
      entry.label === "" || invalidHeading ||
      /[\p{Cc}\p{Cf}]/u.test(entry.label)
    ) {
      throw new TypeError(
        `${
          isInteractionGroupHeading(entry) ? "choice group heading" : "choice"
        } ${JSON.stringify(entry.id)} has an invalid label`,
      );
    }
    ids.add(entry.id);
  }
  if (requireSelectable && enabledIndices(choices).length === 0) {
    throw new TypeError(
      "choice interaction requires at least one selectable choice",
    );
  }
}

export function choiceVisibleCount(value: number | undefined): number {
  const count = value ?? DEFAULT_VISIBLE_CHOICES;
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new TypeError(
      `visible choice count must be a positive safe integer; received ${count}`,
    );
  }
  return count;
}

export function frameChoices<T>(
  choices: readonly InteractionEntry<T>[],
): readonly InteractiveChoiceEntryState[] {
  return choices.map((entry) =>
    isInteractionGroupHeading(entry)
      ? { kind: "group-heading", id: entry.id, label: entry.label }
      : {
        ...(entry.kind === undefined ? {} : { kind: entry.kind }),
        id: entry.id,
        label: entry.label,
        ...(entry.disabled === undefined ? {} : { disabled: entry.disabled }),
      }
  );
}

function enabledIndices<T>(choices: readonly InteractionEntry<T>[]): number[] {
  return choices.flatMap((entry, index) =>
    !isInteractionChoice(entry) || entry.disabled === true ? [] : [index]
  );
}

export function moveEnabledIndex<T>(
  choices: readonly InteractionEntry<T>[],
  current: number,
  direction: -1 | 1,
): number {
  const enabled = enabledIndices(choices);
  if (enabled.length === 0) return -1;
  const position = enabled.indexOf(current);
  const origin = position < 0 ? (direction === 1 ? -1 : 0) : position;
  const next = ((origin + direction) % enabled.length + enabled.length) %
    enabled.length;
  return enabled[next] ?? enabled[0] ?? 0;
}

export function edgeEnabledIndex<T>(
  choices: readonly InteractionEntry<T>[],
  edge: "first" | "last",
): number {
  const enabled = enabledIndices(choices);
  return edge === "first"
    ? enabled[0] ?? -1
    : enabled[enabled.length - 1] ?? -1;
}

export function initialHighlight<T>(
  choices: readonly InteractionEntry<T>[],
  initialId: string | undefined,
): number {
  const requested = initialId === undefined
    ? -1
    : choices.findIndex((entry) =>
      isInteractionChoice(entry) && entry.id === initialId &&
      entry.disabled !== true
    );
  return requested >= 0 ? requested : edgeEnabledIndex(choices, "first");
}

export function choiceVisibleStart(
  highlighted: number,
  total: number,
  requestedCount: number,
): number {
  const count = Math.max(1, Math.min(requestedCount, Math.max(1, total)));
  const anchor = Math.max(0, highlighted);
  return Math.max(0, Math.min(anchor - count + 1, total - count));
}

export function isBackwardChoiceKey(key: TerminalKey): boolean {
  return (key.kind === "text" && /^[hk]$/u.test(key.text)) ||
    (key.kind === "named" && [
      "up",
      "left",
      "shift-tab",
      "ctrl-p",
      "ctrl-b",
    ].includes(key.name));
}

export function isForwardChoiceKey(key: TerminalKey): boolean {
  return (key.kind === "text" && /^[jl]$/u.test(key.text)) ||
    (key.kind === "named" && [
      "down",
      "right",
      "tab",
      "ctrl-n",
      "ctrl-f",
    ].includes(key.name));
}
