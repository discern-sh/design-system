import type { ComponentMeta } from "../../../types/component-meta.ts";
export default {
  name: "Byline",
  slug: "byline",
  group: "People",
  order: 50,
  description:
    "Editorial attribution row: an optional lede, the authors, and middot-separated meta segments such as dates and reading time.",
  accessibility: [
    "Renders the HTML address element — the semantic author container for its nearest article — with the italic default reset.",
    "Separator middots are CSS pseudo-content with empty alternative text, so assistive technology reads clean segments.",
    "Wrap dates in time elements inside the meta slot so machines read them as machines and people read them as prose.",
  ],
} satisfies ComponentMeta;
