/** Shared internal choice validation, viewport, and keyboard navigation. */

import type { InteractiveChoiceEntryState } from "../interactive-states.ts";
import type { TerminalKey } from "./keys.ts";
import type {
  InteractionChoice,
  InteractionChoicePresentation,
  InteractionEntry,
  InteractionGroupHeading,
} from "./types.ts";

const DEFAULT_VISIBLE_CHOICES = 5;

/** Validate and collapse the source-compatible form default for frame state. */
export function resolveInteractionChoicePresentation(
  value: InteractionChoicePresentation | undefined,
): "browsing" | undefined {
  const presentation = value ?? "form";
  if (presentation !== "form" && presentation !== "browsing") {
    throw new TypeError(
      `interaction choice presentation must be "form" or "browsing"; received ${
        JSON.stringify(presentation)
      }`,
    );
  }
  return presentation === "browsing" ? "browsing" : undefined;
}

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
    if (
      entry.description !== undefined &&
      (entry.description.trim() === "" ||
        /[\p{Cc}\p{Cf}]/u.test(entry.description))
    ) {
      throw new TypeError(
        `${
          isInteractionGroupHeading(entry) ? "choice group heading" : "choice"
        } ${JSON.stringify(entry.id)} has an invalid description`,
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
      ? {
        kind: "group-heading",
        id: entry.id,
        label: entry.label,
        ...(entry.description === undefined
          ? {}
          : { description: entry.description }),
      }
      : {
        ...(entry.kind === undefined ? {} : { kind: entry.kind }),
        id: entry.id,
        label: entry.label,
        ...(entry.description === undefined
          ? {}
          : { description: entry.description }),
        ...(entry.disabled === undefined ? {} : { disabled: entry.disabled }),
      }
  );
}

function entryMatches(
  entry: InteractionEntry<unknown>,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  return entry.label.toLowerCase().includes(needle) ||
    entry.description?.toLowerCase().includes(needle) === true;
}

/**
 * Filter one static choice source by label and description while retaining a
 * matched choice's governing group heading. A matching heading retains its
 * complete group. Provider-backed search remains caller-owned and untouched.
 */
export function filterInteractionEntries<T>(
  entries: readonly InteractionEntry<T>[],
  query: string,
): readonly InteractionEntry<T>[] {
  assertChoices(entries);
  if (query.trim() === "") return entries;
  const filtered: InteractionEntry<T>[] = [];
  let index = 0;
  while (index < entries.length) {
    const entry = entries[index];
    if (entry === undefined) break;
    if (!isInteractionGroupHeading(entry)) {
      if (entryMatches(entry, query)) filtered.push(entry);
      index += 1;
      continue;
    }
    const heading = entry;
    const grouped: InteractionChoice<T>[] = [];
    index += 1;
    while (index < entries.length) {
      const candidate = entries[index];
      if (candidate === undefined || isInteractionGroupHeading(candidate)) {
        break;
      }
      grouped.push(candidate);
      index += 1;
    }
    const headingMatches = entryMatches(heading, query);
    const matched = headingMatches
      ? grouped
      : grouped.filter((candidate) => entryMatches(candidate, query));
    if (headingMatches || matched.length > 0) {
      filtered.push(heading, ...matched);
    }
  }
  return filtered;
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

/**
 * Move the highlight one visible window in a direction, landing on the
 * nearest enabled choice at or beyond the jump target. Paging clamps at the
 * list's edges rather than wrapping.
 */
export function pageEnabledIndex<T>(
  choices: readonly InteractionEntry<T>[],
  current: number,
  direction: -1 | 1,
  pageSize: number,
): number {
  const enabled = enabledIndices(choices);
  if (enabled.length === 0) return -1;
  const origin = enabled.includes(current)
    ? current
    : direction === 1
    ? -1
    : choices.length;
  const target = origin + direction * Math.max(1, pageSize);
  if (direction === 1) {
    return enabled.find((index) => index >= target) ??
      enabled[enabled.length - 1] ?? 0;
  }
  return [...enabled].reverse().find((index) => index <= target) ??
    enabled[0] ?? 0;
}

/**
 * The enabled choice nearest a vacated position: the entry now occupying
 * that index or the first enabled one after it, else the closest enabled
 * choice before it.
 */
export function nearestEnabledIndex<T>(
  choices: readonly InteractionEntry<T>[],
  index: number,
): number {
  const anchor = Math.min(Math.max(0, index), choices.length - 1);
  for (let probe = anchor; probe < choices.length; probe += 1) {
    const entry = choices[probe];
    if (
      entry !== undefined && isInteractionChoice(entry) &&
      entry.disabled !== true
    ) {
      return probe;
    }
  }
  for (let probe = anchor - 1; probe >= 0; probe -= 1) {
    const entry = choices[probe];
    if (
      entry !== undefined && isInteractionChoice(entry) &&
      entry.disabled !== true
    ) {
      return probe;
    }
  }
  return -1;
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
