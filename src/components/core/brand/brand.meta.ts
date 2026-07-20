import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Brand",
  slug: "brand",
  group: "Core",
  order: 70,
  description:
    "Composable brand lockup pairing an adaptive decorative mark with a name and optional tagline.",
  accessibility: [
    "The visible name carries the identity, so the composed Logo mark is always decorative and never announced twice.",
    "Wrap Brand in the destination link instead of nesting a link inside the lockup.",
  ],
} satisfies ComponentMeta;
