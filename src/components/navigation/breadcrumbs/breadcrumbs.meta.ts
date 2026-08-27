import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Breadcrumbs",
  slug: "breadcrumbs",
  group: "Navigation",
  order: 20,
  description:
    "Scrollable hierarchical page location with linked ancestors and one explicit current page.",
  cli: { stance: "rendered" },
  accessibility: [
    "A configurable label names the navigation landmark, and the hierarchy remains an ordered list.",
    "Only the final, unlinked item carries aria-current=page; visual separators are hidden from assistive technology.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Compact" },
  { id: "deep", label: "Deep hierarchy" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
