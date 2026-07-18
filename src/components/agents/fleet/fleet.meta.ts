import type { ComponentMeta } from "../../../types/component-meta.ts";
export default {
  name: "Fleet",
  slug: "fleet",
  group: "Agents",
  order: 70,
  description:
    "Board of parallel efforts — one row per worktree pairing a persona with a monospace branch, a state slot, ahead/behind drift, and timing.",
  accessibility: [
    "Ahead/behind arrows are hidden decoration; the counts are spoken as visually hidden words after them.",
    "Pass label to name the board; assistive technology then announces the list and its length under that name.",
    "The persona and state slots carry their own semantics — compose Agent persona and Badge so identity and status stay announced once each.",
  ],
} satisfies ComponentMeta;
