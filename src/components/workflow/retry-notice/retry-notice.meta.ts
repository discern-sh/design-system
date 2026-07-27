import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Retry notice",
  slug: "retry-notice",
  group: "Workflow",
  order: 150,
  description:
    "Compact idempotence statement that says whether an interrupted action is safe to repeat and explains why.",
  accessibility: [
    "The safe or unsafe instruction is written in the visible label and never conveyed by colour alone.",
    "The neutral note role avoids announcing static retry guidance as a live status.",
    "Unsafe guidance uses the warning role rather than success or danger decoration.",
  ],
} satisfies ComponentMeta;
