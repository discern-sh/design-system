import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Radio",
  slug: "radio",
  group: "Forms",
  order: 60,
  description: "Native radio option sharing the labelled Choice structure.",
  cli: { stance: "rendered" },
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Idle" },
    { id: "grouped", label: "Grouped choices" },
    { id: "active", label: "Active" },
    { id: "filled", label: "Selected" },
    { id: "validation-error", label: "Validation error" },
    { id: "disabled", label: "Disabled" },
    { id: "submitted", label: "Submitted" },
    { id: "cancelled", label: "Cancelled" },
  ],
);

export default meta;
