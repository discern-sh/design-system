import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";
const meta = {
  name: "Tabs",
  slug: "tabs",
  group: "Navigation",
  order: 10,
  description:
    "Controlled or uncontrolled tab set with roving focus and complete horizontal keyboard navigation.",
  cli: { stance: "rendered" },
  accessibility: [
    "Arrow keys, Home, End, Enter, and Space follow the ARIA tabs pattern.",
    "Tabs and panels have deterministic labelled relationships.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Overview selected" },
    { id: "details", label: "Details selected" },
    { id: "manual", label: "Manual activation" },
  ],
);

export default meta;
