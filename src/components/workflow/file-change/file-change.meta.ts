import type { ComponentMeta } from "../../../types/component-meta.ts";
import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";

const meta = {
  name: "File change",
  slug: "file-change",
  group: "Workflow",
  order: 320,
  cli: { stance: "rendered" },
  description:
    "One file's added, updated, generated, removed, or unchanged disposition beside its full path and an optional Diffstat magnitude.",
  purposes: ["building-documentation", "displaying-tool-output"],
  useWhen: [
    "A changed-file list needs an explicit disposition, full path, and optional change magnitude for each file.",
  ],
  notWhen: [
    "Readers need the file contents, raw diff, or whole-artifact provenance.",
  ],
  accessibility: [
    "Every disposition is a visible word; the marker and semantic colour are supplementary.",
    "Generated and unchanged use neutral treatment rather than warning colours.",
    "The composed Path reference keeps the full path available when the visible middle truncates.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Updated file" },
  { id: "added", label: "Added file" },
  { id: "generated", label: "Generated file" },
  { id: "removed", label: "Removed file" },
  { id: "unchanged", label: "Unchanged file" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
