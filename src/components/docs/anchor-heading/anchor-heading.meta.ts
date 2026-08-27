import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Anchor heading",
  slug: "anchor-heading",
  group: "Docs",
  order: 60,
  cli: { stance: "rendered" },
  description:
    "Heading with a hover-revealed self link for direct section linking.",
  purposes: ["building-documentation"],
  accessibility: [
    "The self link carries a configurable descriptive label rather than the bare section-mark glyph.",
    "The link stays keyboard reachable while visually hidden, becomes visible on focus, and is always visible on hoverless devices.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Section heading" },
  { id: "nested-heading", label: "Nested heading" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
