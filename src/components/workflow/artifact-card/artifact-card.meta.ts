import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Artifact card",
  slug: "artifact-card",
  group: "Workflow",
  order: 330,
  description:
    "Whole created or modified artifact with its name, Path reference, one-line summary, Ownership badge, provenance, and optional source-link slot.",
  purposes: ["building-documentation", "displaying-tool-output"],
  useWhen: [
    "One created or modified artifact needs its path, summary, ownership, provenance, and source link presented together.",
  ],
  notWhen: [
    "You need a compact row in a changed-file list or a nested project structure.",
  ],
  accessibility: [
    "The artifact is an article with a heading and definition-list metadata.",
    "Ownership remains explicit text through the composed Ownership badge.",
    "The composed Path reference preserves the full path under visible truncation.",
  ],
} satisfies ComponentMeta;
