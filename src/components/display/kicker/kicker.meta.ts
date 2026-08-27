import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";
const meta = {
  name: "Kicker",
  slug: "kicker",
  group: "Display",
  order: 50,
  description: "Uppercase annotation label with an optional index.",
  cli: { stance: "rendered" },
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Plain" },
  { id: "indexed", label: "Indexed" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
