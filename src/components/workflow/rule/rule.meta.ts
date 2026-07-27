import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Rule",
  slug: "rule",
  group: "Workflow",
  order: 360,
  description:
    "One binding project instruction with explicit origin and scope, presented as neutral authority rather than warning or diagnostic chrome.",
  purposes: ["building-documentation", "displaying-tool-output"],
  useWhen: [
    "A binding instruction must state its origin and scope as neutral project authority.",
  ],
  notWhen: [
    "The content explains why a direction was chosen; use Decision record.",
  ],
  accessibility: [
    "The binding instruction, origin, and scope are all visible text in source order.",
    "The accent edge reinforces authority without carrying meaning on its own.",
  ],
} satisfies ComponentMeta;
