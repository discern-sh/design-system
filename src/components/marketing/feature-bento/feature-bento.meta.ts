import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Feature bento",
  slug: "feature-bento",
  group: "Marketing",
  order: 50,
  description:
    "Dense asymmetric feature grid with intentional size, surface, icon, and visual slots.",
  cli: {
    stance: "exempt",
    reason:
      "Its distinguishing contract is an asymmetric size-and-media composition; flattening it to terminal text would duplicate Audience grid while discarding the component's defining structure.",
  },
  purposes: ["marketing-site"],
  accessibility: [
    "The visual grid preserves a simple article sequence in source order.",
    "Icons are decorative; each feature carries a visible heading and description.",
  ],
} satisfies ComponentMeta;
