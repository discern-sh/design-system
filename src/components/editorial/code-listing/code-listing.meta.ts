import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Code listing",
  slug: "code-listing",
  group: "Editorial",
  order: 80,
  cli: { stance: "rendered" },
  description:
    "Captioned source listing with standard and campaign showcase treatments, file and language context, stable line numbers, horizontal overflow, and optional highlighted lines.",
  purposes: ["building-documentation", "marketing-site"],
  useWhen: [
    "A reader needs source with stable line references; use showcase when the listing is visual evidence inside a campaign page.",
  ],
  accessibility: [
    "Source remains semantic preformatted code; line numbers and highlights do not alter its readable text.",
    "Long lines scroll horizontally rather than being visually reflowed into invalid code.",
    "Showcase keeps the same semantic code and caption while using stable inverse roles in both themes.",
  ],
} satisfies ComponentMeta;
