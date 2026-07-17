import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Kbd",
  slug: "kbd",
  group: "Docs",
  order: 70,
  description:
    "Keycap-styled display of one keyboard key or chord segment using the semantic kbd element.",
  accessibility: [
    "The semantic kbd element identifies keyboard input to assistive technology without extra ARIA.",
    "Keycap text inherits the monospace stack at the interface-text floor size and holds contrast in both themes.",
  ],
} satisfies ComponentMeta;
