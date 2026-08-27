import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Skip link",
  slug: "skip-link",
  group: "Docs",
  order: 10,
  cli: {
    stance: "exempt",
    reason:
      "Browser focus-bypass navigation has no terminal document equivalent because terminal output is already linear.",
  },
  description:
    "Visually hidden bypass link that surfaces on keyboard focus and jumps to the main content.",
  accessibility: [
    "Hidden with a clip-path technique that keeps the link in the accessibility tree and the tab order.",
    "On focus it surfaces as the page's topmost element with a visible outline, meeting the bypass-blocks expectation.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [{
  id: "default",
  label: "Keyboard bypass",
  only: "web",
}] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
