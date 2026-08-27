import type { ComponentMeta } from "../../../types/component-meta.ts";
import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";

const meta = {
  name: "Agent mention",
  slug: "agent-mention",
  group: "Agents",
  order: 30,
  cli: { stance: "rendered" },
  description:
    "Inline agent chip for running prose — an agent sigil beside the name, em-scaled so it sits in text at any size.",
  accessibility: [
    "With href it renders a real link whose accessible name is exactly the agent's name; the sigil and tile are hidden decoration.",
    "Without href it renders a plain span, so a mention never fakes interactivity it does not have.",
    "The chip keeps body ink on the sunken surface in both themes; only the decorative sigil carries accent colour.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Static mention" },
    { id: "linked", label: "Linked mention" },
  ],
);

export default meta;
