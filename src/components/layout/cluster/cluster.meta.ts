import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Cluster",
  slug: "cluster",
  group: "Layout",
  order: 30,
  description:
    "Wrapping horizontal composition for actions, tags, and compact groups.",
  cli: { stance: "rendered" },
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Actions" },
    { id: "centred", label: "Centred" },
  ],
);

export default meta;
