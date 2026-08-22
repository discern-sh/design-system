/** Complete semantic preflight and deterministic rank assignment for flow. */

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
import meta from "./flow.meta.ts";
import type {
  FlowDirection,
  FlowEdgeEmphasis,
  FlowNodeRole,
  ValidatedFlowDiagram,
  ValidatedFlowEdge,
  ValidatedFlowNode,
} from "./flow.spec.ts";

const DIRECTIONS: readonly FlowDirection[] = ["top-to-bottom", "left-to-right"];
const NODE_ROLES: readonly FlowNodeRole[] = [
  "step",
  "decision",
  "start",
  "end",
];
const EDGE_EMPHASES: readonly FlowEdgeEmphasis[] = [
  "primary",
  "secondary",
  "return",
];

function invalid(
  code:
    | "diagram/invalid-spec"
    | "diagram/duplicate-id"
    | "diagram/dangling-reference"
    | "diagram/disconnected-graph"
    | "diagram/primary-cycle"
    | "diagram/invalid-flow-role"
    | "diagram/invalid-return-edge",
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
      "Choose one of the kind's authored semantic values.",
    );
  }
  return value as T;
}

function freezeNode(
  node: Omit<ValidatedFlowNode, "rank" | "rankOrder">,
  rank: number,
  rankOrder: number,
): ValidatedFlowNode {
  return Object.freeze({ ...node, rank, rankOrder });
}

