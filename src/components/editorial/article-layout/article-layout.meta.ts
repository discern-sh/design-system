import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Article layout",
  slug: "article-layout",
  group: "Editorial",
  order: 20,
  cli: { stance: "rendered" },
  behaviors: ["article-navigation"],
  description:
    "Responsive long-form reading shell with optional navigation and contextual rail around a primary article column.",
  purposes: ["building-documentation"],
  useWhen: [
    "A long-form article needs a primary reading column with optional navigation and a contextual rail that stack when width is limited.",
    "Fragment links into headings and footnotes must restore focus and visible targets during browser history traversal.",
  ],
  notWhen: [
    "Use Container when a page needs only a centred reading measure without navigation or a contextual rail.",
  ],
  accessibility: [
    "The primary reading stream is an article; optional rails are labelled complementary landmarks.",
    "Source order keeps navigation, article, and supporting context understandable without the visual grid.",
    "Columns respond to the allocated width; navigation and context stack around the reading column when space is limited.",
    "With fixed or sticky consumer chrome, set --discern-article-sticky-offset from its occupied height and set scroll-padding-block-start on the actual scroll container. The default assumes no covering header.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [{
  id: "default",
  label: "Contextual reading layout",
}] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
