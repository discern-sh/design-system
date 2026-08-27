import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";
const meta = {
  name: "Tag",
  slug: "tag",
  group: "Display",
  order: 60,
  description:
    "Compact metadata chip with an optional accessible remove action.",
  cli: { stance: "rendered" },
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Plain" },
    { id: "removable", label: "Removable" },
  ],
);

export default meta;
