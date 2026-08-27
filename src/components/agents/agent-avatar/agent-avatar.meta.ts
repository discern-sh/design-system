import type { ComponentMeta } from "../../../types/component-meta.ts";
import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";

const meta = {
  name: "Agent avatar",
  slug: "agent-avatar",
  group: "Agents",
  order: 10,
  cli: { stance: "rendered" },
  description:
    "Dark square tile with an interface-type sigil identifying one agent — the machine counterpart to Avatar, so mixed rosters read at a glance.",
  accessibility: [
    "The status light's state joins the accessible label — never conveyed by colour alone — and its pulse runs only when motion is unreduced.",
    "Set decorative when a visible printed name carries the identity, so nothing is announced twice.",
    "The tile speaks Avatar's sizing and ring contract, so Avatar group stacks people and agents together without extra styling.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Identity" },
  { id: "working", label: "Working" },
  { id: "blocked", label: "Blocked" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
