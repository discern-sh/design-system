import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";
const meta = {
  name: "Card",
  slug: "card",
  group: "Display",
  order: 20,
  description:
    "Composable surface with explicit elevation, texture, and padding choices.",
  cli: { stance: "rendered" },
  purposes: ["marketing-site"],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Plain" },
    { id: "raised", label: "Raised" },
    { id: "dotted", label: "Dotted texture" },
  ],
);

export default meta;
