/** Authored identity, guidance, budgets, and terminal posture for slope. */

import { type ChartKindMeta, defineChartKindMeta } from "../../kind-meta.ts";

const slopeKindMeta: ChartKindMeta = defineChartKindMeta(
  {
    name: "Slope",
    slug: "slope",
    order: 60,
    description:
      "Each named item's before and after compared as one connecting line between two vertical ordinal axes, with direct labels instead of a legend. The terminal form is permanently a textual delta list — label, both authored values, a direction triangle, and the exact signed delta — not a drawing.",
    useWhen: [
      "Comparing how each of several named items moved between two named states or moments.",
      "Showing which items rose, which fell, and which held level across one shared change.",
    ],
    notWhen: [
      "Only one item is compared; a Stat with a trend slot serves a single before/after pair.",
      "Each item carries more than two measured moments; the line kind serves a trend.",
      "The reader compares magnitudes from a zero baseline; the bar kind's grouped variant serves that.",
    ],
    budgets: {
      items: {
        limit: 12,
        unit: "items",
        remedy: "aggregate-categories",
        description:
          "Maximum named items in one readable figure; each item carries two direct labels, so the ceiling matches the bar kind's category ceiling.",
      },
      itemLabelGraphemes: {
        limit: 32,
        unit: "graphemes",
        remedy: "shorten-label",
        description:
          "Maximum concise item label length; the label prints beside the plot on every surface.",
      },
      endpointLabelGraphemes: {
        limit: 16,
        unit: "graphemes",
        remedy: "shorten-label",
        description:
          "Maximum endpoint name length; both names caption an axis and head a terminal column.",
      },
      valueMagnitudeSpan: {
        limit: 4,
        unit: "decades",
        remedy: "split-figure",
        description:
          "Maximum decimal orders separating the smallest and largest nonzero value magnitudes; slope stays linear in v1, so wide spans split into focused figures.",
      },
    },
    cli: { stance: "enhanced", honesty: "exact" },
  } as const,
);

export default slopeKindMeta;
