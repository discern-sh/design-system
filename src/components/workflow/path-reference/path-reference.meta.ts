import type { ComponentMeta } from "../../../types/component-meta.ts";
import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";

const meta = {
  name: "Path reference",
  slug: "path-reference",
  group: "Workflow",
  order: 40,
  cli: { stance: "rendered" },
  description:
    "Inline file or directory path with middle truncation and an opt-in adapter-only copy affordance, keeping quiet prose inert while owning the correct clipboard payload when copying matters.",
  purposes: [
    "building-documentation",
    "displaying-tool-output",
    "procedural-workflow",
  ],
  useWhen: [
    "Prose, a command, or a diagnostic must identify one exact file or directory without losing either end of a long path.",
  ],
  notWhen: [
    "You need to summarise a created or changed artifact with ownership and provenance; use Artifact card.",
  ],
  accessibility: [
    "The full path remains accessible text and a title even when its visible middle is truncated.",
    "Truncation preserves the rootward prefix and final file or directory segment at narrow widths.",
    "The optional copy action announces its text state and copies the full untruncated path.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Inline path" },
  { id: "long-path", label: "Long copyable path" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
