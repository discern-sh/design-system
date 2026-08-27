import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Comparison table",
  slug: "comparison-table",
  group: "Marketing",
  order: 90,
  description:
    "Three-column capability comparison with an emphasized recommendation and card-like mobile rows.",
  cli: { stance: "rendered" },
  purposes: ["marketing-site"],
  accessibility: [
    "Column and row headers preserve table relationships for assistive technology.",
    "Mobile labels are derived from the same column names rather than duplicated visually.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [{
  id: "default",
  label: "Comparison",
}] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
