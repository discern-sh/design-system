import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Compression backdrop",
  slug: "compression-backdrop",
  group: "Artwork",
  order: 110,
  description:
    "Ticked ribbon whose concertina fold compresses while its flat runs preserve the apparent length.",
  cli: {
    stance: "exempt",
    reason:
      "Decorative scalable browser artwork has no semantic terminal equivalent.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "A wide surface needs one measured linear gesture with slow, material movement.",
  ],
  notWhen: [
    "The background needs an even texture across the complete canvas.",
  ],
  accessibility: [
    "The composition is always hidden from assistive technology and never receives focus.",
    "Reduced-motion preferences preserve the complete authored still rather than an empty state.",
    "Forced-colour modes omit the decorative layer so foreground content remains unambiguous.",
  ],
} satisfies ComponentMeta;
