import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Article layout",
  slug: "article-layout",
  group: "Editorial",
  order: 20,
  cli: { stance: "rendered" },
  description:
    "Responsive long-form reading shell with optional navigation and contextual rail around a primary article column.",
  purposes: ["building-documentation"],
  accessibility: [
    "The primary reading stream is an article; optional rails are labelled complementary landmarks.",
    "Source order keeps navigation, article, and supporting context understandable without the visual grid.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [{
  id: "default",
  label: "Contextual reading layout",
}] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
