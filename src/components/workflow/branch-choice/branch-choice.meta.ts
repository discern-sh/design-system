import type { ComponentMeta } from "../../../types/component-meta.ts";
import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";

const meta = {
  name: "Branch choice",
  slug: "branch-choice",
  group: "Workflow",
  order: 140,
  cli: { stance: "rendered" },
  description:
    "A small set of explicitly labelled routes through a procedure or next action, complete and linkable without diagram machinery or client behaviour.",
  purposes: ["building-documentation", "procedural-workflow"],
  useWhen: [
    "A procedure or end-of-page next action has condition-labelled routes that readers must choose between.",
  ],
  notWhen: [
    "The reader is moving linearly between adjacent pages (use Pager) or following ordered steps (use Procedure).",
  ],
  accessibility: [
    "Choices and their routes remain nested lists when component styles are unavailable.",
    "Linked routes use native anchors and follow document keyboard order.",
    "Labels state the condition for each route instead of relying on position, arrow shape, or colour.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Procedure fork" },
  { id: "next-action", label: "End-of-page next action" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
