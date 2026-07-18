import type { ComponentMeta } from "../../../types/component-meta.ts";
export default {
  name: "Avatar group",
  slug: "avatar-group",
  group: "People",
  order: 20,
  description:
    "Overlapping stack of Avatars with ring separation and a labelled overflow count for the people it clamps away.",
  accessibility: [
    "Pass label to name the stack; it then renders role=\"group\" so assistive technology announces the collection once.",
    "The overflow chip is itself a labelled Avatar whose accessible name states how many people are hidden.",
    "Stacking follows DOM order, so reading order and the visual overlap always agree.",
  ],
} satisfies ComponentMeta;
