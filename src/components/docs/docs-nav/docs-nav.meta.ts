import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Docs nav",
  slug: "docs-nav",
  group: "Docs",
  order: 30,
  description:
    "Sectioned documentation navigation rail with one explicit current destination.",
  accessibility: [
    "A configurable label names the navigation landmark, and each section stays a real list.",
    "The current destination carries aria-current=page and reinforces its highlight with weight, not colour alone.",
  ],
} satisfies ComponentMeta;
