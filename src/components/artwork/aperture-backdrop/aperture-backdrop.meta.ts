import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Aperture backdrop",
  slug: "aperture-backdrop",
  group: "Artwork",
  order: 50,
  description:
    "Off-centre triangular opening that admits three unequal raking beams.",
  cli: {
    stance: "exempt",
    reason:
      "Decorative scalable browser artwork has no semantic terminal equivalent.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "A section needs an atmospheric incident concentrated across its upper band.",
  ],
  notWhen: [
    "The visual must cover the full height with an even texture.",
  ],
  accessibility: [
    "The composition is always hidden from assistive technology and never receives focus.",
    "Reduced-motion preferences preserve the complete authored still rather than an empty state.",
    "Forced-colour modes omit the decorative layer so foreground content remains unambiguous.",
  ],
} satisfies ComponentMeta;
