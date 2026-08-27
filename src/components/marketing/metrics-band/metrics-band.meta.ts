import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Metrics band",
  slug: "metrics-band",
  group: "Marketing",
  order: 80,
  description:
    "Compact evidence strip for a handful of high-signal outcomes, with surface, accent, and contrast treatments.",
  cli: { stance: "rendered" },
  accessibility: [
    "Metrics use a description list so each figure stays paired with its label.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [{ id: "default", label: "Measured outcomes" }],
);

export default meta;
