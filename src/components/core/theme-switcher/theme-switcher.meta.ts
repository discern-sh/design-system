import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Theme switcher",
  slug: "theme-switcher",
  group: "Core",
  order: 50,
  description:
    "Controlled System, Light, and Dark preference group for settings and deterministic theme inspection.",
  useWhen: [
    "A settings surface lets users make an explicit future-facing appearance preference.",
    "A design or inspection tool needs deterministic System, Light, and Dark choices.",
  ],
  notWhen: [
    "Use Theme toggle for a persistent header or footer control whose job is an immediate comfort adjustment.",
  ],
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

export const componentExampleVocabulary = [{
  id: "default",
  label: "Theme preference",
  only: "web",
}] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
