import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Retry notice",
  slug: "retry-notice",
  group: "Workflow",
  order: 150,
  description:
    "Compact idempotence statement that says whether an interrupted action is safe to repeat and explains why.",
  purposes: ["building-documentation", "procedural-workflow"],
  useWhen: [
    "A retry instruction must state whether repeating an interrupted action is safe and why.",
  ],
  notWhen: [
    "The message is a general warning or live failure without an idempotence decision.",
  ],
  accessibility: [
    "The safe or unsafe instruction is written in the visible label and never conveyed by colour alone.",
    "The neutral note role avoids announcing static retry guidance as a live status.",
    "Unsafe guidance uses the warning role rather than success or danger decoration.",
  ],
} satisfies ComponentMeta;
