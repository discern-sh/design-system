import type { ComponentMeta } from "../../../types/component-meta.ts";
import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";

const meta = {
  name: "Fleet",
  slug: "fleet",
  group: "Agents",
  order: 70,
  cli: { stance: "rendered" },
  description:
    "Board of parallel efforts — one row per worktree pairing a persona with a monospace branch, a state slot, ahead/behind drift, and timing.",
  purposes: ["displaying-tool-output"],
  accessibility: [
    "Ahead/behind arrows are hidden decoration; the counts are spoken as visually hidden words after them.",
    "Pass label to name the board; assistive technology then announces the list and its length under that name.",
    "The persona and state slots carry their own semantics — compose Agent persona and Badge so identity and status stay announced once each.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Parallel work" },
    { id: "lossless-identities", label: "Long identities" },
  ],
);

export default meta;
