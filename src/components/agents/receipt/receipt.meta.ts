import type { ComponentMeta } from "../../../types/component-meta.ts";
export default {
  name: "Receipt",
  slug: "receipt",
  group: "Agents",
  order: 60,
  cli: { stance: "rendered" },
  description:
    "Proof-of-work card with a stamped title, metadata rows, and dot-leadered check lines recording what ran and how it ended.",
  purposes: ["displaying-tool-output"],
  useWhen: [
    "A durable handoff must record several checks and their outcomes with branch, commit, timing, or change metadata.",
  ],
  notWhen: [
    "You need the plain-language outcome and next action for one tool run; use Result summary.",
  ],
  accessibility: [
    "Check outcomes are spoken as visually hidden text after each value; the glyphs are hidden decoration paired with colour, never colour alone.",
    "Metadata and checks render as definition lists, so each label stays programmatically bound to its value.",
    "The dot leaders are painted decoration behind the text, invisible to assistive technology and absent in forced-colour modes.",
  ],
} satisfies ComponentMeta;
