import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Procedure step",
  slug: "procedure-step",
  group: "Workflow",
  order: 120,
  description:
    "One operational action with composed command and expected proof, an optional completion criterion, branch point, and explicitly labelled recovery slot.",
  accessibility: [
    "Procedure supplies each step's native ordered-list position; the step does not replace that sequence with decorative numbering.",
    "Commands and expected results compose the Workflow components that preserve executable input and observable proof.",
    "Completion, branching, and recovery content each carries a visible text label.",
  ],
} satisfies ComponentMeta;
