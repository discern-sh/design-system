import type { ComponentMeta } from "../../../types/component-meta.ts";
export default {
  name: "Receipt",
  slug: "receipt",
  group: "Agents",
  order: 60,
  description:
    "Monospace proof-of-work card — a stamped title, metadata rows, and dot-leadered check lines recording what ran and how it ended.",
  accessibility: [
    "Check outcomes are spoken as visually hidden text after each value; the glyphs are hidden decoration paired with colour, never colour alone.",
    "Metadata and checks render as definition lists, so each label stays programmatically bound to its value.",
    "The dot leaders are painted decoration behind the text, invisible to assistive technology and absent in forced-colour modes.",
  ],
} satisfies ComponentMeta;
