import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Prose",
  slug: "prose",
  group: "Editorial",
  order: 40,
  cli: { stance: "rendered" },
  description:
    "Long-form reading context that composes semantic paragraphs and structural blocks at a shared measure without parsing or flattening them.",
  purposes: ["building-documentation"],
  useWhen: [
    "Several paragraphs, headings, lists, quotations, or code blocks need one readable long-form measure and optional opening treatment.",
  ],
  notWhen: [
    "Use Paragraph when one semantic unit of body prose is the complete content.",
    "Use Heading when the content introduces document hierarchy rather than supplying a reading context.",
  ],
  accessibility: [
    "The adapter adds no document hierarchy; authors keep full control of semantic headings and content order.",
    "Readable measure and generous line height persist across all variants.",
    "The terminal rich path preserves child Component structure, inline meaning, hyperlink targets, hard breaks, and paragraph boundaries without relying on colour.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Lead prose" },
    { id: "rich-structure", label: "Rich document structure" },
  ],
);

export default meta;
