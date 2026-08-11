import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Code listing",
  slug: "code-listing",
  group: "Editorial",
  order: 80,
  cli: { stance: "rendered" },
  description:
    "Captioned source listing with file and language context, stable line numbers, horizontal overflow, and optional highlighted lines.",
  purposes: ["building-documentation"],
  accessibility: [
    "Source remains semantic preformatted code; line numbers and highlights do not alter its readable text.",
    "Long lines scroll horizontally rather than being visually reflowed into invalid code.",
  ],
} satisfies ComponentMeta;
