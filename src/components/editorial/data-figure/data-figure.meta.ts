import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Data figure",
  slug: "data-figure",
  group: "Editorial",
  order: 90,
  cli: { stance: "rendered" },
  description:
    "Framed figure for charts, diagrams, annotated images, and research evidence, with legend, caption, and source slots.",
  purposes: ["building-documentation"],
  useWhen: [
    "A chart, diagram, annotated image, or other research evidence needs a visible title, caption, source line, or legend beside it.",
    "Colour-keyed series need a legend whose labels accompany every swatch.",
  ],
  notWhen: [
    "Use Diagram or Chart alone when the visual needs no visible figure furniture around it.",
    "Use a Backdrop from the Artwork Group for semantically disposable decoration that needs no caption or source.",
  ],
  accessibility: [
    "The caller supplies the visual's accessible representation while the surrounding title, caption, legend, and source retain figure semantics.",
    "Legend labels accompany every colour swatch so colour is never the only key.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Comparison figure" },
  { id: "narrow-layout", label: "Narrow layout" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
