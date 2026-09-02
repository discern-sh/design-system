import type { ComponentMeta } from "../../../types/component-meta.ts";
import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";

const meta = {
  name: "Worklog",
  slug: "worklog",
  group: "Agents",
  order: 40,
  cli: { stance: "rendered" },
  description:
    "Compact statused feed of a run's steps — done, active, queued, failed, or skipped — with text annotations and right-aligned timing.",
  purposes: ["displaying-tool-output"],
  accessibility: [
    "Each entry's visible marker glyph carries an accessible status name beside the printed task label.",
    "Status pairs a distinct glyph shape and accessible name with its colour, so no state is conveyed by colour alone.",
    "Renders an ordered list, so assistive technology announces the run's length and each step's place in it.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Active run" },
  { id: "failure", label: "Failed run" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
