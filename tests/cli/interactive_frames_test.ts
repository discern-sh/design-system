import { assertEquals } from "@std/assert";
import type { InteractiveFrameState } from "../../src/cli/interactive-states.ts";
import {
  renderDeterminateProgressFrame,
  renderInteractiveFrame,
  renderSpinnerFrame,
} from "../../src/cli/interactive/frame-renderers.ts";
import { assertExactFrame, testCapabilities } from "./helpers.ts";

const ACTIVE = { status: "active" } as const;

const FRAME_STATES = [
  {
    kind: "text-input",
    label: "Name",
    lifecycle: ACTIVE,
    value: "Ada",
    cursor: 1,
  },
  {
    kind: "masked-input",
    label: "Secret",
    lifecycle: ACTIVE,
    valueLength: 3,
    cursor: 3,
  },
  {
    kind: "confirm",
    label: "Continue",
    lifecycle: ACTIVE,
    value: true,
    yesLabel: "Yes",
    noLabel: "No",
  },
  {
    kind: "select",
    label: "Pick",
    lifecycle: ACTIVE,
    options: [{ id: "one", label: "One" }, { id: "two", label: "Two" }],
    highlightedIndex: 1,
    selectedId: "two",
  },
  {
    kind: "multiselect",
    label: "Tags",
    lifecycle: ACTIVE,
    options: [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }],
    highlightedIndex: 0,
    selectedIds: ["b"],
  },
  {
    kind: "search",
    label: "Find",
    lifecycle: ACTIVE,
    query: "th",
    cursor: 2,
    results: [{ id: "a", label: "Alpha" }, { id: "t", label: "Theta" }],
    highlightedIndex: 1,
  },
  {
    kind: "autocomplete",
    label: "Shell",
    lifecycle: ACTIVE,
    value: "z",
    cursor: 1,
    suggestions: ["zsh"],
    highlightedIndex: 0,
  },
  {
    kind: "textarea",
    label: "Notes",
    lifecycle: ACTIVE,
    value: "ab\ncd",
    cursor: 3,
    rows: 2,
  },
  { kind: "spinner", label: "Work", lifecycle: ACTIVE, phase: 2 },
  {
    kind: "determinate-progress",
    label: "Work",
    lifecycle: ACTIVE,
    completed: 1,
    total: 4,
  },
  {
    kind: "sequential-form",
    label: "Setup",
    lifecycle: ACTIVE,
    sections: [
      { id: "a", label: "Account", status: "complete", summary: "Ada" },
      { id: "b", label: "Confirm", status: "active" },
    ],
    activePhase: 1,
  },
] as const satisfies readonly InteractiveFrameState[];

type FrameKind = InteractiveFrameState["kind"];

const EXPECTED: Readonly<
  Record<number, Readonly<Record<FrameKind, string>>>
