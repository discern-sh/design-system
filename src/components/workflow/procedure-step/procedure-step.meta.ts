import type { ComponentMeta } from "../../../types/component-meta.ts";
import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";

const meta = {
  name: "Procedure step",
  slug: "procedure-step",
  group: "Workflow",
  order: 120,
  cli: { stance: "rendered" },
  description:
    "One operational action with composed command and expected proof, an optional completion criterion, branch point, and explicitly labelled recovery slot.",
  purposes: ["building-documentation", "procedural-workflow"],
  useWhen: [
    "One ordered Procedure step needs an action, command, expected proof, completion criterion, branch, or recovery route.",
  ],
  notWhen: [
    "The action stands alone and has no sequence context; use Command or ordinary prose.",
  ],
  accessibility: [
    "Procedure supplies each step's native ordered-list position; the step does not replace that sequence with decorative numbering.",
    "Commands and expected results compose the Workflow components that preserve executable input and observable proof.",
    "Completion, branching, and recovery content each carries a visible text label.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Command step" },
    { id: "branch", label: "Branching step" },
    { id: "active", label: "Active step" },
  ],
);

export default meta;
