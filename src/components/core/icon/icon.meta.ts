import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Icon",
  slug: "icon",
  group: "Core",
  order: 10,
  description:
    "Vendor-neutral sizing and accessibility wrapper for an injected icon graphic.",
  cli: { stance: "rendered" },
  accessibility: [
    "Decorative icons are hidden automatically.",
    "Meaningful icons require a label.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [{ id: "default", label: "Labelled icon" }],
);

export default meta;
