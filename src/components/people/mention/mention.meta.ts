import type { ComponentMeta } from "../../../types/component-meta.ts";
export default {
  name: "Mention",
  slug: "mention",
  group: "People",
  order: 40,
  description:
    "Inline person chip for running prose — an @sigil or tiny portrait beside the name, em-scaled so it sits in text at any size.",
  accessibility: [
    "With href it renders a real link whose accessible name is exactly the person's name; the sigil and portrait are hidden decoration.",
    "Without href it renders a plain span, so a mention never fakes interactivity it does not have.",
    "Accent ink on the accent surface holds contrast in both themes, and the hover state deepens both together.",
  ],
} satisfies ComponentMeta;
