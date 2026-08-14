import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Impression ground",
  slug: "impression-ground",
  group: "Artwork",
  order: 60,
  description:
    "Configurable glyph lattice whose soft accent aperture follows the reader without script.",
  cli: {
    stance: "exempt",
    reason:
      "Decorative scalable browser artwork has no semantic terminal equivalent.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "A typographic field should respond softly to pointer position while remaining complete when still.",
  ],
  notWhen: [
    "The repeated mark carries semantic meaning or needs to be announced.",
  ],
  accessibility: [
    "The composition is always hidden from assistive technology and never receives focus.",
    "Reduced-motion preferences preserve the complete authored still rather than an empty state.",
    "Forced-colour modes omit the decorative layer so foreground content remains unambiguous.",
  ],
} satisfies ComponentMeta;
