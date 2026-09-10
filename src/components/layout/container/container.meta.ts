import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Container",
  slug: "container",
  group: "Layout",
  order: 10,
  description:
    "Centred responsive content boundary with named readable widths.",
  cli: { stance: "rendered" },
  useWhen: [
    "Page content needs a centred, named readable width that responds to the viewport.",
  ],
  notWhen: [
    "Use Article layout when the reading column needs navigation or a contextual rail beside it.",
    "Use Section for a full-bleed region with its own surface, and place a Container inside it to bound the content.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Measure" },
  { id: "full", label: "Full width" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
