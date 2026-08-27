import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Related content",
  slug: "related-content",
  group: "Editorial",
  order: 120,
  cli: { stance: "rendered" },
  description:
    "Continuation band for related essays, guides, reports, or issues, with enough context to make each next-reading choice meaningful.",
  accessibility: [
    "Every recommendation is a headed article and its title is the primary descriptive link.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [{ id: "default", label: "Related reading" }],
);

export default meta;
