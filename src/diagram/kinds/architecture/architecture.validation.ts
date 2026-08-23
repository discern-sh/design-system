/** Complete semantic preflight for bounded architecture diagrams. */

import { DiagramValidationError } from "../../errors.ts";
import { diagramGraphemeCount } from "../../font-metrics.ts";
import {
  assertDiagramExactKeys,
  assertDiagramIdentifier,
  assertDiagramKindBudget,
  assertDiagramText,
  isDiagramRecord,
  validateDiagramCommonSpec,
} from "../../validation.ts";
import meta from "./architecture.meta.ts";
import type {
  ArchitectureDirection,
  ArchitectureNodeRole,
  ArchitectureRelationshipEmphasis,
  ValidatedArchitectureDiagram,
  ValidatedArchitectureGroup,
  ValidatedArchitectureNode,
  ValidatedArchitectureRelationship,
} from "./architecture.spec.ts";

const DIRECTIONS: readonly ArchitectureDirection[] = [
  "left-to-right",
  "top-to-bottom",
];
const NODE_ROLES: readonly ArchitectureNodeRole[] = [
  "service",
  "store",
  "external",
  "boundary",
  "focal",
];
const RELATIONSHIP_EMPHASES: readonly ArchitectureRelationshipEmphasis[] = [
  "primary",
  "secondary",
  "return",
];

function invalid(
  code:
    | "diagram/invalid-spec"
    | "diagram/duplicate-id"
    | "diagram/dangling-reference",
  message: string,
  path: string,
  remedy: string,
  facts: Readonly<Record<string, string | number | boolean>> = {},
): never {
  throw new DiagramValidationError({ code, message, path, remedy, facts });
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
  path: string,
): T {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    invalid(
      "diagram/invalid-spec",
      `${path} must be one of ${allowed.join(", ")}.`,
      path,
      "Choose one of the architecture kind's documented semantic values.",
    );
  }
  return value as T;
}

interface RawArchitectureNode {
  readonly id: string;
  readonly label: string;
  readonly annotation?: string;
  readonly role: ArchitectureNodeRole;
  readonly sourceOrder: number;
}

