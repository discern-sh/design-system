import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Checkbox",
  slug: "checkbox",
  group: "Forms",
  order: 50,
  description:
    "Native checkbox with an associated visible label and optional description.",
  cli: { stance: "rendered" },
  accessibility: [
    "A validation error comes from a wrapping Field, which the control names through aria-describedby; the description stays for guidance.",
  ],
  classBlocks: ["choice"],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Unchecked" },
  { id: "grouped", label: "Grouped choices" },
  { id: "multiline", label: "Multiline label" },
  { id: "active", label: "Active" },
  { id: "filled", label: "Checked" },
  { id: "validation-error", label: "Validation error" },
  { id: "disabled", label: "Disabled" },
  { id: "submitted", label: "Submitted" },
  { id: "cancelled", label: "Cancelled" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
