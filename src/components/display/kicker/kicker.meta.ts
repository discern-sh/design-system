import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";
const meta = {
  name: "Kicker",
  slug: "kicker",
  group: "Display",
  order: 50,
  description: "Uppercase annotation label with an optional index.",
  cli: { stance: "rendered" },
  useWhen: [
    "A short uppercase label, optionally indexed, introduces a heading or block: a category, a step number, or a series name.",
  ],
  notWhen: [
    "Use Badge for a status or count rather than an introductory label.",
    "Use Tag for metadata attached to content rather than a label that introduces it.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Plain" },
  { id: "indexed", label: "Indexed" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