/** Validate every authored topology fact before layout sees it. */
export default function validateArchitectureDiagram(
  input: unknown,
): ValidatedArchitectureDiagram {
  const spec = validateDiagramCommonSpec(input, "architecture", [
    "kind",
    "title",
    "summary",
    "direction",
    "nodes",
    "relationships",
    "groups",
  ]);
  const direction = oneOf(
    spec.direction,
    DIRECTIONS,
    "left-to-right",
    "spec.direction",
  );
  if (!Array.isArray(spec.nodes) || spec.nodes.length < 2) {
    invalid(
      "diagram/invalid-spec",
      "spec.nodes must contain at least two system entities.",
      "spec.nodes",
      "Author a small bounded topology with at least two related entities.",
    );
  }
  if (!Array.isArray(spec.relationships) || spec.relationships.length === 0) {
    invalid(
      "diagram/invalid-spec",
      "spec.relationships must contain at least one labelled relationship.",
      "spec.relationships",
      "Connect two entities with a concise labelled directed relationship.",
    );
  }
  const groupValues = spec.groups ?? [];
  if (!Array.isArray(groupValues)) {
    invalid(
      "diagram/invalid-spec",
      "spec.groups must be an array when provided.",
      "spec.groups",
      "Use zero or more one-level ownership-boundary objects.",
    );
  }
  assertDiagramKindBudget(meta, "nodes", spec.nodes.length, "spec.nodes");
  assertDiagramKindBudget(
    meta,
    "relationships",
    spec.relationships.length,
    "spec.relationships",
  );
  assertDiagramKindBudget(meta, "groups", groupValues.length, "spec.groups");

  const semanticIds = new Set<string>();
  const rawNodes: RawArchitectureNode[] = [];
  for (const [index, value] of spec.nodes.entries()) {
    const path = `spec.nodes[${index}]`;
    if (!isDiagramRecord(value)) {
      invalid(
        "diagram/invalid-spec",
        `${path} must be an object.`,
        path,
        "Use the documented architecture node fields.",
      );
    }
    assertDiagramExactKeys(value, ["id", "label", "annotation", "role"], path);
    assertDiagramIdentifier(value.id, `${path}.id`);
    if (semanticIds.has(value.id)) {
      invalid(
        "diagram/duplicate-id",
        `Duplicate semantic identity ${value.id}.`,
        `${path}.id`,
        "Give every node, boundary, and relationship one stable unique identifier.",
        { id: value.id },
      );
    }
    semanticIds.add(value.id);
    assertDiagramText(value.label, `${path}.label`);
    if (value.annotation !== undefined) {
      assertDiagramText(value.annotation, `${path}.annotation`);
    }
    const role = oneOf(value.role, NODE_ROLES, "service", `${path}.role`);
    assertDiagramKindBudget(
      meta,
      "nodeLabelGraphemes",
      diagramGraphemeCount(value.label),
      `${path}.label`,
    );
    if (value.annotation !== undefined) {
      assertDiagramKindBudget(
        meta,
        "annotationGraphemes",
        diagramGraphemeCount(value.annotation),
        `${path}.annotation`,
      );
    }
    const base = {
      id: value.id,
      label: value.label,
      role,
      sourceOrder: index,
    } as const;
    rawNodes.push(
      value.annotation === undefined
        ? base
        : { ...base, annotation: value.annotation },
    );
  }
  assertDiagramKindBudget(
    meta,
    "focalNodes",
    rawNodes.filter((node) => node.role === "focal").length,
    "spec.nodes",
  );

  const rawGroups: ValidatedArchitectureGroup[] = [];
  for (const [index, value] of groupValues.entries()) {
    const path = `spec.groups[${index}]`;
    if (!isDiagramRecord(value)) {
      invalid(
        "diagram/invalid-spec",
        `${path} must be an object.`,
        path,
        "Use the documented one-level architecture group fields.",
      );
    }
    assertDiagramExactKeys(value, ["id", "label", "members"], path);
    assertDiagramIdentifier(value.id, `${path}.id`);
    if (semanticIds.has(value.id)) {
      invalid(
        "diagram/duplicate-id",
        `Duplicate semantic identity ${value.id}.`,
        `${path}.id`,
        "Give every node, boundary, and relationship one stable unique identifier.",
        { id: value.id },
      );
    }
    semanticIds.add(value.id);
    assertDiagramText(value.label, `${path}.label`);
    assertDiagramKindBudget(
      meta,
      "groupLabelGraphemes",
      diagramGraphemeCount(value.label),
      `${path}.label`,
    );
    if (!Array.isArray(value.members) || value.members.length === 0) {
      invalid(
        "diagram/invalid-spec",
        `${path}.members must name at least one node.`,
        `${path}.members`,
        "Remove the empty boundary or assign its owned nodes.",
      );
    }
    assertDiagramKindBudget(
      meta,
      "membersPerGroup",
      value.members.length,
      `${path}.members`,
    );
    const members: string[] = [];
    for (const [memberIndex, member] of value.members.entries()) {
      assertDiagramIdentifier(member, `${path}.members[${memberIndex}]`);
      if (members.includes(member)) {
        invalid(
          "diagram/duplicate-id",
          `${path}.members repeats node ${member}.`,
          `${path}.members[${memberIndex}]`,
          "List each boundary member exactly once.",
          { id: member },
        );
      }
      members.push(member);
    }
    rawGroups.push(Object.freeze({
      id: value.id,
      label: value.label,
      members: Object.freeze(members),
      sourceOrder: index,
    }));
  }

  const nodeById = new Map(rawNodes.map((node) => [node.id, node]));
  const groupIds = new Set(rawGroups.map((group) => group.id));
  const membership = new Map<string, string>();
  for (const group of rawGroups) {
    for (const [memberIndex, member] of group.members.entries()) {
      const path = `spec.groups[${group.sourceOrder}].members[${memberIndex}]`;
      if (groupIds.has(member)) {
        invalid(
          "diagram/invalid-spec",
          `Boundary ${group.id} refers to boundary ${member}; nested groups and group cycles are not supported.`,
          path,
          "Keep boundaries one level deep and list only node identifiers as members.",
          { groupId: group.id, member },
        );
      }
      if (!nodeById.has(member)) {
        invalid(
          "diagram/dangling-reference",
          `Boundary ${group.id} refers to missing node ${member}.`,
          path,
          "Add the node or remove the invalid boundary member.",
          { groupId: group.id, missing: member },
        );
      }
      const prior = membership.get(member);
      if (prior !== undefined) {
        invalid(
          "diagram/invalid-spec",
          `Node ${member} belongs to both ${prior} and ${group.id}.`,
          path,
          "Assign each node to at most one ownership boundary.",
          { nodeId: member, firstGroup: prior, secondGroup: group.id },
        );
      }
      membership.set(member, group.id);
    }
  }

  const relationships: ValidatedArchitectureRelationship[] = [];
  const endpointPairs = new Set<string>();
  const endpointCounts = new Map(rawNodes.map((node) => [node.id, 0]));
  for (const [index, value] of spec.relationships.entries()) {
    const path = `spec.relationships[${index}]`;
    if (!isDiagramRecord(value)) {
      invalid(
        "diagram/invalid-spec",
        `${path} must be an object.`,
        path,
        "Use the documented architecture relationship fields.",
      );
    }
    assertDiagramExactKeys(
      value,
      ["id", "from", "to", "label", "emphasis"],
      path,
    );
    assertDiagramIdentifier(value.id, `${path}.id`);
    if (semanticIds.has(value.id)) {
      invalid(
        "diagram/duplicate-id",
        `Duplicate semantic identity ${value.id}.`,
        `${path}.id`,
        "Give every node, boundary, and relationship one stable unique identifier.",
        { id: value.id },
      );
    }
    semanticIds.add(value.id);
    assertDiagramIdentifier(value.from, `${path}.from`);
    assertDiagramIdentifier(value.to, `${path}.to`);
    if (!nodeById.has(value.from) || !nodeById.has(value.to)) {
      const missing = !nodeById.has(value.from) ? value.from : value.to;
      invalid(
        "diagram/dangling-reference",
        `${path} refers to missing node ${missing}.`,
        path,
        "Add the node or correct the relationship endpoint identifier.",
        { missing },
      );
    }
    if (value.from === value.to) {
      invalid(
        "diagram/invalid-spec",
        `${path} cannot connect a node to itself.`,
        path,
        "Use a sequence self-message for ordered self-interaction, or target a distinct architecture node.",
      );
    }
    const endpointPair = `${value.from}\u0000${value.to}`;
    if (endpointPairs.has(endpointPair)) {
      invalid(
        "diagram/invalid-spec",
        `${path} duplicates the directed endpoints ${value.from} to ${value.to}.`,
        path,
        "Combine the facts into one labelled relationship or split the topology into focused views.",
      );
    }
    endpointPairs.add(endpointPair);
    assertDiagramText(value.label, `${path}.label`);
    assertDiagramKindBudget(
      meta,
      "relationshipLabelGraphemes",
      diagramGraphemeCount(value.label),
      `${path}.label`,
    );
    const emphasis = oneOf(
      value.emphasis,
      RELATIONSHIP_EMPHASES,
      "primary",
      `${path}.emphasis`,
    );
    relationships.push(Object.freeze({
      id: value.id,
      from: value.from,
      to: value.to,
      label: value.label,
      emphasis,
      sourceOrder: index,
    }));
    endpointCounts.set(value.from, (endpointCounts.get(value.from) ?? 0) + 1);
    endpointCounts.set(value.to, (endpointCounts.get(value.to) ?? 0) + 1);
  }
  for (const node of rawNodes) {
    assertDiagramKindBudget(
      meta,
      "endpointsPerNode",
      endpointCounts.get(node.id) ?? 0,
      `node ${node.id}`,
    );
  }

  const nodes: ValidatedArchitectureNode[] = rawNodes.map((node) => {
    const groupId = membership.get(node.id);
    return Object.freeze(
      groupId === undefined ? node : { ...node, groupId },
    );
  });
  const totalText = diagramGraphemeCount(spec.title) +
    diagramGraphemeCount(spec.summary) +
    nodes.reduce(
      (total, node) =>
        total + diagramGraphemeCount(node.label) +
        (node.annotation === undefined
          ? 0
          : diagramGraphemeCount(node.annotation)),
      0,
    ) +
    rawGroups.reduce(
      (total, group) => total + diagramGraphemeCount(group.label),
      0,
    ) +
    relationships.reduce(
      (total, relationship) => total + diagramGraphemeCount(relationship.label),
      0,
    );
  assertDiagramKindBudget(meta, "totalTextGraphemes", totalText, "spec");

  return Object.freeze({
    kind: "architecture",
    title: spec.title,
    summary: spec.summary,
    direction,
    nodes: Object.freeze(nodes),
    relationships: Object.freeze(relationships),
    groups: Object.freeze(rawGroups),
  });
}
