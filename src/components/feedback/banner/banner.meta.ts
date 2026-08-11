import type { ComponentMeta } from "../../../types/component-meta.ts";
export default {
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
