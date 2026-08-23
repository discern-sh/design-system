/** Authored identity, guidance, budgets, and terminal posture for timeline. */

import {
  defineDiagramKindMeta,
  type DiagramKindMeta,
} from "../../kind-meta.ts";

const timelineKindMeta: DiagramKindMeta = defineDiagramKindMeta(
  {
    name: "Timeline",
    slug: "timeline",
    order: 50,
    description:
      "A bounded Gregorian calendar plan whose half-open task spans and one-date gates share stable labelled rows and groups.",
    useWhen: [
      "Comparing scheduled work across an explicit ISO calendar-date range.",
      "Showing duration bars and dated gates whose calendar position is a reference fact.",
    ],
    notWhen: [
      "Narrating dated events or history; use the Editorial Timeline Component.",
      "Showing dependencies without committed dates; use flow or prose.",
      "Free-form roadmaps, live planning controls, and timezone-aware schedules remain consumer-owned.",
    ],
    budgets: {
      groups: {
        limit: 5,
        unit: "groups",
        remedy: "split-group",
        description: "Maximum labelled plan boundaries in one calendar view.",
      },
      rows: {
        limit: 14,
        unit: "rows",
        remedy: "split-group",
        description: "Maximum stable work rows across all plan groups.",
      },
      tasks: {
        limit: 28,
        unit: "tasks",
        remedy: "split-overview",
        description: "Maximum half-open duration bars in one plan.",
      },
      milestones: {
        limit: 10,
        unit: "milestones",
        remedy: "split-overview",
        description: "Maximum one-date gates in one plan.",
      },
      itemsPerRow: {
        limit: 6,
        unit: "items per row",
        remedy: "split-group",
        description: "Maximum task and milestone lanes owned by one row.",
      },
      rangeDays: {
        limit: 550,
        unit: "days",
        remedy: "shorten-range",
        description: "Maximum half-open calendar span in one readable scale.",
      },
      groupLabelGraphemes: {
        limit: 48,
        unit: "graphemes",
        remedy: "shorten-label",
        description: "Maximum concise group label length.",
      },
      annotationGraphemes: {
        limit: 72,
        unit: "graphemes",
        remedy: "shorten-label",
        description: "Maximum concise group annotation length.",
      },
      rowLabelGraphemes: {
        limit: 48,
        unit: "graphemes",
        remedy: "shorten-label",
        description: "Maximum stable row label length.",
      },
      itemLabelGraphemes: {
        limit: 64,
        unit: "graphemes",
        remedy: "shorten-label",
        description: "Maximum task or milestone label length.",
      },
      groupLabelLines: {
        limit: 2,
        unit: "wrapped lines",
        remedy: "shorten-label",
        description: "Maximum wrapped group-label density.",
      },
      annotationLines: {
        limit: 2,
        unit: "wrapped lines",
        remedy: "shorten-label",
        description: "Maximum wrapped group-annotation density.",
      },
      rowLabelLines: {
        limit: 2,
        unit: "wrapped lines",
        remedy: "shorten-label",
        description: "Maximum wrapped row-label density.",
      },
      itemLabelLines: {
        limit: 2,
        unit: "wrapped lines",
        remedy: "shorten-label",
        description: "Maximum wrapped task or milestone label density.",
      },
      tickLabelLines: {
        limit: 1,
        unit: "wrapped lines",
        remedy: "shorten-range",
        description: "Calendar ticks remain single-line ISO dates.",
      },
      totalTextGraphemes: {
        limit: 1_200,
        unit: "graphemes",
        remedy: "split-overview",
        description: "Maximum complete wording in one calendar plan.",
      },
      sceneExtent: {
        limit: 2_400,
        unit: "user-space units",
        remedy: "shorten-range",
        description: "Maximum width or height of the final tight scene.",
      },
    },
    cli: { stance: "description" },
  } as const,
);

export default timelineKindMeta;
