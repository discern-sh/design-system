/** Authored identity, guidance, budgets, and terminal posture for architecture. */

import {
  defineDiagramKindMeta,
  type DiagramKindMeta,
} from "../../kind-meta.ts";

const architectureKindMeta: DiagramKindMeta = defineDiagramKindMeta(
  {
    name: "Architecture",
    slug: "architecture",
    order: 20,
    description:
      "A bounded system topology whose entities, one-level ownership boundaries, and labelled directed relationships remain referenceable over time.",
    useWhen: [
      "Mapping which services, stores, boundaries, and external systems exist and how they relate.",
      "Showing one focal entity or primary route within a small owned topology.",
    ],
    notWhen: [
      "Explaining chronological interaction between participants; use sequence.",
      "Showing a staged process or state transition; use flow.",
      "Nested containers, arbitrary ports, free placement, or a network-scale graph are required.",
    ],
    budgets: {
      nodes: {
        limit: 12,
        unit: "nodes",
        remedy: "split-overview",
        description: "Maximum system entities in one reference topology.",
      },
      relationships: {
        limit: 16,
        unit: "relationships",
        remedy: "split-overview",
        description: "Maximum directed relationships in one topology.",
      },
      groups: {
        limit: 4,
        unit: "boundaries",
        remedy: "split-group",
        description: "Maximum one-level ownership boundaries.",
      },
      membersPerGroup: {
        limit: 6,
        unit: "members",
        remedy: "split-group",
        description: "Maximum entities inside one readable boundary.",
      },
      endpointsPerNode: {
        limit: 6,
        unit: "relationship endpoints",
        remedy: "split-group",
        description: "Maximum relationship density at one entity.",
      },
      focalNodes: {
        limit: 1,
        unit: "focal nodes",
        remedy: "split-overview",
        description: "Maximum explicitly focal entity in one topology.",
      },
      nodeLabelGraphemes: {
        limit: 64,
        unit: "graphemes",
        remedy: "shorten-label",
        description: "Maximum concise entity label length.",
      },
      annotationGraphemes: {
        limit: 88,
        unit: "graphemes",
        remedy: "shorten-label",
        description: "Maximum secondary entity annotation length.",
      },
      groupLabelGraphemes: {
        limit: 48,
        unit: "graphemes",
        remedy: "shorten-label",
        description: "Maximum ownership-boundary label length.",
      },
      relationshipLabelGraphemes: {
        limit: 56,
        unit: "graphemes",
        remedy: "shorten-label",
        description: "Maximum directed relationship label length.",
      },
      nodeLabelLines: {
        limit: 3,
        unit: "wrapped lines",
        remedy: "shorten-label",
        description: "Maximum entity-label density after wrapping.",
      },
      annotationLines: {
        limit: 3,
        unit: "wrapped lines",
        remedy: "shorten-label",
        description: "Maximum role-and-annotation density after wrapping.",
      },
      groupLabelLines: {
        limit: 2,
        unit: "wrapped lines",
        remedy: "shorten-label",
        description: "Maximum boundary-label density after wrapping.",
      },
      relationshipLabelLines: {
        limit: 2,
        unit: "wrapped lines",
        remedy: "shorten-label",
        description: "Maximum relationship-label density after wrapping.",
      },
      totalTextGraphemes: {
        limit: 1_200,
        unit: "graphemes",
        remedy: "split-overview",
        description: "Maximum total accessible wording in one topology.",
      },
      sceneExtent: {
        limit: 5_200,
        unit: "user-space units",
        remedy: "split-overview",
        description: "Maximum width or height of the final tight scene.",
      },
    },
    cli: { stance: "description" },
  } as const,
);

export default architectureKindMeta;
