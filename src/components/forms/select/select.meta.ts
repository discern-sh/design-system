import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Select",
  slug: "select",
  group: "Forms",
  order: 40,
  description:
    "Native browser select and terminal single-choice list, including a focused action menu with contextual detail.",
  cli: { stance: "rendered" },
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Idle" },
  { id: "grouped", label: "Grouped options" },
  { id: "active", label: "Active" },
  {
    id: "menu",
    label: "Action menu",
    only: "cli",
    reason:
      "Native HTML select popups cannot contain independently styled row annotations and a focus-driven contextual detail region.",
  },
  { id: "filled", label: "Selected" },
  { id: "validation-error", label: "Validation error" },
  { id: "disabled", label: "Disabled" },
  { id: "submitted", label: "Submitted" },
  { id: "cancelled", label: "Cancelled" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
