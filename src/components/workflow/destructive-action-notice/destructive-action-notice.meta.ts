import type { ComponentMeta } from "../../../types/component-meta.ts";
import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";

const meta = {
  name: "Destructive action notice",
  slug: "destructive-action-notice",
  group: "Workflow",
  order: 160,
  cli: { stance: "rendered" },
  description:
    "Explicit scope, impact, authority, and recovery route for an irreversible or owner-only action, with danger reserved for urgent hazards.",
  purposes: ["building-documentation", "procedural-workflow"],
  useWhen: [
    "An irreversible or owner-only action needs explicit scope, impact, authority, and recovery information.",
  ],
  notWhen: [
    "The content is an ordinary caution, page-level announcement, or recoverable validation message.",
  ],
  accessibility: [
    "Scope, impact, authority, and recovery are labelled definition-list facts rather than an undifferentiated warning paragraph.",
    "An immutable warning or danger token stays visible when a custom label adds context; colour reinforces only that actionable hazard instead of tinting the entire block.",
    "Warning uses a static note role by default; danger opts into an alert role and should be reserved for immediate hazards.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Approval warning" },
  { id: "danger", label: "Immediate danger" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
