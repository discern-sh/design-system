import type { ComponentMeta } from "../../../types/component-meta.ts";
export default {
  name: "Transcript",
  slug: "transcript",
  group: "Agents",
  order: 50,
  description:
    "Ordered conversation turns between named speakers — compose Persona and Agent persona headers to show humans and agents working together.",
  accessibility: [
    "Renders an ordered list, so assistive technology announces the conversation's length and each turn's place in it.",
    "Each turn's speaker slot carries the identity; compose Persona or Agent persona so the printed name stays the single announced source.",
    "Wrap timestamps in the aside slot in time elements so machines read them as machines and people read them as prose.",
  ],
} satisfies ComponentMeta;
