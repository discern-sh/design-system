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
  useWhen: [
    "Blocks should follow each other vertically with one token-constrained gap and explicit alignment, with the Stack owning the spacing between them.",
  ],
  notWhen: [
    "Use Cluster for items that flow horizontally and wrap, such as actions or tags.",
    "Use Grid when items should share responsive columns rather than a single vertical run.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Stack" },
  { id: "centred", label: "Centred" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
