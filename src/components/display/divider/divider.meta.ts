import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";
const meta = {
  name: "Divider",
  slug: "divider",
  group: "Display",
  order: 30,
  description: "Quiet editorial rule with an optional annotation label.",
  cli: { stance: "rendered" },
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Rule" },
    { id: "labelled", label: "Labelled" },
  ],
);

export default meta;
