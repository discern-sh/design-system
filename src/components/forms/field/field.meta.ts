import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Field",
  slug: "field",
  group: "Forms",
  order: 10,
  description:
    "Shared label, hint, required, and error structure for custom controls.",
  cli: { stance: "rendered" },
  accessibility: [
    "Labels and messages use deterministic control IDs.",
    "An error keeps the hint readable; the control's described-by names the error first, then the hint.",
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
