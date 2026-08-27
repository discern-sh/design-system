import type { ComponentMeta } from "../../../types/component-meta.ts";
import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";

const meta = {
  name: "Artifact tree",
  slug: "artifact-tree",
  group: "Workflow",
  order: 310,
  cli: { stance: "rendered" },
  description:
    "Semantic nested-list project tree with explicit file and directory kinds, middle-truncated names, full-path titles, and an optional annotation slot per node.",
  purposes: ["building-documentation", "displaying-tool-output"],
  useWhen: [
    "A project or output structure must show nested files and directories with full paths and annotations.",
  ],
  notWhen: [
    "The hierarchy is site navigation or the reader needs details for one artifact only.",
  ],
  accessibility: [
    "Files and directories are nested list items, not an ASCII-art approximation.",
    "Each node exposes its kind and full path as text while visual glyphs remain decorative.",
    "Long names preserve both ends under truncation, and narrow layouts move annotations below the name without page overflow.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Project tree" },
    { id: "deep-tree", label: "Deep generated path" },
  ],
);

export default meta;
