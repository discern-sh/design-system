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
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Neutral" },
  { id: "accent", label: "Accent" },
  { id: "success", label: "Success" },
  { id: "warning", label: "Warning" },
  { id: "danger", label: "Danger" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
