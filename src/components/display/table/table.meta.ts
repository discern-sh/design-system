import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Table",
  slug: "table",
  group: "Display",
  order: 85,
  description:
    "General-purpose semantic data table with native browser markup and compact or lossless responsive terminal layouts.",
  cli: { stance: "rendered" },
  purposes: ["displaying-tool-output"],
  useWhen: [
    "Headers define relationships across ordinary relational data, including rich phrasing, empty values, or content that must remain complete at narrow terminal widths.",
  ],
  notWhen: [
    "Use Comparison table for a curated two-option marketing comparison with a title and feature narrative.",
  ],
  accessibility: [
    "Consumers author real thead/tbody/th markup, so header associations stay native; the wrapper only owns overflow and styling.",
    "Horizontal overflow scrolls inside the wrapper rather than the page, and the optional caption keeps its semantic position.",
    "The responsive terminal layout retains every header/value relationship in labelled records when a coherent grid cannot fit, without relying on colour.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Three-column data" },
  { id: "rich-cells", label: "Rich and empty cells" },
  { id: "dense-overflow", label: "Dense narrow width" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
