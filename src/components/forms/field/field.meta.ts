import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Field",
  slug: "field",
  group: "Forms",
  order: 10,
  description:
    "Shared label, hint, required, and error structure for single controls and choice groups.",
  cli: { stance: "rendered" },
  accessibility: [
    "Labels and messages use deterministic control IDs.",
    "An error keeps the hint readable; the control's described-by names the error first, then the hint.",
    "An error leads with the decorative danger mark that feedback notices share and a visually hidden prefix, so it never depends on colour.",
    "A group renders a fieldset whose legend names its options; its hint follows the legend, before the options it governs, and its hint and error describe the whole group. A group nested in another becomes a subgroup with a quieter legend.",
  ],
  classBlocks: ["field-row"],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Idle" },
  { id: "active", label: "Active" },
  { id: "filled", label: "Filled" },
  { id: "validation-error", label: "Validation error" },
  { id: "disabled", label: "Disabled" },
  { id: "submitted", label: "Submitted" },
  { id: "cancelled", label: "Cancelled" },
  { id: "acknowledgement", label: "Acknowledgement" },
  {
    id: "group",
    label: "Choice group",
    only: "web",
    reason:
      "A browser fieldset gathers independent native choices under one legend; the terminal presents choice groups as Checkbox and Radio selection frames.",
  },
  {
    id: "mixed-form",
    label: "Mixed form",
    only: "web",
    reason:
      "A simultaneous multi-field layout with shared alignment rows has no CLI equivalent; the terminal presents one sequential form frame at a time.",
  },
  {
    id: "inline-form",
    label: "Inline form",
    only: "web",
    reason:
      "Browser grid columns seat fields beside a neighbouring action; the terminal renders one full-width frame per interaction.",
  },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
