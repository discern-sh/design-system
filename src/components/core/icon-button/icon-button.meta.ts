import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Icon button",
  slug: "icon-button",
  group: "Core",
  order: 30,
  description:
    "Square icon action with a required accessible label and injected graphic.",
  cli: { stance: "rendered" },
  accessibility: [
    "Busy retains the action identity and size, sets aria-busy, and disables native activation; the caller owns lifecycle and focus restoration.",
    "Unavailable actions keep readable muted ink on a sunken fill with a hairline edge, never opacity alone; busy keeps its variant paint and shows a loading ring that remains still under reduced motion.",
    "A text label is required even when only an icon is visible.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Quiet" },
  { id: "outline", label: "Outline" },
  {
    id: "action-layout",
    label: "Action layout",
    only: "web",
    reason:
      "Terminal labelled glyphs cannot exercise square browser hit targets, injected SVG sizing, or disabled native focus.",
  },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
