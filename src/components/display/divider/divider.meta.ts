import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";
const meta = {
  name: "Divider",
  slug: "divider",
  group: "Display",
  order: 30,
  description: "Quiet editorial rule with an optional annotation label.",
  cli: { stance: "rendered" },
  useWhen: [
    "Two runs of content need a quiet visual separation, optionally annotated with a short label such as a date or a section name.",
  ],
  notWhen: [
    "Use Section boundaries and heading rhythm when the separation is structural rather than a visual pause.",
    "Use Kicker for a label that introduces the content below rather than separating two runs.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Rule" },
  { id: "labelled", label: "Labelled" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
