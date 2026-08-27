import type { ComponentMeta } from "../../../types/component-meta.ts";
import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";

const meta = {
  name: "Agent handoff",
  slug: "agent-handoff",
  group: "Workflow",
  order: 430,
  cli: { stance: "rendered" },
  description:
    "Self-contained prose instructions for an agent session, with one visible string serving as the exact adapter-only clipboard payload.",
  purposes: ["building-documentation", "procedural-workflow"],
  useWhen: [
    "A task page must provide complete plain-text instructions that a reader can inspect and paste into an agent session unchanged.",
  ],
  notWhen: [
    "The copied input is a shell command to run or machine-readable output from a completed tool invocation.",
  ],
  accessibility: [
    "The complete prompt remains visible as wrapping preformatted prose without JavaScript or component styles.",
    "The prompt string is the single authority for both visible content and clipboard text, so hidden chrome cannot contaminate the copy.",
    "The copy action announces completion politely and retains keyboard focus on its button.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Review handoff" },
    { id: "long-prompt", label: "Long wrapping prompt" },
  ],
);

export default meta;
