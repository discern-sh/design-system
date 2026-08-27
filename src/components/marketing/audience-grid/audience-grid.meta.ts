import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Audience grid",
  slug: "audience-grid",
  group: "Marketing",
  order: 40,
  description:
    "Persona-led card grid for explaining one product through the outcomes different audiences care about.",
  cli: { stance: "rendered" },
  purposes: ["marketing-site"],
  accessibility: [
    "Audience cards use a section heading followed by independently headed articles.",
    "Decorative numerals and icons are hidden from assistive technology.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [{ id: "default", label: "Audience paths" }],
);

export default meta;
