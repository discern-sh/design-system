import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Decision record",
  slug: "decision-record",
  group: "Workflow",
  order: 350,
  description:
    "Architecture decision record rendered as an honest article with title, accepted or superseded status, date, context, decision, and consequences.",
  accessibility: [
    "Status is visible text in the composed Badge and never relies on colour.",
    "The record date uses a semantic time element with a machine-readable value.",
    "Context, decision, and consequences are labelled sections in source order.",
  ],
} satisfies ComponentMeta;
