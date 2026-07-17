import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Pager",
  slug: "pager",
  group: "Docs",
  order: 40,
  description:
    "Sequential previous/next navigation between adjacent pages in a reading order.",
  accessibility: [
    "A configurable label names the navigation landmark, distinct from the page's primary navigation.",
    "Direction words are real text inside each link, so the announced name carries both direction and destination.",
  ],
} satisfies ComponentMeta;
