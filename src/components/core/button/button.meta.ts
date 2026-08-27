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
    "Anchor and button props are mutually exclusive.",
    "Visible focus and disabled states are built in.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Primary" },
    { id: "secondary", label: "Secondary" },
    { id: "ghost", label: "Ghost" },
    { id: "danger", label: "Danger" },
  ],
);

export default meta;
