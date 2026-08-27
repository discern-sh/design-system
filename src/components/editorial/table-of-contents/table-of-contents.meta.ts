import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Table of contents",
  slug: "table-of-contents",
  group: "Editorial",
  order: 30,
  cli: { stance: "rendered" },
  description:
    "Compact article navigation with numbered sections, unnumbered nested entries, an optional reading-progress note, and a clear current-location state.",
  accessibility: [
    "The component is a labelled navigation landmark and exposes the current location with aria-current.",
    "Nested entries remain visible text and omit a misleading section number.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [{
  id: "default",
  label: "Article contents",
}] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
