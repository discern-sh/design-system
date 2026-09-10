import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";
const meta = {
  name: "Tag",
  slug: "tag",
  group: "Display",
  order: 60,
  description:
    "Compact metadata chip with an optional accessible remove action.",
  cli: { stance: "rendered" },
  useWhen: [
    "Compact metadata such as a topic, label, or filter is attached to content, optionally with an accessible remove action the consumer handles.",
  ],
  notWhen: [
    "Use Badge for a status or count that is not editable metadata.",
    "Use Kicker for a label that introduces a heading rather than annotating content.",
  ],
  accessibility: [
    "The remove action is a consumer handler: omit onRemove in static output, where no handler can run, and the chip renders without a remove button.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Plain" },
  { id: "removable", label: "Removable" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
