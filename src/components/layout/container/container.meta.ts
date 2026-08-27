import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Container",
  slug: "container",
  group: "Layout",
  order: 10,
  description:
    "Centred responsive content boundary with named readable widths.",
  cli: { stance: "rendered" },
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Measure" },
    { id: "full", label: "Full width" },
  ],
);

export default meta;
