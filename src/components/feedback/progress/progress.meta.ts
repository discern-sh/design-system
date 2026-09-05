import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";
const meta = {
  name: "Progress",
  slug: "progress",
  group: "Feedback",
  order: 55,
  description:
    "Named task completion with a truthful value and total, or an explicit waiting state when completion is unknown.",
  purposes: ["displaying-tool-output", "procedural-workflow"],
  useWhen: [
    "Show how much of a task is complete, or that work is waiting when its completion cannot be measured.",
  ],
  notWhen: [
    "Use Meter for a bounded measurement such as storage usage, rather than task completion.",
    "Use consumer-owned status text for an outcome that has no progress or waiting state.",
  ],
  cli: { stance: "rendered" },
  accessibility: [
    "The visible task label names the progressbar; value, maximum, readable completion, and supplied context agree on both surfaces.",
    "Missing or non-finite values are indeterminate and omit aria-valuenow. Finite values clamp to zero through max; absent, non-positive, or non-finite max defaults to 100.",
    "Waiting remains visible with reduced motion and forced colours. Progress does not create a live region; consumers own announcement frequency.",
    "Terminal frames use only supplied work values; the waiting frame has no timer, clock, or invented percentage.",
  ],
} satisfies ComponentMeta;
/** Canonical completion and waiting examples on both surfaces. */
export const componentExampleVocabulary = [
  { id: "default", label: "Task started" },
  { id: "intermediate", label: "Measured progress" },
  { id: "complete", label: "Task complete" },
  { id: "waiting", label: "Waiting for work" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);
export default meta;
