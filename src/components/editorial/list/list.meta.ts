import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "List",
  slug: "list",
  group: "Editorial",
  order: 47,
  cli: { stance: "rendered" },
  description:
    "Neutral unordered, ordered, and read-only task lists with rich inline content and nested structural blocks.",
  purposes: ["building-documentation"],
  useWhen: [
    "Content is an ordinary unordered, ordered, mixed, nested, or read-only task list without a narrower editorial or workflow meaning.",
  ],
  notWhen: [
    "Use Procedure for executable operational steps with completion evidence.",
    "Use Prerequisite list for requirements whose readiness state must be explicit.",
    "Use Key points for a curated editorial summary rather than an ordinary list.",
    "Use Checkbox for an interactive form control; List task markers are disabled, read-only document state.",
  ],
  accessibility: [
    "The React adapter preserves native unordered or ordered list and list-item semantics at every nesting level.",
    "Task markers are disabled, read-only native checkboxes; items without a task state remain ordinary list items.",
    "Terminal task states remain distinct through marker shape in Unicode, ASCII, and no-colour output.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Nested list" },
    { id: "task-mixed", label: "Mixed task list" },
  ],
);

export default meta;
