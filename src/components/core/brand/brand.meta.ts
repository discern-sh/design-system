import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Brand",
  slug: "brand",
  group: "Core",
  order: 70,
  description:
    "Composable brand lockup pairing an adaptive decorative mark with a name and optional tagline.",
  cli: { stance: "rendered" },
  purposes: ["marketing-site"],
  accessibility: [
    "The visible name carries the identity, so the composed Logo mark is always decorative and never announced twice.",
    "Wrap Brand in the destination link instead of nesting a link inside the lockup.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Wordmark" },
    { id: "tagline", label: "With tagline" },
    { id: "name-only", label: "Name only" },
  ],
);

export default meta;