function connectedNodeIds(
  nodeIds: readonly string[],
  edges: readonly ValidatedFlowEdge[],
): Set<string> {
  const adjacency = new Map(nodeIds.map((id) => [id, new Set<string>()]));
  for (const edge of edges) {
    adjacency.get(edge.from)?.add(edge.to);
    adjacency.get(edge.to)?.add(edge.from);
  }
  const first = nodeIds[0];
  if (first === undefined) return new Set();
  const reached = new Set([first]);
  const queue = [first];
  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined) continue;
    for (const neighbor of adjacency.get(id) ?? []) {
      if (!reached.has(neighbor)) {
        reached.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return reached;
}

/** Validate all authored semantics before layout sees the flow. */
export default function validateFlowDiagram(
  input: unknown,
): ValidatedFlowDiagram {
  const spec = validateDiagramCommonSpec(input, "flow", [
    "kind",
    "title",
    "summary",
    "direction",
    "nodes",
    "edges",
  ]);
  const direction = oneOf(
    spec.direction,
    DIRECTIONS,
    "top-to-bottom",
    "spec.direction",
  );
  if (!Array.isArray(spec.nodes) || spec.nodes.length === 0) {
    invalid(
      "diagram/invalid-spec",
      "spec.nodes must contain at least one process node.",
      "spec.nodes",
      "Author a small connected process with explicit start and end nodes.",
    );
  }
  if (!Array.isArray(spec.edges) || spec.edges.length === 0) {
    invalid(
      "diagram/invalid-spec",
      "spec.edges must contain at least one directed relationship.",
      "spec.edges",
      "Connect the process nodes with a directed main flow.",
    );
  }
  assertDiagramKindBudget(meta, "nodes", spec.nodes.length, "spec.nodes");
  assertDiagramKindBudget(meta, "edges", spec.edges.length, "spec.edges");

  const semanticIds = new Set<string>();
  const rawNodes: Array<Omit<ValidatedFlowNode, "rank" | "rankOrder">> = [];
  for (const [index, value] of spec.nodes.entries()) {
    const path = `spec.nodes[${index}]`;
    if (!isDiagramRecord(value)) {
      invalid(
        "diagram/invalid-spec",
        `${path} must be an object.`,
        path,
        "Use the documented flow node fields.",
      );
    }
    assertDiagramExactKeys(value, ["id", "label", "annotation", "role"], path);
    assertDiagramIdentifier(value.id, `${path}.id`);
    if (semanticIds.has(value.id)) {
      invalid(
        "diagram/duplicate-id",
        `Duplicate semantic identity ${value.id}.`,
        `${path}.id`,
        "Give every node and edge one stable unique identifier.",
        { id: value.id },
      );
    }
    semanticIds.add(value.id);
    assertDiagramText(value.label, `${path}.label`);
    if (value.annotation !== undefined) {
      assertDiagramText(value.annotation, `${path}.annotation`);
    }
    const role = oneOf(value.role, NODE_ROLES, "step", `${path}.role`);
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
  const nodeById = new Map(rawNodes.map((node) => [node.id, node]));
  const edges: ValidatedFlowEdge[] = [];
  const endpointPairs = new Set<string>();
  for (const [index, value] of spec.edges.entries()) {
    const path = `spec.edges[${index}]`;
    if (!isDiagramRecord(value)) {
      invalid(
        "diagram/invalid-spec",
        `${path} must be an object.`,
        path,
        "Use the documented flow edge fields.",
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
        "Give every node and edge one stable unique identifier.",
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
        "Add the node or correct the edge endpoint identifier.",
        { missing },
      );
    }
    if (value.from === value.to) {
      invalid(
        "diagram/invalid-return-edge",
        `${path} cannot connect a node to itself.`,
        path,
        "Express a return to an earlier distinct process node.",
      );
    }
    const endpointPair = `${value.from}\u0000${value.to}`;
    if (endpointPairs.has(endpointPair)) {
      invalid(
        "diagram/invalid-spec",
        `${path} duplicates the directed endpoints ${value.from} to ${value.to}.`,
        path,
        "Combine the relationship into one labelled edge or target distinct branch nodes.",
      );
    }
    endpointPairs.add(endpointPair);
    if (value.label !== undefined) {
      assertDiagramText(value.label, `${path}.label`);
      assertDiagramKindBudget(
        meta,
        "edgeLabelGraphemes",
        diagramGraphemeCount(value.label),
        `${path}.label`,
      );
    }
    const emphasis = oneOf(
      value.emphasis,
      EDGE_EMPHASES,
      "primary",
      `${path}.emphasis`,
    );
    const base = {
      id: value.id,
      from: value.from,
      to: value.to,
      emphasis,
      sourceOrder: index,
    } as const;
    edges.push(
      Object.freeze(
        value.label === undefined ? base : { ...base, label: value.label },
      ),
    );
  }

  const reached = connectedNodeIds(rawNodes.map((node) => node.id), edges);
  if (reached.size !== rawNodes.length) {
    const missing = rawNodes.find((node) => !reached.has(node.id))?.id ??
      "unknown";
    invalid(
      "diagram/disconnected-graph",
      `Flow node ${missing} is disconnected from the authored process.`,
      "spec.nodes",
      "Connect every node or split independent processes into separate diagrams.",
      { nodeId: missing },
    );
  }

  const mainEdges = edges.filter((edge) => edge.emphasis !== "return");
  const incoming = new Map(
    rawNodes.map((node) => [node.id, [] as ValidatedFlowEdge[]]),
  );
  const outgoing = new Map(
    rawNodes.map((node) => [node.id, [] as ValidatedFlowEdge[]]),
  );
  for (const edge of mainEdges) {
    incoming.get(edge.to)?.push(edge);
    outgoing.get(edge.from)?.push(edge);
  }
  const sourceOrder = new Map(
    rawNodes.map((node) => [node.id, node.sourceOrder]),
  );
  const indegree = new Map(
    rawNodes.map((node) => [node.id, incoming.get(node.id)?.length ?? 0]),
  );
  const ready = rawNodes.filter((node) => indegree.get(node.id) === 0).map((
    node,
  ) => node.id);
  const sortIds = (ids: string[]): void =>
    void ids.sort((left, right) =>
      (sourceOrder.get(left) ?? 0) - (sourceOrder.get(right) ?? 0) ||
      left.localeCompare(right)
    );
  sortIds(ready);
  const topological: string[] = [];
  while (ready.length > 0) {
    const id = ready.shift();
    if (id === undefined) continue;
    topological.push(id);
    for (const edge of outgoing.get(id) ?? []) {
      const next = (indegree.get(edge.to) ?? 0) - 1;
      indegree.set(edge.to, next);
      if (next === 0) {
        ready.push(edge.to);
        sortIds(ready);
      }
    }
  }
  if (topological.length !== rawNodes.length) {
    invalid(
      "diagram/primary-cycle",
      "The non-return flow contains a directed cycle.",
      "spec.edges",
      "Mark a genuine backwards loop as return, or remove the cyclic relationship.",
    );
  }

  const rankById = new Map(rawNodes.map((node) => [node.id, 0]));
  for (const id of topological) {
    for (const edge of outgoing.get(id) ?? []) {
      rankById.set(
        edge.to,
        Math.max(rankById.get(edge.to) ?? 0, (rankById.get(id) ?? 0) + 1),
      );
    }
  }
  const depth = Math.max(...rankById.values()) + 1;
  assertDiagramKindBudget(meta, "rankDepth", depth, "spec.edges");
  const ranks: string[][] = Array.from({ length: depth }, () => []);
  for (const node of rawNodes) ranks[rankById.get(node.id) ?? 0]?.push(node.id);
  const position = new Map<string, number>();
  for (const [rankIndex, members] of ranks.entries()) {
    members.sort((left, right) => {
      const predecessorPosition = (id: string): number => {
        const predecessors = incoming.get(id) ?? [];
        if (predecessors.length === 0) return sourceOrder.get(id) ?? 0;
        return predecessors.reduce(
          (sum, edge) =>
            sum + (position.get(edge.from) ?? sourceOrder.get(edge.from) ?? 0),
          0,
        ) / predecessors.length;
      };
      return predecessorPosition(left) - predecessorPosition(right) ||
        (sourceOrder.get(left) ?? 0) - (sourceOrder.get(right) ?? 0) ||
        left.localeCompare(right);
    });
    assertDiagramKindBudget(
      meta,
      "rankWidth",
      members.length,
      `flow rank ${rankIndex + 1}`,
    );
    members.forEach((id, index) => position.set(id, index));
  }

  for (const node of rawNodes) {
    const incomingCount = incoming.get(node.id)?.length ?? 0;
    const outgoingEdges = outgoing.get(node.id) ?? [];
    const allOutgoingCount = edges.filter((edge) => edge.from === node.id)
      .length;
    if (node.role === "start" && incomingCount !== 0) {
      invalid(
        "diagram/invalid-flow-role",
        `Start node ${node.id} has incoming main-flow edges.`,
        `spec.nodes[${node.sourceOrder}].role`,
        "Use start only for a source node, or change the node to step.",
      );
    }
    if (node.role === "end" && allOutgoingCount !== 0) {
      invalid(
        "diagram/invalid-flow-role",
        `End node ${node.id} has outgoing main-flow edges.`,
        `spec.nodes[${node.sourceOrder}].role`,
        "Use end only for a main-flow sink, or change the node to step.",
      );
    }
    if (incomingCount === 0 && node.role !== "start") {
      invalid(
        "diagram/invalid-flow-role",
        `Source node ${node.id} must carry the start role.`,
        `spec.nodes[${node.sourceOrder}].role`,
        "Mark the source as start so its process meaning survives every projection.",
      );
    }
    if (allOutgoingCount === 0 && node.role !== "end") {
      invalid(
        "diagram/invalid-flow-role",
        `Sink node ${node.id} must carry the end role.`,
        `spec.nodes[${node.sourceOrder}].role`,
        "Mark the sink as end so its process meaning survives every projection.",
      );
    }
    if (node.role === "decision") {
      if (
        outgoingEdges.length < 2 ||
        outgoingEdges.some((edge) => edge.label === undefined)
      ) {
        invalid(
          "diagram/invalid-flow-role",
          `Decision node ${node.id} needs at least two labelled outgoing main-flow edges.`,
          `spec.nodes[${node.sourceOrder}].role`,
          "Label each branch with the condition a non-visual reader needs.",
        );
      }
    } else if (outgoingEdges.length > 1) {
      invalid(
        "diagram/invalid-flow-role",
        `Non-decision node ${node.id} has multiple outgoing main-flow edges.`,
        `spec.nodes[${node.sourceOrder}].role`,
        "Mark a genuine branch as decision or keep one main progression.",
      );
    }
  }
  for (
    const edge of edges.filter((candidate) => candidate.emphasis === "return")
  ) {
    const fromRank = rankById.get(edge.from) ?? 0;
    const toRank = rankById.get(edge.to) ?? 0;
    if (fromRank <= toRank) {
      invalid(
        "diagram/invalid-return-edge",
        `Return edge ${edge.id} must point to an earlier rank.`,
        `spec.edges[${edge.sourceOrder}]`,
        "Reverse the endpoints or express a forward relationship as primary or secondary.",
        { fromRank, toRank },
      );
    }
  }

  const totalText = diagramGraphemeCount(spec.title) +
    diagramGraphemeCount(spec.summary) +
    rawNodes.reduce(
      (sum, node) =>
        sum + diagramGraphemeCount(node.label) +
        (node.annotation === undefined
          ? 0
          : diagramGraphemeCount(node.annotation)),
      0,
    ) +
    edges.reduce(
      (sum, edge) =>
        sum + (edge.label === undefined ? 0 : diagramGraphemeCount(edge.label)),
      0,
    );
  assertDiagramKindBudget(meta, "totalTextGraphemes", totalText, "spec");
  const nodes = rawNodes.map((node) => {
    const rank = rankById.get(node.id) ?? 0;
    return freezeNode(node, rank, ranks[rank]?.indexOf(node.id) ?? 0);
  });
  return Object.freeze({
    kind: "flow",
    title: spec.title,
    summary: spec.summary,
    direction,
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    ranks: Object.freeze(ranks.map((rank) => Object.freeze([...rank]))),
  });
}
