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
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Responsive grid" },
  { id: "single-column", label: "Single column" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
