import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Branch choice",
  slug: "branch-choice",
  group: "Workflow",
  order: 140,
  description:
    "Two or three explicitly labelled routes through a procedure, complete and linkable without diagram machinery or client behaviour.",
  accessibility: [
    "Choices and their routes remain nested lists when component styles are unavailable.",
    "Linked routes use native anchors and follow document keyboard order.",
    "Labels state the condition for each route instead of relying on position, arrow shape, or colour.",
  ],
} satisfies ComponentMeta;
