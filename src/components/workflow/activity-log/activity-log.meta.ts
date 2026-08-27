import type { ComponentMeta } from "../../../types/component-meta.ts";
import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";

const meta = {
  name: "Activity log",
  slug: "activity-log",
  group: "Workflow",
  order: 250,
  cli: { stance: "rendered" },
  description:
    "Long-running work as one calm frame: pinned stable results above a bounded tail of the most recent streamed detail and its in-progress partial line.",
  purposes: ["displaying-tool-output", "procedural-workflow"],
  useWhen: [
    "Minutes-long work should keep its results visible while raw detail streams beneath them.",
    "A run produces both facts worth pinning and output worth glancing at, and neither should displace the other.",
  ],
  notWhen: [
    "The output is a finished artifact to read in full; show it with Raw output or Terminal.",
    "Only step statuses matter and no detail streams; Worklog is the compact statused feed.",
  ],
  accessibility: [
    "The streamed tail is a native log role, so assistive technology can treat newly added lines as a polite live region.",
    "Stable-line tones pair a distinct marker glyph with their colour, so severity survives without colour perception.",
    "The headline speaks its active, complete, or cancelled status as text while the marker glyph stays decorative.",
    "All text sizes stay at or above the authored interface floor, including the monospace tail.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Streaming activity" },
    { id: "complete", label: "Completed activity" },
    { id: "cancelled", label: "Cancelled activity" },
  ],
);

export default meta;
