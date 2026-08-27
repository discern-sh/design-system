import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Logo cloud",
  slug: "logo-cloud",
  group: "Marketing",
  order: 30,
  description:
    "Quiet grid or loose campaign strip for customer, partner, integration, or publication marks.",
  cli: { stance: "rendered" },
  purposes: ["marketing-site"],
  useWhen: [
    "A page needs readable organization names beside optional decorative marks; use strip for a lighter provider or integration line.",
  ],
  accessibility: [
    "Marks are decorative by default while every item retains a readable text name.",
    "An optional mark mask preserves supplied image artwork in light Theme and replaces it completely with a neutral silhouette in dark Theme, without replacing the readable name.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "grid", label: "Trust grid" },
  { id: "strip", label: "Provider strip" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
