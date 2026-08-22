import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Hero block",
  slug: "hero-block",
  group: "Marketing",
  order: 20,
  description:
    "High-impact opening section with split, centered, and showcase compositions plus flexible action, proof, visual, and decorative-backdrop slots.",
  cli: { stance: "rendered" },
  purposes: ["marketing-site"],
  useWhen: [
    "A campaign needs one opening promise with actions and optional visual evidence; use showcase with the atmospheric surface for publication-scale launches.",
  ],
  accessibility: [
    "The heading level is explicit so the block can open a page or a nested campaign.",
    "Copy, actions, and supporting visuals retain source order when the layout collapses.",
    "The backdrop slot is always hidden from assistive technology and remains behind complete foreground content.",
    "Showcase emphasis uses real title text and remains readable when gradient clipping is unavailable.",
  ],
} satisfies ComponentMeta;
