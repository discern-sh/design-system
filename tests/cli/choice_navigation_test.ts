import { assertEquals, assertThrows } from "@std/assert";
import { interactiveChoiceWindow } from "../../src/cli/interactive-choice.ts";
import {
  assertChoices,
  choiceVisibleStart,
  edgeEnabledIndex,
  frameChoices,
  initialHighlight,
  isBackwardChoiceKey,
  isForwardChoiceKey,
  moveEnabledIndex,
} from "../../src/cli/interactive/choice-navigation.ts";
import type { TerminalKeyName } from "../../src/cli/interactive/keys.ts";
import type { InteractionEntry } from "../../src/cli/interactive/types.ts";

const grouped = [
  { kind: "group-heading", id: "primary", label: "Primary" },
  { id: "one", label: "One", value: 1 },
  { id: "disabled", label: "Disabled", value: 99, disabled: true },
  { kind: "group-heading", id: "secondary", label: "Secondary" },
  { id: "two", label: "Two", value: 2 },
  { id: "three", label: "Three", value: 3 },
] as const satisfies readonly InteractionEntry<number>[];

Deno.test("choice validation treats semantic headings as stable non-values", () => {
  assertChoices(grouped, true);
  assertChoices([{ id: "plain", label: " Padded label ", value: 1 }]);

  assertThrows(
    () =>
      assertChoices([
        { kind: "group-heading", id: "same", label: "First" },
        { id: "same", label: "Choice", value: 1 },
      ]),
    TypeError,
    "is repeated",
  );
  for (
    const heading of [
      { kind: "group-heading", id: "empty", label: "" },
      { kind: "group-heading", id: "spaces", label: "   " },
      { kind: "group-heading", id: "trim", label: " Untrimmed" },
      { kind: "group-heading", id: "control", label: "Bad\nheading" },
    ] as const
  ) {
    assertThrows(
      () => assertChoices([heading]),
      TypeError,
      "choice group heading",
    );
  }
  assertThrows(
    () =>
      assertChoices([
        { kind: "group-heading", id: "bad\u200b", label: "Bad id" },
      ]),
    TypeError,
    "invalid id",
  );
  assertThrows(
    () =>
      assertChoices([
        { kind: "group-heading", id: "heading", label: "Heading" },
        { id: "disabled", label: "Disabled", value: 1, disabled: true },
      ], true),
    TypeError,
    "at least one selectable choice",
  );
});

Deno.test("choice navigation skips headings and disabled values at every edge", () => {
  assertEquals(initialHighlight(grouped, undefined), 1);
  assertEquals(initialHighlight(grouped, "primary"), 1);
  assertEquals(initialHighlight(grouped, "disabled"), 1);
  assertEquals(initialHighlight(grouped, "two"), 4);
  assertEquals(edgeEnabledIndex(grouped, "first"), 1);
  assertEquals(edgeEnabledIndex(grouped, "last"), 5);
  assertEquals(moveEnabledIndex(grouped, 1, 1), 4);
  assertEquals(moveEnabledIndex(grouped, 4, -1), 1);
  assertEquals(moveEnabledIndex(grouped, 1, -1), 5);
  assertEquals(moveEnabledIndex(grouped, 5, 1), 1);
  assertEquals(
    moveEnabledIndex(
      [
        { kind: "group-heading", id: "only", label: "Only" },
      ],
      0,
      1,
    ),
    -1,
  );

  const backward: readonly TerminalKeyName[] = [
    "up",
    "left",
    "shift-tab",
    "ctrl-p",
    "ctrl-b",
  ];
  const forward: readonly TerminalKeyName[] = [
    "down",
    "right",
    "tab",
    "ctrl-n",
    "ctrl-f",
  ];
  for (const name of backward) {
    assertEquals(isBackwardChoiceKey({ kind: "named", name }), true);
  }
  for (const name of forward) {
    assertEquals(isForwardChoiceKey({ kind: "named", name }), true);
  }
  for (const text of ["h", "k"]) {
    assertEquals(isBackwardChoiceKey({ kind: "text", text }), true);
  }
  for (const text of ["j", "l"]) {
    assertEquals(isForwardChoiceKey({ kind: "text", text }), true);
  }
});

Deno.test("grouped choice viewports keep the active semantic heading visible", () => {
  const start = choiceVisibleStart(5, grouped.length, 2);
  assertEquals(start, 4);
  const window = interactiveChoiceWindow(frameChoices(grouped), start, 2);
  assertEquals(window.map(({ entry }) => entry.id), [
    "secondary",
    "two",
    "three",
  ]);
  assertEquals(window.map(({ sourceIndex }) => sourceIndex), [3, 4, 5]);
  assertEquals(
    interactiveChoiceWindow(frameChoices(grouped), grouped.length, 0),
    [],
  );
});

Deno.test("frame projection preserves heading structure without a disabled state", () => {
  assertEquals(frameChoices(grouped), [
    { kind: "group-heading", id: "primary", label: "Primary" },
    { id: "one", label: "One" },
    { id: "disabled", label: "Disabled", disabled: true },
    { kind: "group-heading", id: "secondary", label: "Secondary" },
    { id: "two", label: "Two" },
    { id: "three", label: "Three" },
  ]);
});
