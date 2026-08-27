import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Docs header",
  slug: "docs-header",
  group: "Docs",
  order: 20,
  cli: { stance: "rendered" },
  description:
    "Sticky translucent documentation top bar with brand, middle, and action regions.",
  purposes: ["building-documentation"],
  accessibility: [
    "The header element is a banner landmark; slotted controls keep their own semantics and focus outlines.",
    "The translucent surface keeps token-driven text contrast over scrolled content in both themes.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [{ id: "default", label: "Documentation header" }],
);

export default meta;
