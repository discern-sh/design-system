import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Narrative chapter",
  slug: "narrative-chapter",
  group: "Marketing",
  order: 170,
  description:
    "Calm two-part reading section for explaining a substantial idea without adding visual burden.",
  cli: {
    stance: "exempt",
    reason:
      "Its distinguishing contract is a responsive browser reading measure with a parallel editorial introduction and optional aside; terminal prose should remain in one linear reading flow.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "A landing page must explain a complex idea in several paragraphs and needs hierarchy, measure, and relief more than another product visual.",
  ],
  notWhen: [
    "The section can be understood as a short sequence, comparison, or single outcome; use a component that compresses the information instead.",
  ],
  accessibility: [
    "The introduction precedes the complete reading flow in source order.",
    "The optional supporting context uses a labelled native aside and remains supplementary when the layout becomes one column.",
    "The heading rank is explicit so the chapter preserves the surrounding document outline.",
  ],
} satisfies ComponentMeta;
