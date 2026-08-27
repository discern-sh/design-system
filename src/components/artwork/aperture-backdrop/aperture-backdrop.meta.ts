import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Aperture backdrop",
  slug: "aperture-backdrop",
  group: "Artwork",
  order: 50,
  description:
    "Off-centre triangular opening that admits three unequal raking beams.",
  cli: {
    stance: "exempt",
    reason:
      "Aperture backdrop's off-centre triangular opening and raking light beams require a scalable layered plane that terminal cells cannot represent without inventing semantic content.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "A section needs an atmospheric incident concentrated across its upper band.",
  ],
  notWhen: [
    "The visual must cover the full height with an even texture.",
  ],
  accessibility: [
    "The composition is always hidden from assistive technology and never receives focus.",
    "Reduced-motion preferences preserve the complete authored still rather than an empty state.",
    "Forced-colour modes omit the decorative layer so foreground content remains unambiguous.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [{ id: "default", label: "Aperture field", only: "web" }],
);

export default meta;
