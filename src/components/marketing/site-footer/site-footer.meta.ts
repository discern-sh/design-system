import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Site footer",
  slug: "site-footer",
  group: "Marketing",
  order: 140,
  description:
    "Responsive page colophon with product context, grouped navigation, legal copy, and a compact metadata rail.",
  cli: {
    stance: "exempt",
    reason:
      "This is browser page chrome for grouped site links, legal copy, and a responsive colophon; a CLI owns shell help and exit context instead of rendering a website footer.",
  },
  purposes: ["marketing-site"],
  accessibility: [
    "Grouped links sit inside a labelled footer navigation landmark.",
    "Navigation group titles preserve a useful heading outline.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [{ id: "default", label: "Link groups", only: "web" }],
);

export default meta;
