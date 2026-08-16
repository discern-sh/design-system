import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Data figure",
  slug: "data-figure",
  group: "Editorial",
  order: 90,
  cli: { stance: "rendered" },
  description:
    "Framed figure for charts, diagrams, annotated images, and research evidence, with legend, caption, and source slots.",
  purposes: ["building-documentation"],
  accessibility: [
    "The caller supplies the visual's accessible representation while the surrounding title, caption, legend, and source retain figure semantics.",
    "Legend labels accompany every colour swatch so colour is never the only key.",
  ],
} satisfies ComponentMeta;
