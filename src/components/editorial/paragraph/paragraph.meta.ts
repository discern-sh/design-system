import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Paragraph",
  slug: "paragraph",
  group: "Editorial",
  order: 45,
  cli: { stance: "rendered" },
  description:
    "One semantic paragraph with package reading typography and safe, width-aware rich inline content in terminals.",
  purposes: ["building-documentation"],
  useWhen: [
    "One prose paragraph is the semantic unit, including rich phrasing such as emphasis, links, and inline code.",
  ],
  notWhen: [
    "Use Prose when several paragraphs, headings, and lists need one long-form reading context.",
    "Use Callout when the content is a highlighted aside rather than ordinary body prose.",
    "Use Heading when the text introduces a section in the document hierarchy.",
    "Use Code listing for source with line structure, or an ordinary preformatted element when whitespace must remain arbitrary.",
  ],
  accessibility: [
    "The React adapter renders a native paragraph and leaves phrasing semantics to its children.",
    "The terminal renderer retains code delimiters, link targets, image alternatives and sources, and footnote markers without relying on colour.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [{ id: "default", label: "Rich inline paragraph" }],
);

export default meta;
