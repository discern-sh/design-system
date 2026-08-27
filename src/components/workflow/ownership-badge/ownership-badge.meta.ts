import type { ComponentMeta } from "../../../types/component-meta.ts";
import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";

const meta = {
  name: "Ownership badge",
  slug: "ownership-badge",
  group: "Workflow",
  order: 340,
  cli: { stance: "rendered" },
  description:
    "Inline authored, generated, project-owned, or tool-owned label that extends the Badge idiom while keeping every ownership relationship explicit in text.",
  purposes: ["building-documentation", "displaying-tool-output"],
  useWhen: [
    "An artifact needs an explicit authored, generated, project-owned, or tool-owned provenance label.",
  ],
  notWhen: [
    "The label describes status, category, or arbitrary metadata rather than ownership; use Badge.",
  ],
  accessibility: [
    "Every ownership relationship is visible text; colour, border style, and typeface are supplementary.",
    "Generated and tool-owned are neutral provenance facts rather than warning states.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "authored", label: "Authored" },
  { id: "generated", label: "Generated" },
  { id: "project-owned", label: "Project owned" },
  { id: "tool-owned", label: "Tool owned" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
