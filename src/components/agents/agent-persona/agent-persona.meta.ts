import type { ComponentMeta } from "../../../types/component-meta.ts";
import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";

const meta = {
  name: "Agent persona",
  slug: "agent-persona",
  group: "Agents",
  order: 20,
  cli: { stance: "rendered" },
  description:
    "Identity lockup pairing an Agent avatar with a name and detail line — the row form for fleet views, tables, and activity chrome.",
  accessibility: [
    "The visible name is the single source of identity: the built-in avatar renders decorative so nothing is announced twice.",
    "Status is spoken as visually hidden text directly after the name, never conveyed by colour alone.",
    "Name and detail truncate visually with an ellipsis while the full text stays available to assistive technology.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Agent identity" },
  { id: "working", label: "Working agent" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
