import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Fold backdrop",
  slug: "fold-backdrop",
  group: "Artwork",
  order: 40,
  description:
    "Triangular tessellation whose authored facets take light one diagonal band at a time.",
  cli: {
    stance: "exempt",
    reason:
      "Fold backdrop's triangular tessellation conveys material depth through continuously lit facets, decorative browser geometry that terminal glyphs cannot preserve.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "A full-bleed surface needs low-contrast material depth behind short foreground copy.",
  ],
  notWhen: [
    "CSS payload must be minimal; this is the densest backdrop in the family.",
  ],
  accessibility: [
    "The composition is always hidden from assistive technology and never receives focus.",
    "Reduced-motion preferences preserve the complete authored still rather than an empty state.",
    "Forced-colour modes omit the decorative layer so foreground content remains unambiguous.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [{
  id: "default",
  label: "Fold field",
  only: "web",
}] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
