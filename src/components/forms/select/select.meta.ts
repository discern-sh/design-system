import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Select",
  slug: "select",
  group: "Forms",
  order: 40,
  description:
    "Styled native select with typed options and associated field messaging.",
  cli: { stance: "rendered" },
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Idle" },
  { id: "grouped", label: "Grouped options" },
  { id: "active", label: "Active" },
  { id: "filled", label: "Selected" },
  { id: "validation-error", label: "Validation error" },
  { id: "disabled", label: "Disabled" },
  { id: "submitted", label: "Submitted" },
  { id: "cancelled", label: "Cancelled" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
