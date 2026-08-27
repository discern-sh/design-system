import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Kbd",
  slug: "kbd",
  group: "Docs",
  order: 70,
  cli: { stance: "rendered" },
  description:
    "Keycap-styled display of one keyboard key or chord segment using the semantic kbd element.",
  accessibility: [
    "The semantic kbd element identifies keyboard input to assistive technology without extra ARIA.",
    "Keycap text uses the interface face at the interface-text floor size and holds contrast in both themes.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Single key" },
  { id: "key-chord", label: "Key chord" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
