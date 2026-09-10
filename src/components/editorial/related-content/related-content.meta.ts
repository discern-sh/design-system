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
  useWhen: [
    "An article ends with a small set of next readings, each carrying enough title, description, and metadata to make the choice meaningful.",
  ],
  notWhen: [
    "Use Pager for the single previous and next page in a fixed reading order.",
    "A site-wide index or search belongs to the consumer's navigation, not to a continuation band.",
  ],
  accessibility: [
    "Every recommendation is a headed article and its title is the primary descriptive link.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [{
  id: "default",
  label: "Related reading",
}] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
