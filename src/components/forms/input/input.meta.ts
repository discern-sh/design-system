import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Input",
  slug: "input",
  group: "Forms",
  order: 20,
  description:
    "Native input with typed label, help, required, and invalid relationships.",
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
  { id: "searching", label: "Searching" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
