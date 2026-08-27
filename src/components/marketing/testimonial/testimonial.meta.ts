import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Testimonial",
  slug: "testimonial",
  group: "Marketing",
  order: 100,
  description:
    "Editorial customer quote with attribution, optional portrait, and an adjacent measurable outcome.",
  cli: { stance: "rendered" },
  accessibility: [
    "Quotation and attribution use blockquote and figcaption semantics.",
    "Decorative quote marks and avatars are hidden from assistive technology.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [{ id: "default", label: "Wide quote" }],
);

export default meta;
