import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Textarea",
  slug: "textarea",
  group: "Forms",
  order: 30,
  description:
    "Resizable multiline input sharing the Field accessibility contract.",
  cli: { stance: "rendered" },
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Idle" },
  { id: "active", label: "Active" },
  { id: "filled", label: "Filled" },
  { id: "validation-error", label: "Validation error" },
  { id: "disabled", label: "Disabled" },
  { id: "submitted", label: "Submitted" },
  { id: "cancelled", label: "Cancelled" },
  { id: "tall-window", label: "Tall window" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
