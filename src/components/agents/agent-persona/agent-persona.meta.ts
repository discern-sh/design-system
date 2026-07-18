import type { ComponentMeta } from "../../../types/component-meta.ts";
export default {
  name: "Agent persona",
  slug: "agent-persona",
  group: "Agents",
  order: 20,
  description:
    "Identity lockup pairing an Agent avatar with a name and monospace detail line — the row form for fleet views, tables, and activity chrome.",
  accessibility: [
    "The visible name is the single source of identity: the built-in avatar renders decorative so nothing is announced twice.",
    "Status is spoken as visually hidden text directly after the name, never conveyed by colour alone.",
    "Name and detail truncate visually with an ellipsis while the full text stays available to assistive technology.",
  ],
} satisfies ComponentMeta;
