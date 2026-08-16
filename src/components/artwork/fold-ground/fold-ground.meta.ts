import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Fold ground",
  slug: "fold-ground",
  group: "Artwork",
  order: 40,
  description:
    "Triangular tessellation whose authored facets take light one diagonal band at a time.",
  cli: {
    stance: "exempt",
    reason:
      "Decorative scalable browser artwork has no semantic terminal equivalent.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "A full-bleed surface needs low-contrast material depth behind short foreground copy.",
  ],
  notWhen: [
    "CSS payload must be minimal; this is the densest ground in the family.",
  ],
  accessibility: [
    "The composition is always hidden from assistive technology and never receives focus.",
    "Reduced-motion preferences preserve the complete authored still rather than an empty state.",
    "Forced-colour modes omit the decorative layer so foreground content remains unambiguous.",
  ],
} satisfies ComponentMeta;
