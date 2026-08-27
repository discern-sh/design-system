import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Tooltip",
  slug: "tooltip",
  group: "Feedback",
  order: 30,
  description:
    "Hover and focus tooltip that connects its bubble through aria-describedby.",
  cli: {
    stance: "exempt",
    reason:
      "A tooltip is hidden supplementary text disclosed by browser hover or focus; terminal output has no equivalent trigger-to-bubble interaction and should print essential guidance directly.",
  },
  behaviors: ["floating-surface"],
  accessibility: [
    "The trigger must remain independently focusable when it represents an action.",
    "The emitted browser behavior promotes supported bubbles to the top layer; the static CSS fallback remains available without JavaScript.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Icon trigger", only: "web" },
  { id: "bottom", label: "Bottom placement", only: "web" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
