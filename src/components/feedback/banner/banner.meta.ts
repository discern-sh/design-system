import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Banner",
  slug: "banner",
  group: "Feedback",
  order: 10,
  description:
    "Inline semantic message with neutral, accent, success, warning, and danger tones.",
  purposes: ["displaying-tool-output"],
  useWhen: [
    "A page or region needs a concise announcement whose meaning is complete without reproduction details.",
  ],
  notWhen: [
    "A specific failure needs location, evidence, reproduction, correction, and retry guidance; use Diagnostic.",
  ],
  cli: { stance: "rendered" },
  accessibility: [
    "Each tone has a named visible glyph. An optional heading and actions separate the state, explanation, and next step.",
    "Danger defaults to alert; other tones default to status. Override role for static notes or consumer-owned announcements. Keep one live region per operation and preserve its identity across updates.",
    "Progress supplies task semantics without announcing updates; consumers own timers, outcomes, and focus. The Catalogue transition fixtures do not change the build-time React contract.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Neutral" },
  { id: "accent", label: "Accent" },
  { id: "success", label: "Success" },
  { id: "warning", label: "Warning" },
  { id: "danger", label: "Danger" },
  {
    id: "loading-success",
    label: "Loading to success",
    only: "web",
    reason:
      "The CLI renderer supplies static text frames and cannot retain DOM focus or a browser live region through timed updates.",
  },
  {
    id: "loading-failure",
    label: "Loading to failure",
    only: "web",
    reason:
      "The CLI renderer supplies static text frames and cannot retain DOM focus or a browser live region through timed updates.",
  },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
