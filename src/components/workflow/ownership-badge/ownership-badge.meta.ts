import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Ownership badge",
  slug: "ownership-badge",
  group: "Workflow",
  order: 340,
  description:
    "Inline authored, generated, project-owned, or tool-owned label that extends the Badge idiom while keeping every ownership relationship explicit in text.",
  accessibility: [
    "Every ownership relationship is visible text; colour, border style, and typeface are supplementary.",
    "Generated and tool-owned are neutral provenance facts rather than warning states.",
  ],
} satisfies ComponentMeta;
