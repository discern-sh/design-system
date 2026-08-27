import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "FAQ block",
  slug: "faq-block",
  group: "Marketing",
  order: 120,
  description:
    "Editorial frequently-asked-questions section using native disclosure controls and a sticky introduction.",
  cli: { stance: "rendered" },
  accessibility: [
    "Questions use native details and summary elements, so disclosure works without JavaScript.",
    "Keyboard focus receives a visible accent outline.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [{ id: "default", label: "First answer open" }],
);

export default meta;
