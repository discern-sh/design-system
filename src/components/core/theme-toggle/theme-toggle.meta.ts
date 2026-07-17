import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Theme toggle",
  slug: "theme-toggle",
  group: "Core",
  order: 40,
  description:
    "Controlled light/dark theme switch; the consumer owns the theme state and applies it to its root.",
  accessibility: [
    "The accessible name states the destination theme and swaps with the state, so the action is always explicit.",
    "The glyph is decorative and hidden; the component never mutates the document itself, keeping theme application observable by the consumer.",
  ],
} satisfies ComponentMeta;
