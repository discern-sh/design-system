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
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Labelled section" },
  { id: "sunken", label: "Sunken" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
