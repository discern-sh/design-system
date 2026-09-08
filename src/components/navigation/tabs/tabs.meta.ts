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
    "Long labels and crowded strips wrap within local width. Keyboard order continues in DOM order across rows; selection is never clipped offscreen.",

    "Arrow keys, Home, End, Enter, and Space follow the ARIA tabs pattern.",
    "Tabs and panels have deterministic labelled relationships.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Overview selected" },
  { id: "details", label: "Details selected" },
  { id: "manual", label: "Manual activation" },
  { id: "crowded", label: "Long labels, last selected" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
