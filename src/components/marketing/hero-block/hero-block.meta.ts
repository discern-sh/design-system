import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
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

export const componentExampleVocabulary = [
  { id: "split", label: "Split accent" },
  { id: "showcase", label: "Showcase" },
  {
    id: "backdrop",
    label: "Artwork backdrop",
    only: "web",
    reason:
      "Terminal HeroBlock has no background layer or scalable artwork plane; printing decorative browser geometry as text would misrepresent it.",
  },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
