/** Authored identity, guidance, budgets, and terminal posture for flow. */

import {
  defineDiagramKindMeta,
  type DiagramKindMeta,
} from "../../kind-meta.ts";

const flowKindMeta: DiagramKindMeta = defineDiagramKindMeta(
  {
    name: "Flow",
    slug: "flow",
    order: 10,
    description:
      "A deterministic directed process whose main progression forms readable layers and whose explicit return edges close documented loops.",
    useWhen: [
      "Explaining a documentation-scale process, review path, or staged pipeline.",
      "Showing a restrained branch or a clearly marked return to an earlier step.",
    ],
    notWhen: [
      "Showing system containment or service topology; use architecture.",
      "Teaching a repeating lifecycle as the primary idea; use cycle.",
      "The reader must follow stable participants and messages; use sequence.",
      "The reader must compare calendar ranges, tasks, or gates; use timeline.",
      "Coordinates, arbitrary ports, clusters, or unconstrained graph layout are required.",
    ],
    budgets: {
      nodes: {
        limit: 15,
        unit: "nodes",
        remedy: "split-overview",
        description: "Maximum process entities in one readable reference flow.",
      },
      edges: {
        limit: 24,
        unit: "edges",
        remedy: "split-overview",
        description: "Maximum directed relationships in one flow.",
      },
      rankDepth: {
        limit: 9,
        unit: "tiers",
        remedy: "reduce-tier",
        description: "Maximum longest-path depth in the non-return graph.",
      },
      rankWidth: {
        limit: 4,
        unit: "nodes per tier",
        remedy: "split-overview",
        description: "Maximum peer population within one semantic tier.",
      },
      nodeLabelGraphemes: {
        limit: 72,
        unit: "graphemes",
        remedy: "shorten-label",
        description: "Maximum concise primary node label length.",
      },
      annotationGraphemes: {
        limit: 96,
        unit: "graphemes",
        remedy: "shorten-label",
        description: "Maximum secondary node annotation length.",
      },
      edgeLabelGraphemes: {
        limit: 48,
        unit: "graphemes",
        remedy: "shorten-label",
        description: "Maximum directed relationship label length.",
      },
      nodeLabelLines: {
        limit: 3,
        unit: "wrapped lines",
        remedy: "shorten-label",
        description:
          "Maximum primary label density after conservative wrapping.",
      },
      annotationLines: {
        limit: 2,
        unit: "wrapped lines",
        remedy: "shorten-label",
        description: "Maximum annotation density after conservative wrapping.",
      },
      edgeLabelLines: {
        limit: 2,
        unit: "wrapped lines",
        remedy: "shorten-label",
        description: "Maximum relationship-label density after wrapping.",
      },
      totalTextGraphemes: {
        limit: 900,
        unit: "graphemes",
        remedy: "split-overview",
        description: "Maximum total accessible wording in one flow.",
      },
      sceneExtent: {
        limit: 2_400,
        unit: "user-space units",
        remedy: "split-overview",
        description: "Maximum width or height of the final tight scene.",
      },
    },
    cli: { stance: "enhanced" },
  } as const,
);

export default flowKindMeta;
