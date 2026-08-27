import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";
const meta = {
  name: "Diffstat",
  slug: "diffstat",
  group: "Display",
  order: 95,
  description:
    "Inline added/removed change summary — signed counts beside proportional squares, with both sides kept visible when either is non-zero.",
  cli: { stance: "rendered" },
  purposes: ["displaying-tool-output"],
  accessibility: [
    "The signed counts are real text and the whole meaning; the squares are hidden decoration.",
    "Direction is carried by the plus and minus signs, never by colour alone.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Mixed changes" },
    { id: "added", label: "Additions only" },
    { id: "removed", label: "Removals only" },
    { id: "empty", label: "No changes" },
  ],
);

export default meta;