> = {
  20: {
    "text-input":
      "┌ Name ────────────┐\n│ A▌da             │\n└──────────────────┘",
    "masked-input":
      "┌ Secret ──────────┐\n│ •••▌             │\n└──────────────────┘",
    confirm: "┌ Continue ────────┐\n│ [●] Yes [○] No   │\n└──────────────────┘",
    select:
      "┌ Pick ────────────┐\n│ [ ] One          │\n│ > [●] Two        │\n└──────────────────┘",
    multiselect:
      "┌ Tags ────────────┐\n│ > [ ] Alpha      │\n│ [x] Beta         │\n└──────────────────┘",
    search:
      "┌ Find ────────────┐\n│ th▌              │\n│ Alpha            │\n│ > Theta          │\n└──────────────────┘",
    autocomplete:
      "┌ Shell ───────────┐\n│ z▌sh             │\n└──────────────────┘",
    textarea:
      "┌ Notes ───────────┐\n│ ab               │\n│ ▌cd              │\n└──────────────────┘",
    spinner: "⧨ Work",
    "determinate-progress": "Work\n[ 25%] ◮⧩◭..........",
    "sequential-form": "Setup\n◮ Account: Ada\n│\n[◭] Confirm",
  },
  32: {
    "text-input":
      "┌ Name ────────────────────────┐\n│ A▌da                         │\n└──────────────────────────────┘",
    "masked-input":
      "┌ Secret ──────────────────────┐\n│ •••▌                         │\n└──────────────────────────────┘",
    confirm:
      "┌ Continue ────────────────────┐\n│ [●] Yes [○] No               │\n└──────────────────────────────┘",
    select:
      "┌ Pick ────────────────────────┐\n│ [ ] One                      │\n│ > [●] Two                    │\n└──────────────────────────────┘",
    multiselect:
      "┌ Tags ────────────────────────┐\n│ > [ ] Alpha                  │\n│ [x] Beta                     │\n└──────────────────────────────┘",
    search:
      "┌ Find ────────────────────────┐\n│ th▌                          │\n│ Alpha                        │\n│ > Theta                      │\n└──────────────────────────────┘",
    autocomplete:
      "┌ Shell ───────────────────────┐\n│ z▌sh                         │\n└──────────────────────────────┘",
    textarea:
      "┌ Notes ───────────────────────┐\n│ ab                           │\n│ ▌cd                          │\n└──────────────────────────────┘",
    spinner: "⧨ Work",
    "determinate-progress": "Work\n[ 25%] ◮⧩◭⧨◮⧩...................",
    "sequential-form": "Setup\n◮ Account: Ada\n│\n[◭] Confirm",
  },
  48: {
    "text-input":
      "┌ Name ────────────────────────────────────────┐\n│ A▌da                                         │\n└──────────────────────────────────────────────┘",
    "masked-input":
      "┌ Secret ──────────────────────────────────────┐\n│ •••▌                                         │\n└──────────────────────────────────────────────┘",
    confirm:
      "┌ Continue ────────────────────────────────────┐\n│ [●] Yes [○] No                               │\n└──────────────────────────────────────────────┘",
    select:
      "┌ Pick ────────────────────────────────────────┐\n│ [ ] One                                      │\n│ > [●] Two                                    │\n└──────────────────────────────────────────────┘",
    multiselect:
      "┌ Tags ────────────────────────────────────────┐\n│ > [ ] Alpha                                  │\n│ [x] Beta                                     │\n└──────────────────────────────────────────────┘",
    search:
      "┌ Find ────────────────────────────────────────┐\n│ th▌                                          │\n│ Alpha                                        │\n│ > Theta                                      │\n└──────────────────────────────────────────────┘",
    autocomplete:
      "┌ Shell ───────────────────────────────────────┐\n│ z▌sh                                         │\n└──────────────────────────────────────────────┘",
    textarea:
      "┌ Notes ───────────────────────────────────────┐\n│ ab                                           │\n│ ▌cd                                          │\n└──────────────────────────────────────────────┘",
    spinner: "⧨ Work",
    "determinate-progress":
      "Work\n[ 25%] ◮⧩◭⧨◮⧩◭⧨◮⧩...............................",
    "sequential-form": "Setup\n◮ Account: Ada\n│\n[◭] Confirm",
  },
};

for (const columns of [20, 32, 48]) {
  Deno.test(`every interactive frame is exact at ${columns} columns`, () => {
    const capabilities = testCapabilities({ columns });
    const expected = EXPECTED[columns];
    if (expected === undefined) {
      throw new Error(`missing ${columns}-column fixture`);
    }
    for (const state of FRAME_STATES) {
      assertExactFrame(
        renderInteractiveFrame(state, capabilities),
        expected[state.kind],
        capabilities,
      );
    }
  });
}

Deno.test("interactive spinner renders the complete canonical triangle cycle", () => {
  const capabilities = testCapabilities({ columns: 20 });
  assertEquals(
    [0, 1, 2, 3].map((phase) =>
      renderSpinnerFrame({
        kind: "spinner",
        label: "Work",
        lifecycle: ACTIVE,
        phase,
      }, capabilities)
    ),
    ["◮ Work", "◭ Work", "⧨ Work", "⧩ Work"],
  );
});

Deno.test("interactive progress is exact at zero, 25 percent, and complete", () => {
  const capabilities = testCapabilities({ columns: 15 });
  const frame = (completed: number): string =>
    renderDeterminateProgressFrame({
      kind: "determinate-progress",
      label: "Work",
      lifecycle: completed === 4 ? { status: "submitted" } : ACTIVE,
      completed,
      total: 4,
    }, capabilities);
  assertExactFrame(frame(0), "Work\n[  0%] ........", capabilities);
  assertExactFrame(frame(1), "Work\n[ 25%] ◮⧩......", capabilities);
  assertExactFrame(
    frame(4),
    "Work\n[100%] ◮⧩◭⧨◮⧩◭⧨",
    capabilities,
  );
});
