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
  accessibility: [
    "The heading level is explicit so the opener can lead a page or sit inside a larger publication.",
    "Author information uses address semantics and decorative initials stay hidden from assistive technology.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [{ id: "default", label: "Article opener" }],
);

export default meta;
