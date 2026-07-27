import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Result summary",
  slug: "result-summary",
  group: "Workflow",
  order: 210,
  description:
    "One tool outcome stated in plain language, with supporting counts, duration, next action, and an optional adapter-only copy of its machine-readable form.",
  accessibility: [
    "Passed, failed, blocked, changed, and unchanged appear as visible words; semantic colour only reinforces them.",
    "The primary fact and optional next action remain complete text in source order without relying on layout or terminal conventions.",
    "Supporting figures use a definition list, keeping each label programmatically bound to its value.",
    "The adapter-only machine-data copy action announces completion politely and leaves focus on the button.",
  ],
} satisfies ComponentMeta;
