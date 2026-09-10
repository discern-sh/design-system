import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Timeline",
  slug: "timeline",
  group: "Editorial",
  order: 100,
  cli: { stance: "rendered" },
  description:
    "Chronological narrative for histories, release stories, investigations, and staged programmes, with optional status and detail.",
  useWhen: [
    "A history, release story, investigation, or staged programme is told as ordered narrative events, each with a date, a title, and optional detail or status.",
    "Event status (complete, current, or upcoming) supplements the written entry rather than replacing it.",
  ],
  notWhen: [
    "Use the timeline diagram kind through Diagram when calendar position, duration bars, and dated gates are the reference facts.",
    "Use Worklog for the statused steps of one run, or Activity log for streaming machine output.",
    "Use Procedure for steps a reader executes rather than events a reader follows.",
  ],
  accessibility: [
    "Events remain an ordered list and visual marker status supplements rather than replaces the written content.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [{
  id: "default",
  label: "Editorial timeline",
}] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
