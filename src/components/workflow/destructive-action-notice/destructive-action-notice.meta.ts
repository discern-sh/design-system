import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Destructive action notice",
  slug: "destructive-action-notice",
  group: "Workflow",
  order: 160,
  description:
    "Explicit scope, impact, authority, and recovery route for an irreversible or owner-only action, with danger reserved for urgent hazards.",
  accessibility: [
    "Scope, impact, authority, and recovery are labelled definition-list facts rather than an undifferentiated warning paragraph.",
    "The visible label carries the warning; colour reinforces only that actionable hazard instead of tinting the entire block.",
    "Warning uses a static note role by default; danger opts into an alert role and should be reserved for immediate hazards.",
  ],
} satisfies ComponentMeta;
