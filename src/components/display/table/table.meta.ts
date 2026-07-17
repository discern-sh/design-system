import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Table",
  slug: "table",
  group: "Display",
  order: 85,
  description:
    "Scrollable semantic data table wrapper with optional stripes and a numeric last column.",
  accessibility: [
    "Consumers author real thead/tbody/th markup, so header associations stay native; the wrapper only owns overflow and styling.",
    "Horizontal overflow scrolls inside the wrapper rather than the page, and the optional caption keeps its semantic position.",
  ],
} satisfies ComponentMeta;
