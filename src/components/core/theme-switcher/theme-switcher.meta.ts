import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Theme switcher",
  slug: "theme-switcher",
  group: "Core",
  order: 50,
  description:
    "Controlled System, Light, and Dark preference group for applying the design system theme contract.",
  cli: {
    stance: "exempt",
    reason:
      "Terminal colour selection is already a caller-owned renderer input; presenting a System, Light, and Dark form would falsely imply an input driver and persistence policy.",
  },
  accessibility: [
    "Native radio inputs preserve one-of-three selection semantics and keyboard navigation.",
    "A fieldset and visually hidden legend name the preference group; every choice retains a visible text label.",
    "The consumer owns persistence and applies system, light, or dark to its opted-in root.",
  ],
} satisfies ComponentMeta;
