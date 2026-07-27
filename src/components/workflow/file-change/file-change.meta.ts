import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "File change",
  slug: "file-change",
  group: "Workflow",
  order: 320,
  description:
    "One file's added, updated, generated, removed, or unchanged disposition beside its full path and an optional Diffstat magnitude.",
  accessibility: [
    "Every disposition is a visible word; the marker and semantic colour are supplementary.",
    "Generated and unchanged use neutral treatment rather than warning colours.",
    "The composed Path reference keeps the full path available when the visible middle truncates.",
  ],
} satisfies ComponentMeta;
