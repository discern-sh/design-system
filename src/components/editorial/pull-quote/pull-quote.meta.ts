import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Pull quote",
  slug: "pull-quote",
  group: "Editorial",
  order: 60,
  cli: { stance: "rendered" },
  description:
    "Typographic quotation treatment that can stay within the reading measure or break wide for a deliberate change of pace.",
  accessibility: [
    "Quotation and attribution retain blockquote, figure, figcaption, and cite semantics.",
    "The oversized quotation mark is decorative and hidden from assistive technology.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [{
  id: "default",
  label: "Attributed quotation",
}] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
