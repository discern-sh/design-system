import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Footnotes",
  slug: "footnotes",
  group: "Editorial",
  order: 110,
  cli: { stance: "rendered" },
  description:
    "End-note definitions with stable identities, rich multi-block bodies, and one or more explicit return links.",
  purposes: ["building-documentation"],
  useWhen: [
    "Definitions complete inline footnote references and may contain rich phrasing, paragraphs, lists, quotations, or code.",
  ],
  notWhen: [
    "Use List for an ordinary sequence whose items do not define bidirectional document references.",
    "Use Prose or Paragraph for reading content that is not an end-note definition.",
  ],
  accessibility: [
    "Notes remain a native ordered list with unique stable ids, and every return link carries a descriptive accessible label.",
    "Repeated references receive separate return targets in source order rather than collapsing to one ambiguous link.",
    "Terminal definitions retain visible positional labels and return targets in no-colour and ASCII output.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Source notes" },
  { id: "rich-multi-block", label: "Rich multi-block notes" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
