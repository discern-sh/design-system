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
  useWhen: [
    "A quotation from the surrounding text or a named source should interrupt the reading rhythm as a typographic feature, within the measure or breaking wide.",
    "The quotation carries authored quote marks, attribution, or a citation.",
  ],
  notWhen: [
    "Use Blockquote for quoted material that contains ordinary document blocks and needs no display treatment.",
    "Use Testimonial for a customer quote whose job is trust on a marketing page.",
  ],
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
