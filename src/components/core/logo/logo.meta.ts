import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Logo",
  slug: "logo",
  group: "Core",
  order: 60,
  description:
    "Adaptive logo wrapper for text glyphs, injected graphics, and wide or square marks.",
  cli: { stance: "rendered" },
  accessibility: [
    "Omit label when the logo is decorative beside a visible brand name; provide label only when the logo carries the identity by itself.",
    "Injected images should use empty alternative text because the wrapper owns the accessible label.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Plain" },
    { id: "tile", label: "Tile" },
    { id: "square", label: "Square" },
  ],
);

export default meta;
