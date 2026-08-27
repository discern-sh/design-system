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
  accessibility: ["Labels and messages use deterministic control IDs."],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Idle" },
    { id: "active", label: "Active" },
    { id: "filled", label: "Filled" },
    { id: "validation-error", label: "Validation error" },
    { id: "disabled", label: "Disabled" },
    { id: "submitted", label: "Submitted" },
    { id: "cancelled", label: "Cancelled" },
    { id: "acknowledgement", label: "Acknowledgement" },
  ],
);

export default meta;
