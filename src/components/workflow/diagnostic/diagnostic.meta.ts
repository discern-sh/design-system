import type { ComponentMeta } from "../../../types/component-meta.ts";
import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";

const meta = {
  name: "Diagnostic",
  slug: "diagnostic",
  group: "Workflow",
  order: 220,
  cli: { stance: "rendered" },
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
    "Evidence follows the required correction in native disclosure. Its subject, extent and severity remain visible; expanded preformatted code is keyboard reachable and scrolls locally.",
    "Suggested correction is required, so a diagnostic never leaves the next action implicit.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "verbose-failure", label: "Verbose failure" },
  { id: "attention", label: "Attention" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
