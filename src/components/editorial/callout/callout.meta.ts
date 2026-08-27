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
  accessibility: [
    "The callout is exposed as a note landmark with a real heading and never relies on colour alone for meaning.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Insight" },
  { id: "warning", label: "Warning" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
