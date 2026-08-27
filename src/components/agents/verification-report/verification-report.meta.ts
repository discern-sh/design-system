import type { ComponentMeta } from "../../../types/component-meta.ts";
import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";

const meta = {
  name: "Verification report",
  slug: "verification-report",
  group: "Agents",
  order: 60,
  cli: { stance: "rendered" },
  description:
    "Durable multi-check report with a stamped title, metadata rows, and dot-leadered results recording what was verified and how it ended.",
  purposes: ["displaying-tool-output"],
  useWhen: [
    "A durable handoff must record several checks and their outcomes with branch, commit, timing, or change metadata.",
  ],
  notWhen: [
    "You need the plain-language outcome and next action for one tool run; use Result summary.",
  ],
  accessibility: [
    "Check outcomes are spoken as visually hidden text after each value; the glyphs are hidden decoration paired with colour, never colour alone.",
    "Metadata and checks render as definition lists, so each label stays programmatically bound to its value.",
    "The dot leaders are painted decoration behind the text, invisible to assistive technology and absent in forced-colour modes.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Passing report" },
  { id: "failure", label: "Failing report" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
