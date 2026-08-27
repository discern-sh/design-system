import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Split feature",
  slug: "split-feature",
  group: "Marketing",
  order: 60,
  description:
    "Alternating editorial feature section with narrative copy, proof points, actions, and an unconstrained media slot.",
  cli: {
    stance: "exempt",
    reason:
      "Its identity depends on alternating copy beside an unconstrained media slot; a terminal cannot render that arbitrary media relationship without collapsing into other text-first marketing components.",
  },
  accessibility: [
    "Content precedes media in source order even when the visual position is reversed.",
    "Proof points are expressed as a semantic list.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [{
  id: "default",
  label: "Evidence split",
  only: "web",
}] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
