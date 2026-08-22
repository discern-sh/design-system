import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Survey backdrop",
  slug: "survey-backdrop",
  group: "Artwork",
  order: 20,
  description:
    "Tileable equilateral ruling crossed by one slow travelling band of light.",
  cli: {
    stance: "exempt",
    reason:
      "Decorative scalable browser artwork has no semantic terminal equivalent.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "A broad field needs quiet measurement, registration, and a slow directional wash.",
  ],
  notWhen: [
    "The composition needs a clear focal object rather than an even field.",
  ],
  accessibility: [
    "The composition is always hidden from assistive technology and never receives focus.",
    "Reduced-motion preferences preserve the complete authored still rather than an empty state.",
    "Forced-colour modes omit the decorative layer so foreground content remains unambiguous.",
  ],
} satisfies ComponentMeta;
