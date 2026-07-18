import type { ComponentMeta } from "../../../types/component-meta.ts";
export default {
  name: "Worklog",
  slug: "worklog",
  group: "Agents",
  order: 40,
  description:
    "Compact statused feed of a run's steps — done, active, queued, failed, or skipped — with monospace annotations and right-aligned timing.",
  accessibility: [
    "Each entry's status is spoken as visually hidden text after its label; the marker glyphs are hidden decoration.",
    "Status pairs a distinct glyph shape with its colour, so no state is conveyed by colour alone.",
    "Renders an ordered list, so assistive technology announces the run's length and each step's place in it.",
  ],
} satisfies ComponentMeta;
