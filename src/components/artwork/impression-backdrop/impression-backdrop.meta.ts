import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Impression backdrop",
  slug: "impression-backdrop",
  group: "Artwork",
  order: 60,
  description:
    "Configurable glyph lattice whose soft accent aperture follows the reader without script.",
  cli: {
    stance: "exempt",
    reason:
      "Impression backdrop's pointer-responsive accent aperture moves across a scalable glyph lattice, while terminal rendering has no equivalent decorative pointer plane.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "A typographic field should respond softly to pointer position while remaining complete when still.",
  ],
  notWhen: [
    "The repeated mark carries semantic meaning or needs to be announced.",
  ],
  accessibility: [
    "The composition is always hidden from assistive technology and never receives focus.",
    "Reduced-motion preferences preserve the complete authored still rather than an empty state.",
    "Forced-colour modes omit the decorative layer so foreground content remains unambiguous.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [{ id: "default", label: "Impression field", only: "web" }],
);

export default meta;
