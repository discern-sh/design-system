import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Approach backdrop",
  slug: "approach-backdrop",
  group: "Artwork",
  order: 30,
  description:
    "Nested right-anchored triangles whose accent moves between non-adjacent depths.",
  cli: {
    stance: "exempt",
    reason:
      "Decorative scalable browser artwork has no semantic terminal equivalent.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "Foreground copy needs a clear column while a constructed focal point gathers at the edge.",
  ],
  notWhen: [
    "The decorative field must remain even across the complete canvas.",
  ],
  accessibility: [
    "The composition is always hidden from assistive technology and never receives focus.",
    "Reduced-motion preferences preserve the complete authored still rather than an empty state.",
    "Forced-colour modes omit the decorative layer so foreground content remains unambiguous.",
  ],
} satisfies ComponentMeta;
