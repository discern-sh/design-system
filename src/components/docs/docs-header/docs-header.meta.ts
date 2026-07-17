import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Docs header",
  slug: "docs-header",
  group: "Docs",
  order: 20,
  description:
    "Sticky translucent documentation top bar with brand, middle, and action regions.",
  accessibility: [
    "The header element is a banner landmark; slotted controls keep their own semantics and focus outlines.",
    "The translucent surface keeps token-driven text contrast over scrolled content in both themes.",
  ],
} satisfies ComponentMeta;
