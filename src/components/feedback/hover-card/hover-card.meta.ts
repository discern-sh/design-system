import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Hover card",
  slug: "hover-card",
  group: "Feedback",
  order: 35,
  description:
    "Hover- and focus-revealed supplementary surface accepting arbitrary inline or block content.",
  cli: {
    stance: "exempt",
    reason:
      "Its identity is supplementary content revealed by pointer hover or browser focus; a terminal has neither that hidden spatial relationship nor a faithful static equivalent.",
  },
  behaviors: ["floating-surface"],
  accessibility: [
    "The trigger must be keyboard focusable; focus-within keeps interactive panel content available while users tab through it.",
    "aria-details preserves any existing relationship and associates the trigger with the richer panel without misusing the tooltip role.",
    "Use inline layout for phrasing content inside prose and block layout for structured content such as headings, paragraphs, lists, and actions.",
    "The emitted browser behavior promotes supported panels to the top layer, keeping them clear of clipping ancestors and inside the viewport; the static CSS fallback remains available without JavaScript.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Rich details", only: "web" },
  { id: "inline", label: "Inline annotation", only: "web" },
  { id: "overflow", label: "Overflow boundary", only: "web" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
