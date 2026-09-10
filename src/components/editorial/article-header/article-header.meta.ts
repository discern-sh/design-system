import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Article header",
  slug: "article-header",
  group: "Editorial",
  order: 10,
  cli: { stance: "rendered" },
  description:
    "Publication-scale opening for essays, reports, guides, and premium long-form pages, with byline, metadata, actions, and optional cover media.",
  useWhen: [
    "An essay, report, guide, or premium long-form page opens with a title, standfirst, byline, and metadata before the reading column begins.",
    "A cover image or publication actions belong to the page opening rather than to the body.",
  ],
  notWhen: [
    "Use Docs header for persistent documentation chrome that stays visible across pages.",
    "Use Marketing stage for a product landing opener whose job is conversion rather than reading.",
  ],
  accessibility: [
    "The heading level is explicit so the opener can lead a page or sit inside a larger publication.",
    "Author information uses address semantics and decorative initials stay hidden from assistive technology.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [{
  id: "default",
  label: "Article opener",
}] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
