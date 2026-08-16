import { assertEquals } from "@std/assert";
import type {
  InteractiveFrameLifecycle,
  InteractiveFrameState,
} from "../../src/cli/interactive-states.ts";

Deno.test("interactive frame vocabulary preserves semantic lifecycle and phases", () => {
  const lifecycles: readonly InteractiveFrameLifecycle[] = [
    { status: "active" },
    { status: "validation-error", message: "Required." },
    { status: "submitted" },
    { status: "cancelled", reason: "Cancelled." },
  ];
  const frames: readonly InteractiveFrameState[] = [
    {
      kind: "text-input",
      label: "Name",
      lifecycle: lifecycles[0]!,
      value: "Ada",
      cursor: 3,
    },
    {
      kind: "masked-input",
      label: "Secret",
      lifecycle: lifecycles[1]!,
      valueLength: 3,
      cursor: 3,
    },
    {
      kind: "confirm",
      label: "Continue",
      lifecycle: lifecycles[2]!,
      value: true,
      yesLabel: "Yes",
      noLabel: "No",
    },
    {
      kind: "select",
      label: "One",
      lifecycle: lifecycles[0]!,
      options: [],
      highlightedIndex: 0,
    },
    {
      kind: "multiselect",
      label: "Many",
      lifecycle: lifecycles[0]!,
      options: [],
      highlightedIndex: 0,
      selectedIds: [],
    },
    {
      kind: "search",
      label: "Find",
      lifecycle: lifecycles[0]!,
      query: "",
      cursor: 0,
      results: [],
    },
    {
      kind: "autocomplete",
      label: "Complete",
      lifecycle: lifecycles[0]!,
      value: "",
      cursor: 0,
      suggestions: [],
      highlightedIndex: 0,
    },
    {
      kind: "textarea",
      label: "Notes",
      lifecycle: lifecycles[3]!,
      value: "",
      cursor: 0,
      rows: 5,
    },
    { kind: "spinner", label: "Work", lifecycle: lifecycles[0]!, phase: 3 },
    {
      kind: "determinate-progress",
      label: "Work",
      lifecycle: lifecycles[2]!,
      completed: 4,
      total: 4,
    },
    {
      kind: "sequential-form",
      label: "Setup",
      lifecycle: lifecycles[0]!,
      activePhase: 2,
      beaconPhase: 7,
      sections: [{ id: "verify", label: "Verify", status: "active" }],
    },
  ];
  assertEquals(frames.map((frame) => frame.kind), [
    "text-input",
    "masked-input",
    "confirm",
    "select",
    "multiselect",
    "search",
    "autocomplete",
    "textarea",
    "spinner",
    "determinate-progress",
    "sequential-form",
  ]);
  assertEquals((frames[8] as { phase: number }).phase, 3);
  assertEquals((frames[9] as { completed: number }).completed, 4);
});
