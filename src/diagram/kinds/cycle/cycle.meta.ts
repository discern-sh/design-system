/** Authored identity, guidance, budgets, and terminal posture for cycle. */

import {
  defineDiagramKindMeta,
  type DiagramKindMeta,
} from "../../kind-meta.ts";

const cycleKindMeta: DiagramKindMeta = defineDiagramKindMeta(
  {
    name: "Cycle",
    slug: "cycle",
    order: 30,
    description:
      "An authored repeating order of stages with one optional shared hub and explicitly directed, labelled stage-to-hub relationships.",
    useWhen: [
      "Documenting a lifecycle, review rhythm, or feedback practice whose repetition is the primary fact.",
      "Showing how ordered stages exchange named signals or outcomes with one shared concept.",
    ],
    notWhen: [
      "The reader needs a process with branches or explicit returns rather than a repeating order; use flow.",
      "The reader needs an intuition-building physical metaphor, animation, or controls; keep that work consumer-owned.",
      "The subject has multiple hubs, unordered peers, or network-scale relationships; split it into smaller reference diagrams.",
    ],
    budgets: {
      stages: {
        limit: 8,
        unit: "stages",
        remedy: "split-overview",
        description: "Maximum ordered stages around one readable ring.",
      },
      spokes: {
        limit: 8,
        unit: "hub relationships",
        remedy: "split-overview",
        description: "Maximum named stage-to-hub relationships in one cycle.",
      },
      stageLabelGraphemes: {
        limit: 56,
        unit: "graphemes",
        remedy: "shorten-label",
        description: "Maximum concise primary stage label length.",
      },
      hubLabelGraphemes: {
        limit: 56,
        unit: "graphemes",
        remedy: "shorten-label",
        description: "Maximum concise shared-hub label length.",
      },
      annotationGraphemes: {
        limit: 72,
        unit: "graphemes",
        remedy: "shorten-label",
        description: "Maximum secondary stage or hub annotation length.",
      },
      spokeLabelGraphemes: {
        limit: 48,
        unit: "graphemes",
        remedy: "shorten-label",
        description: "Maximum stage-to-hub relationship label length.",
      },
      stageLabelLines: {
        limit: 2,
        unit: "wrapped lines",
        remedy: "shorten-label",
        description:
          "Maximum primary stage-label density after conservative wrapping.",
      },
      hubLabelLines: {
        limit: 2,
        unit: "wrapped lines",
        remedy: "shorten-label",
        description:
          "Maximum primary hub-label density after conservative wrapping.",
      },
      annotationLines: {
        limit: 2,
        unit: "wrapped lines",
        remedy: "shorten-label",
        description:
          "Maximum stage or hub annotation density after conservative wrapping.",
      },
      spokeLabelLines: {
        limit: 2,
        unit: "wrapped lines",
        remedy: "shorten-label",
        description:
          "Maximum hub-relationship label density after conservative wrapping.",
      },
      totalTextGraphemes: {
        limit: 720,
        unit: "graphemes",
        remedy: "split-overview",
        description: "Maximum total accessible wording in one cycle.",
      },
      sceneExtent: {
        limit: 1_800,
        unit: "user-space units",
        remedy: "split-overview",
        description: "Maximum width or height of the final tight scene.",
      },
    },
    cli: { stance: "enhanced" },
  } as const,
);

export default cycleKindMeta;
