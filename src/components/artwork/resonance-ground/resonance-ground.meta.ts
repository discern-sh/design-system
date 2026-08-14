import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Resonance ground",
  slug: "resonance-ground",
  group: "Artwork",
  order: 90,
  description:
    "Intersecting wave fields joined by a narrow shared contour and one travelling interval.",
  cli: {
    stance: "exempt",
    reason:
      "Decorative scalable browser artwork has no semantic terminal equivalent.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "A quiet background needs flowing structure and a restrained point of motion.",
  ],
  notWhen: [
    "The composition must explain a real signal, relationship, or data model.",
  ],
  accessibility: [
    "The composition is always hidden from assistive technology and never receives focus.",
    "Reduced-motion preferences preserve the complete authored still rather than an empty state.",
    "Forced-colour modes omit the decorative layer so foreground content remains unambiguous.",
  ],
} satisfies ComponentMeta;
