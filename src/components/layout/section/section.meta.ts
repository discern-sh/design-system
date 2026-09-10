import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";
const meta = {
  name: "Section",
  slug: "section",
  group: "Layout",
  order: 50,
  description:
    "Semantic page section with tokenized surface and vertical rhythm.",
  cli: { stance: "rendered" },
  purposes: ["marketing-site"],
  useWhen: [
    "A page region needs semantic section boundaries, a tokenized surface, and consistent vertical rhythm between regions.",
  ],
  notWhen: [
    "Use Container alone when the region needs a readable width but no surface or rhythm of its own.",
    "Use Card for a bounded surface among peers rather than a full-width page region.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Labelled section" },
  { id: "sunken", label: "Sunken" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
