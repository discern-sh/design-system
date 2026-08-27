import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";
const meta = {
  name: "Window",
  slug: "window",
  group: "Display",
  order: 70,
  description:
    "Framed presentation surface with standard and campaign showcase treatments for product UI and code examples.",
  cli: { stance: "rendered" },
  purposes: ["displaying-tool-output", "marketing-site"],
  useWhen: [
    "A visual needs recognizable browser-style chrome; use showcase for wide campaign evidence with optional trailing status or actions.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "standard", label: "Standard" },
  { id: "showcase", label: "Showcase" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
