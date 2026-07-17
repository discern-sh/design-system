import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Breadcrumbs",
  slug: "breadcrumbs",
  group: "Navigation",
  order: 20,
  description:
    "Scrollable hierarchical page location with linked ancestors and one explicit current page.",
  accessibility: [
    "A configurable label names the navigation landmark, and the hierarchy remains an ordered list.",
    "Only the final, unlinked item carries aria-current=page; visual separators are hidden from assistive technology.",
  ],
} satisfies ComponentMeta;
