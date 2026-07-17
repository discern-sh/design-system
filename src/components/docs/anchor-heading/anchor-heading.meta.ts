import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Anchor heading",
  slug: "anchor-heading",
  group: "Docs",
  order: 60,
  description:
    "Heading with a hover-revealed self link for direct section linking.",
  accessibility: [
    "The self link carries a configurable descriptive label rather than the bare section-mark glyph.",
    "The link stays keyboard reachable while visually hidden, becomes visible on focus, and is always visible on hoverless devices.",
  ],
} satisfies ComponentMeta;
