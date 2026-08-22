import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Harmonic backdrop",
  slug: "harmonic-backdrop",
  group: "Artwork",
  order: 120,
  description:
    "Fine grains disperse and settle into two nodal modes across the full backdrop.",
  cli: {
    stance: "exempt",
    reason:
      "Decorative scalable browser artwork has no semantic terminal equivalent.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "A broad canvas needs a fine atmospheric field whose motion periodically resolves into structure.",
  ],
  notWhen: [
    "The grain positions would be read as measured evidence or a physical simulation.",
  ],
  accessibility: [
    "The composition is always hidden from assistive technology and never receives focus.",
    "Reduced-motion preferences preserve the complete authored still rather than an empty state.",
    "Forced-colour modes omit the decorative layer so foreground content remains unambiguous.",
  ],
} satisfies ComponentMeta;
