import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Button",
  slug: "button",
  group: "Core",
  order: 20,
  description:
    "Typed button and anchor variants with vendor-neutral leading and trailing icon slots.",
  cli: { stance: "rendered" },
  accessibility: [
    "Busy retains the action identity and size, sets aria-busy, and disables native activation; the caller owns lifecycle and focus restoration.",
    "Unavailable actions keep readable muted ink on a sunken fill with a hairline edge, never opacity alone; busy keeps its variant paint and shows a loading ring that remains still under reduced motion.",
    "Anchor and button props are mutually exclusive; aria-disabled anchors omit href and leave keyboard navigation.",
    "Destructive actions require explicit visible wording such as Delete; danger colour alone does not communicate intent.",
    "Visible focus and disabled states are built in.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Primary" },
  { id: "secondary", label: "Secondary" },
  { id: "ghost", label: "Ghost" },
  { id: "danger", label: "Danger" },
  {
    id: "action-layout",
    label: "Action layout",
    only: "web",
    reason:
      "Terminal action text cannot exercise multiline CSS labels between SVG slots or native unavailable anchor navigation.",
  },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
