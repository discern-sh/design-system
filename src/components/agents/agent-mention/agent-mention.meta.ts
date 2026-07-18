import type { ComponentMeta } from "../../../types/component-meta.ts";
export default {
  name: "Agent mention",
  slug: "agent-mention",
  group: "Agents",
  order: 30,
  description:
    "Inline agent chip for running prose — a prompt sigil beside the monospace name, em-scaled so it sits in text at any size.",
  accessibility: [
    "With href it renders a real link whose accessible name is exactly the agent's name; the sigil and tile are hidden decoration.",
    "Without href it renders a plain span, so a mention never fakes interactivity it does not have.",
    "The chip keeps body ink on the sunken surface in both themes; only the decorative sigil carries accent colour.",
  ],
} satisfies ComponentMeta;
