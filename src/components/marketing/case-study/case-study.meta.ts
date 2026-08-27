import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Case study",
  slug: "case-study",
  group: "Marketing",
  order: 110,
  description:
    "Long-form proof block pairing a customer narrative with visual evidence and compact outcome metrics.",
  cli: { stance: "rendered" },
  accessibility: [
    "The story is an article and the supporting figures use a description list.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [{
  id: "default",
  label: "Proof story",
}] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
