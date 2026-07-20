import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Logo",
  slug: "logo",
  group: "Core",
  order: 60,
  description:
    "Adaptive logo wrapper for text glyphs, injected graphics, and wide or square marks.",
  accessibility: [
    "Omit label when the logo is decorative beside a visible brand name; provide label only when the logo carries the identity by itself.",
    "Injected images should use empty alternative text because the wrapper owns the accessible label.",
  ],
} satisfies ComponentMeta;
