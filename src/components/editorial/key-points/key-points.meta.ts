import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Key points",
  slug: "key-points",
  group: "Editorial",
  order: 50,
  cli: { stance: "rendered" },
  description:
    "Scannable article summary that turns a small set of central ideas into a numbered editorial brief.",
  useWhen: [
    "An article opens or closes with a small numbered brief of its central ideas that a reader can scan before, or instead of, the full text.",
  ],
  notWhen: [
    "Use List for an ordinary ordered or unordered list without editorial framing.",
    "Use Callout for one note or interpretation rather than a summary of several ideas.",
  ],
  accessibility: [
    "Key ideas are an ordered list with real headings rather than a visually numbered collection of generic containers.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [{
  id: "default",
  label: "Editorial brief",
}] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
