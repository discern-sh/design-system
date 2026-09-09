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
  accessibility: [
    "Card is a passive surface; compose a heading, essential content, secondary metadata, and a named native action in that reading order. Do not wrap nested actions in another link or button.",
    "Nested Cards stay flat; use neutral Badge and Tag metadata so it does not compete with the title or action.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Plain" },
  { id: "raised", label: "Raised" },
  { id: "dotted", label: "Dotted texture" },
  { id: "crowded", label: "Crowded content" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
