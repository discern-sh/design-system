import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Prerequisite list",
  slug: "prerequisite-list",
  group: "Workflow",
  order: 130,
  description:
    "Requirements checked before a procedure begins, distinguishing satisfied and unresolved states in visible text, shape, and semantic list order.",
  purposes: ["building-documentation", "procedural-workflow"],
  useWhen: [
    "Readers must verify requirements before starting an operational procedure.",
  ],
  notWhen: [
    "The items are actions to perform in order; use Procedure steps.",
  ],
  accessibility: [
    "Every satisfied or unresolved state appears as visible text; colour and marker shape only reinforce it.",
    "Requirements remain an unordered list without component styles.",
    "Success colour is reserved for prerequisites that have actually been verified.",
  ],
} satisfies ComponentMeta;
