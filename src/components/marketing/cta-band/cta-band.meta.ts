import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "CTA band",
  slug: "cta-band",
  group: "Marketing",
  order: 130,
  description:
    "High-emphasis closing invitation with centered or split layouts, three surface treatments, and a visual slot.",
  cli: { stance: "rendered" },
  purposes: ["marketing-site"],
  accessibility: [
    "The call to action remains a headed section and accepts ordinary link or button controls.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [{ id: "default", label: "Accent call to action" }],
);

export default meta;
