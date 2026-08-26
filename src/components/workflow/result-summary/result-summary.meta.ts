import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Result summary",
  slug: "result-summary",
  group: "Workflow",
  order: 210,
  cli: { stance: "rendered" },
  description:
    "One tool result fact stated in plain language, with supporting counts, duration, next action, and an optional adapter-only copy of its machine-readable form.",
  purposes: [
    "building-documentation",
    "displaying-tool-output",
    "procedural-workflow",
  ],
  useWhen: [
    "One tool result needs a plain-language fact, supporting counts, duration, or next action.",
  ],
  notWhen: [
    "You need a durable report recording several checks and branch or commit metadata; use Verification report.",
  ],
  accessibility: [
    "Every state appears as a visible word; semantic colour and markers only reinforce it.",
    "The primary fact and optional next action remain complete text in source order without relying on layout or terminal conventions.",
    "Supporting figures use a definition list, keeping each label programmatically bound to its value.",
    "The adapter-only machine-data copy action announces completion politely and leaves focus on the button.",
  ],
} satisfies ComponentMeta;
