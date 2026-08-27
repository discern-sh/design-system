import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Docs nav",
  slug: "docs-nav",
  group: "Docs",
  order: 30,
  cli: { stance: "rendered" },
  description:
    "Sectioned documentation navigation rail with one explicit current destination.",
  purposes: ["building-documentation"],
  accessibility: [
    "A configurable label names the navigation landmark, and each section stays a real list.",
    "The current destination carries aria-current=page and reinforces its highlight with weight, not colour alone.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [{ id: "default", label: "Section navigation" }],
);

export default meta;
