import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Stack",
  slug: "stack",
  group: "Layout",
  order: 20,
  description:
    "Vertical composition using token-constrained gaps and explicit alignment.",
  cli: { stance: "rendered" },
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Stack" },
    { id: "centred", label: "Centred" },
  ],
);

export default meta;
