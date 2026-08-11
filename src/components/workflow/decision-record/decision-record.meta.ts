import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Decision record",
  slug: "decision-record",
  group: "Workflow",
  order: 350,
  cli: { stance: "rendered" },
  description:
    "Architecture decision record rendered as an honest article with title, accepted or superseded status, date, context, decision, and consequences.",
  purposes: ["building-documentation", "displaying-tool-output"],
  useWhen: [
    "A significant decision needs its status, date, context, chosen direction, and consequences recorded together.",
  ],
  notWhen: [
    "The content is a binding instruction without decision history; use Rule.",
  ],
  accessibility: [
    "Status is visible text in the composed Badge and never relies on colour.",
    "The record date uses a semantic time element with a machine-readable value.",
    "Context, decision, and consequences are labelled sections in source order.",
  ],
} satisfies ComponentMeta;
