import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Cleave backdrop",
  slug: "cleave-backdrop",
  group: "Artwork",
  order: 80,
  description:
    "Oversized split geometry that leaves two low-contrast surfaces meeting at one median.",
  cli: {
    stance: "exempt",
    reason:
      "Decorative scalable browser artwork has no semantic terminal equivalent.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "A restrained full-bleed field needs area and tension rather than repeated linework.",
  ],
  notWhen: [
    "The section needs an intricate texture or strongly animated focal point.",
  ],
  accessibility: [
    "The composition is always hidden from assistive technology and never receives focus.",
    "Reduced-motion preferences preserve the complete authored still rather than an empty state.",
    "Forced-colour modes omit the decorative layer so foreground content remains unambiguous.",
  ],
} satisfies ComponentMeta;
