import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Tiling backdrop",
  slug: "tiling-backdrop",
  group: "Artwork",
  order: 100,
  description:
    "Truchet arc field whose highlighted route reconnects as isolated tiles turn.",
  cli: {
    stance: "exempt",
    reason:
      "Decorative scalable browser artwork has no semantic terminal equivalent.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "A broad field needs quiet repetition with a sparse route that changes without breaking.",
  ],
  notWhen: [
    "The visual must explain a real network, path, or routing decision.",
  ],
  accessibility: [
    "The composition is always hidden from assistive technology and never receives focus.",
    "Reduced-motion preferences preserve the complete authored still rather than an empty state.",
    "Forced-colour modes omit the decorative layer so foreground content remains unambiguous.",
  ],
} satisfies ComponentMeta;
