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
  accessibility: [
    "A validation error comes from a wrapping Field, which the control names through aria-describedby; the description stays for guidance.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Off" },
  {
    id: "multiline",
    label: "Multiline label",
    only: "web",
    reason:
      "A long label wraps beside the browser track; the terminal Switch heading is a single truncated frame row.",
  },
  { id: "active", label: "Active" },
  { id: "filled", label: "On" },
  { id: "validation-error", label: "Validation error" },
  { id: "disabled", label: "Disabled" },
  { id: "submitted", label: "Submitted" },
  { id: "cancelled", label: "Cancelled" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
