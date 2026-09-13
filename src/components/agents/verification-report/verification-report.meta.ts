import type { ComponentMeta } from "../../../types/component-meta.ts";
import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";

const meta = {
  name: "Verification report",
  slug: "verification-report",
  group: "Agents",
  order: 60,
  cli: { stance: "rendered" },
  description:
    "Durable report leading with outcome, summary and next action before native disclosure of complete metadata and check evidence.",
  purposes: ["displaying-tool-output"],
  useWhen: [
    "A durable handoff must record several checks and their outcomes with branch, commit, timing, or change metadata.",
  ],
  notWhen: [
    "You need the plain-language outcome and next action for one tool run; use Result summary.",
  ],
  accessibility: [
    "Check outcomes remain visible words after each complete value; decorative glyphs and semantic colour reinforce their meaning.",
    "Metadata and checks render as definition lists, so each label stays programmatically bound to its value.",
    "Native disclosure exposes subject extent and check outcome counts before expansion. Every evidence value and link remains keyboard reachable when open.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Passing report" },
  { id: "failure", label: "Failing report" },
  { id: "dense", label: "Dense operational evidence" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
