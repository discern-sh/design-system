import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Artifact card",
  slug: "artifact-card",
  group: "Workflow",
  order: 330,
  description:
    "Whole created or modified artifact with its name, Path reference, one-line summary, Ownership badge, provenance, and optional source-link slot.",
  accessibility: [
    "The artifact is an article with a heading and definition-list metadata.",
    "Ownership remains explicit text through the composed Ownership badge.",
    "The composed Path reference preserves the full path under visible truncation.",
  ],
} satisfies ComponentMeta;
