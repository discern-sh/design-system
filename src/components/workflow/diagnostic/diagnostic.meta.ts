import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Diagnostic",
  slug: "diagnostic",
  group: "Workflow",
  order: 220,
  description:
    "Structured failure account that explains impact, exact location, evidence, reproduction and retry commands, correction, and optional raw detail.",
  purposes: [
    "building-documentation",
    "displaying-tool-output",
    "procedural-workflow",
  ],
  useWhen: [
    "A specific failure needs its impact, location, evidence, reproduction, correction, and retry path kept together.",
  ],
  notWhen: [
    "You need a short page-level announcement without reproduction or correction detail; use Banner.",
  ],
  accessibility: [
    "Failure severity derives role=alert while attention derives role=status, unless a consumer supplies an explicit role.",
    "Failure and attention appear as visible words; danger and warning colour only reinforce the actionable marker.",
    "Locations compose Path reference, commands compose Command, and raw detail composes Raw output, preserving each component's accessible contract.",
    "Evidence remains semantic preformatted code and scrolls horizontally instead of forcing the page wider.",
    "Suggested correction is required, so a diagnostic never leaves the next action implicit.",
  ],
} satisfies ComponentMeta;
