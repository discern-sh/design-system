import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";
const meta = {
  name: "Persona",
  slug: "persona",
  group: "People",
  order: 30,
  cli: { stance: "rendered" },
  description:
    "Identity lockup pairing an Avatar with a name and secondary detail line — the row form for tables, headers, and comment threads.",
  accessibility: [
    "The visible name is the single source of identity: the built-in avatar renders decorative so nothing is announced twice.",
    "Presence is spoken as visually hidden text directly after the name, never conveyed by colour alone.",
    "Name and detail truncate visually with an ellipsis while the full text stays available to assistive technology.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Identity" },
  { id: "with-presence", label: "With presence" },
  { id: "long-name", label: "Long name" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
