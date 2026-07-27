import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Task metadata",
  slug: "task-metadata",
  group: "Workflow",
  order: 410,
  description:
    "Quiet task-page orientation strip that labels outcome, audience, prerequisites, complexity, file effects, retry safety, and expected end state.",
  purposes: ["building-documentation", "procedural-workflow"],
  useWhen: [
    "An operational page must orient the reader before its procedure with a complete set of task facts.",
  ],
  notWhen: [
    "The task has already run and the page needs to summarize its outcome, counts, or duration; use Result summary.",
  ],
  accessibility: [
    "Every fact is paired with its visible term through definition-list semantics.",
    "File effects and retry safety are complete text, never colour-only states.",
    "The strip remains in source order and keeps every value visible when component styles are unavailable.",
  ],
} satisfies ComponentMeta;
