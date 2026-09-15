import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Icon",
  slug: "icon",
  group: "Core",
  order: 10,
  description:
    "Vendor-neutral sizing and accessibility for supplied graphics, with optional relief at expressive sizes. Supplied SVG fill and stroke are preserved.",
  cli: { stance: "rendered" },
  accessibility: [
    "Decorative icons are hidden automatically.",
    "Meaningful icons require a label.",
    "Relief requires contain fitting and an expressive allocation; small and intrinsic graphics stay flat. Forced colours remove relief.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [{
  id: "default",
  label: "Labelled icon",
}, {
  id: "imported-relief",
  label: "Imported graphics, flat and relief",
  only: "web",
  reason:
    "SVG paint preservation and optical relief require browser vector rendering; CLI Icon retains its text and label semantics.",
}] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
