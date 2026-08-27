import type { ComponentMeta } from "../../../types/component-meta.ts";
import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";

const meta = {
  name: "Procedure",
  slug: "procedure",
  group: "Workflow",
  order: 110,
  cli: { stance: "rendered" },
  description:
    "Complete operational sequence with prerequisites, semantic ordered steps, recovery paths, and explicit evidence of completion.",
  purposes: ["building-documentation", "procedural-workflow"],
  useWhen: [
    "A reader must carry out an ordered operational task with prerequisites, branches, recovery, and completion evidence.",
  ],
  notWhen: [
    "The sequence explains a high-level journey or methodology without executable actions; use Process steps.",
  ],
  accessibility: [
    "Steps remain a native ordered list, so their sequence and numbering survive without component styles.",
    "Prerequisites, commands, expected results, branches, and recovery guidance remain complete in static HTML.",
    "The closing statement labels the evidence that proves the whole procedure is complete.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Backup and restore" },
  { id: "interrupted", label: "Interrupted recovery" },
  { id: "active", label: "Active procedure" },
  { id: "long-procedure", label: "Long procedure" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
