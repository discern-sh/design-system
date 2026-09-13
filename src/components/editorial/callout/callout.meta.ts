import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Callout",
  slug: "callout",
  group: "Editorial",
  order: 70,
  cli: { stance: "rendered" },
  description:
    "Inset editorial note for context, interpretation, cautions, and successful outcomes without breaking the reading flow.",
  useWhen: [
    "An inset note offers context, interpretation, a caution, or a confirmed outcome beside the prose without breaking the reading flow.",
    "The note has a heading and a semantic tone the reader should recognise at a glance.",
  ],
  notWhen: [
    "Use Banner for a page-level status message that sits outside the reading flow.",
    "Use Diagnostic for a machine-produced finding with location, severity, and evidence.",
    "Use Blockquote or Pull quote for quoted material rather than an editorial note.",
  ],
  accessibility: [
    "The callout is exposed as a non-live note with a real heading and a named visible tone glyph, including when custom artwork is supplied.",
    "Optional actions follow the body in reading order; the consumer owns their behaviour and announcement policy.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Insight" },
  { id: "warning", label: "Warning" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
