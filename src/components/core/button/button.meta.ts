import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
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
