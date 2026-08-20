import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Feature bento",
  slug: "feature-bento",
  group: "Marketing",
  order: 50,
  description:
    "Strict rectangular feature matrix with fixed footprints, surfaces, icons, and visual slots.",
  cli: {
    stance: "exempt",
    reason:
      "Its distinguishing contract is a strict responsive size-and-media matrix; flattening it to terminal text would discard the component's defining structure.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "A curated feature set has an intentional hierarchy and can fill a complete rectangular matrix.",
  ],
  notWhen: [
    "Items have natural unrelated heights or cannot form a complete matrix; use Masonry or Grid instead.",
  ],
  accessibility: [
    "Explicit placement preserves article source order and never backfills later items into earlier cells.",
    "The matrix becomes a single source-order column on narrow viewports.",
    "Icons are decorative; each feature carries a visible heading and description.",
  ],
} satisfies ComponentMeta;
