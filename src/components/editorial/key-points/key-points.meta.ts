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
  accessibility: [
    "Key ideas are an ordered list with real headings rather than a visually numbered collection of generic containers.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [{ id: "default", label: "Editorial brief" }],
);

export default meta;
