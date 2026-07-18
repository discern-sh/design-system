import type { ComponentMeta } from "../../../types/component-meta.ts";
export default {
  name: "Diffstat",
  slug: "diffstat",
  group: "Display",
  order: 95,
  description:
    "Inline added/removed change summary — signed monospace counts beside proportional squares, with both sides kept visible when either is non-zero.",
  accessibility: [
    "The signed counts are real text and the whole meaning; the squares are hidden decoration.",
    "Direction is carried by the plus and minus signs, never by colour alone.",
  ],
} satisfies ComponentMeta;
