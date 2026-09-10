import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Grid",
  slug: "grid",
  group: "Layout",
  order: 40,
  description:
    "Intrinsic responsive grid without breakpoint-specific column props.",
  cli: { stance: "rendered" },
  purposes: ["marketing-site"],
  useWhen: [
    "Peer items should fill responsive columns derived from a minimum item width rather than breakpoint-specific column counts.",
  ],
  notWhen: [
    "Use Cluster for a handful of inline items that wrap naturally.",
    "Use Masonry when items have varied heights and should pack rather than align in rows.",
    "Use Table when the content is tabular data with headers rather than a set of peer items.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Responsive grid" },
  { id: "single-column", label: "Single column" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
