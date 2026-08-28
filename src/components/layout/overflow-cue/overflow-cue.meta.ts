import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Overflow cue",
  slug: "overflow-cue",
  group: "Layout",
  order: 60,
  description:
    "Native scrolling with decorative cues for the logical edges that still contain content.",
  purposes: ["displaying-tool-output"],
  useWhen: [
    "A bounded region can scroll and its continuation is otherwise easy to miss.",
  ],
  notWhen: [
    "Content fits without scrolling or the interface needs pagination, virtualisation, or carousel controls.",
  ],
  cli: {
    stance: "exempt",
    reason:
      "Overflow cue is a browser scroll affordance driven by element geometry; terminal renderers expose clipping, folds, and overflow through their own frame facts.",
  },
  behaviors: ["overflow-cue"],
  accessibility: [
    "The cue is decorative and pointer-transparent; the native scroll container, scrollbar, wheel, touch, trackpad, keyboard, and programmatic scrolling remain available.",
    "Give an owned scroll container a concise viewportLabel. Raw HTML and descendant-target consumers must make and name their existing target keyboard-focusable.",
    "Without JavaScript every edge state remains false, so content still scrolls without a misleading cue.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "vertical-start", label: "Vertical · start", only: "web" },
  { id: "vertical-middle", label: "Vertical · middle", only: "web" },
  { id: "vertical-end", label: "Vertical · end", only: "web" },
  { id: "horizontal-start", label: "Horizontal · start", only: "web" },
  { id: "horizontal-middle", label: "Horizontal · middle", only: "web" },
  { id: "horizontal-end", label: "Horizontal · end", only: "web" },
  { id: "both-axes", label: "Both axes", only: "web" },
  { id: "dynamic-content", label: "Dynamic content and size", only: "web" },
  { id: "rtl-inline", label: "RTL inline overflow", only: "web" },
  { id: "no-overflow", label: "No overflow", only: "web" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
