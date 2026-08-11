/** Shared internal choice validation, viewport, and keyboard navigation. */

import type { InteractiveChoiceState } from "../interactive-states.ts";
import type { TerminalKey } from "./keys.ts";
import type { PromptChoice } from "./types.ts";

const DEFAULT_VISIBLE_CHOICES = 5;

export function assertChoices<T>(choices: readonly PromptChoice<T>[]): void {
  const ids = new Set<string>();
  for (const [index, choice] of choices.entries()) {
    if (choice.id === "" || /[\p{Cc}\p{Cf}]/u.test(choice.id)) {
      throw new TypeError(`choice ${index + 1} has an invalid id`);
    }
    if (ids.has(choice.id)) {
      throw new TypeError(`choice id ${JSON.stringify(choice.id)} is repeated`);
    }
    if (choice.label === "" || /[\p{Cc}\p{Cf}]/u.test(choice.label)) {
      throw new TypeError(
        `choice ${JSON.stringify(choice.id)} has an invalid label`,
      );
    }
    ids.add(choice.id);
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
  choices: readonly PromptChoice<T>[],
): readonly InteractiveChoiceState[] {
  return choices.map((choice) => ({
    id: choice.id,
    label: choice.label,
    ...(choice.disabled === undefined ? {} : { disabled: choice.disabled }),
  }));
}

function enabledIndices<T>(choices: readonly PromptChoice<T>[]): number[] {
  return choices.flatMap((choice, index) =>
    choice.disabled === true ? [] : [index]
  );
}

export function moveEnabledIndex<T>(
  choices: readonly PromptChoice<T>[],
  current: number,
  direction: -1 | 1,
): number {
  const enabled = enabledIndices(choices);
  if (enabled.length === 0) return 0;
  const position = enabled.indexOf(current);
  const origin = position < 0 ? (direction === 1 ? -1 : 0) : position;
  const next = ((origin + direction) % enabled.length + enabled.length) %
    enabled.length;
  return enabled[next] ?? enabled[0] ?? 0;
}

export function edgeEnabledIndex<T>(
  choices: readonly PromptChoice<T>[],
  edge: "first" | "last",
): number {
  const enabled = enabledIndices(choices);
  return edge === "first" ? enabled[0] ?? 0 : enabled[enabled.length - 1] ?? 0;
}

export function initialHighlight<T>(
  choices: readonly PromptChoice<T>[],
  initialId: string | undefined,
): number {
  const requested = initialId === undefined
    ? -1
    : choices.findIndex((choice) =>
      choice.id === initialId && choice.disabled !== true
    );
  return requested >= 0 ? requested : edgeEnabledIndex(choices, "first");
}

export function choiceVisibleStart(
  highlighted: number,
  total: number,
  requestedCount: number,
): number {
  const count = Math.max(1, Math.min(requestedCount, Math.max(1, total)));
  return Math.max(0, Math.min(highlighted - count + 1, total - count));
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
