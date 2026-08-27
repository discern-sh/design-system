import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Icon button",
  slug: "icon-button",
  group: "Core",
  order: 30,
  description:
    "Square icon action with a required accessible label and injected graphic.",
  cli: { stance: "rendered" },
  accessibility: [
    "A text label is required even when only an icon is visible.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Quiet" },
  { id: "outline", label: "Outline" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
