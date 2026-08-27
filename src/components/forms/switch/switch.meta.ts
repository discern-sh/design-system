import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Switch",
  slug: "switch",
  group: "Forms",
  order: 70,
  description:
    "Native checkbox exposed as a switch, with associated label and description.",
  cli: { stance: "rendered" },
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Off" },
    { id: "active", label: "Active" },
    { id: "filled", label: "On" },
    { id: "validation-error", label: "Validation error" },
    { id: "disabled", label: "Disabled" },
    { id: "submitted", label: "Submitted" },
    { id: "cancelled", label: "Cancelled" },
  ],
);

export default meta;
