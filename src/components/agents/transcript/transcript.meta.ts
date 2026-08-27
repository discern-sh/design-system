import type { ComponentMeta } from "../../../types/component-meta.ts";
import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";

const meta = {
  name: "Transcript",
  slug: "transcript",
  group: "Agents",
  order: 50,
  cli: { stance: "rendered" },
  description:
    "Ordered conversation turns between named speakers — compose Persona and Agent persona headers to show humans and agents working together.",
  purposes: ["displaying-tool-output"],
  accessibility: [
    "Renders an ordered list, so assistive technology announces the conversation's length and each turn's place in it.",
    "Each turn's speaker slot carries the identity; compose Persona or Agent persona so the printed name stays the single announced source.",
    "Wrap timestamps in the aside slot in time elements so machines read them as machines and people read them as prose.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [{ id: "default", label: "Review handoff" }],
);

export default meta;
