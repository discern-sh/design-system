import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Skip link",
  slug: "skip-link",
  group: "Docs",
  order: 10,
  description:
    "Visually hidden bypass link that surfaces on keyboard focus and jumps to the main content.",
  accessibility: [
    "Hidden with a clip-path technique that keeps the link in the accessibility tree and the tab order.",
    "On focus it surfaces as the page's topmost element with a visible outline, meeting the bypass-blocks expectation.",
  ],
} satisfies ComponentMeta;
