import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Sparkline",
  slug: "sparkline",
  group: "Display",
  order: 92,
  description:
    "Compact recent-movement graphic with a mandatory endpoint annotation.",
  cli: { stance: "rendered" },
  purposes: ["displaying-tool-output", "marketing-site"],
  useWhen: [
    "Showing recent movement beside a headline number, such as a Stat trend.",
    "Giving a dense list one glanceable direction cue per row.",
  ],
  notWhen: [
    "Reading exact values or intermediate points — a sparkline is lossy by design, and only its endpoint annotation states numbers; use the line chart kind.",
    "Comparing two series — each sparkline scales to its own extremes, so two sparklines are never comparable.",
    "Inline terminal prose — the terminal form is a block-context run, never an inline grammar.",
    "Showing more than 100 observations — the fixed browser view cannot distinguish a denser run; summarize the period or use the line chart kind.",
  ],
  accessibility: [
    "The endpoint annotation is visible text carrying the numeric truth, so no reading depends on glyph fidelity or colour.",
    "The movement graphic is decorative and hidden from assistive technology; the annotation reads in source order.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Movement" },
  { id: "with-gaps", label: "With gaps" },
  { id: "flat", label: "Flat" },
  { id: "decline", label: "Decline" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
