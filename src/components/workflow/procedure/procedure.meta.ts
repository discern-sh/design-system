import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Procedure",
  slug: "procedure",
  group: "Workflow",
  order: 110,
  description:
    "Complete operational sequence with prerequisites, semantic ordered steps, recovery paths, and explicit evidence of completion.",
  accessibility: [
    "Steps remain a native ordered list, so their sequence and numbering survive without component styles.",
    "Prerequisites, commands, expected results, branches, and recovery guidance remain complete in static HTML.",
    "The closing statement labels the evidence that proves the whole procedure is complete.",
  ],
} satisfies ComponentMeta;
