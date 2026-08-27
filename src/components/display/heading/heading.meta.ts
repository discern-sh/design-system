import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";
const meta = {
  name: "Heading",
  slug: "heading",
  group: "Display",
  order: 40,
  description:
    "Native level-aware heading with React phrasing content and rich, lossless terminal wrapping.",
  useWhen: [
    "A titled section needs a real heading level in the document outline.",
    "Rich inline meaning or a complete long title must survive terminal wrapping.",
  ],
  notWhen: [
    "Use Kicker or ordinary lead text when the copy labels content without establishing a section.",
  ],
  accessibility: [
    "Choose levels 1–6 for semantic outline order; accent treatment never replaces the heading level.",
    "Terminal wrapping preserves the complete label and aligns continuations beneath its content prefix.",
  ],
  cli: { stance: "rendered" },
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Section heading" },
    { id: "accent", label: "Accented phrase" },
    { id: "rich-content", label: "Rich inline content" },
  ],
);

export default meta;
