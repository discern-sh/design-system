import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Toast",
  slug: "toast",
  group: "Feedback",
  order: 20,
  description:
    "Transient status message plus a labelled live-region container.",
  cli: { stance: "rendered" },
  accessibility: [
    "Danger uses alert semantics; other tones use status semantics.",
    "Auto-dismiss is opt-in.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Neutral" },
  { id: "success", label: "Success" },
  { id: "warning", label: "Warning" },
  { id: "danger", label: "Danger" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
