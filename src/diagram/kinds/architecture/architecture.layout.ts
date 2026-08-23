/** Deterministic bounded-topology layout for architecture diagrams. */

import { DiagramValidationError } from "../../errors.ts";
import {
  DIAGRAM_GEOMETRY,
  diagramRectBottom,
  diagramRectRight,
  diagramRectUnion,
  roundDiagramNumber,
} from "../../geometry.ts";
import {
  createDiagramConnector,
  createDiagramScene,
  type DiagramMeasuredText,
  measureDiagramLayoutText,
  positionDiagramText,
} from "../../layout-authority.ts";
import type {
  DiagramConnector,
  DiagramPoint,
  DiagramRect,
  DiagramRegion,
  DiagramScene,
  DiagramSceneElement,
  DiagramSceneGroup,
  DiagramShape,
  DiagramText,
} from "../../scene.ts";
import meta from "./architecture.meta.ts";
import type {
  ValidatedArchitectureDiagram,
  ValidatedArchitectureGroup,
  ValidatedArchitectureNode,
  ValidatedArchitectureRelationship,
} from "./architecture.spec.ts";

interface ArchitectureNodePlan {
  readonly node: ValidatedArchitectureNode;
  readonly label: DiagramMeasuredText;
  readonly detail: DiagramMeasuredText;
  readonly width: number;
  readonly height: number;
  bounds: DiagramRect;
}

interface ArchitectureGroupPlan {
  readonly group: ValidatedArchitectureGroup;
  readonly label: DiagramMeasuredText;
  bounds: DiagramRect;
}

interface ArchitectureRelationshipPlan {
  readonly relationship: ValidatedArchitectureRelationship;
  readonly label: DiagramMeasuredText;
  connector?: DiagramConnector;
  text?: DiagramText;
}

type ArchitecturePortSide = "bottom" | "left" | "right" | "top";

interface ArchitecturePortRequest {
  readonly relationship: ValidatedArchitectureRelationship;
  readonly endpoint: "source" | "target";
  readonly plan: ArchitectureNodePlan;
  readonly peerPosition: number;
  readonly side: ArchitecturePortSide;
}

const G = DIAGRAM_GEOMETRY;
const NODE_GAP = 72;
const LANE_GAP = 176;
const GROUP_PADDING = 20;
const GROUP_LABEL_GAP = 16;
const EXTERNAL_GAP = 40;
const LABEL_GAP = 10;
const DIRECT_STANDOFF = 16;
const PORT_STANDOFF = 32;
const ROUTE_GAP = 42;

function layoutFailure(message: string, path: string): never {
  throw new DiagramValidationError({
    code: "diagram/layout/connector",
    message,
    path,
    remedy: "Split the topology into an overview plus a focused group diagram.",
  });
}

function measuredText(options: {
  readonly text: string;
  readonly maximumWidth: number;
  readonly fontRole: "interface" | "mono";
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly budget:
    | "nodeLabelLines"
    | "annotationLines"
    | "groupLabelLines"
    | "relationshipLabelLines";
  readonly path: string;
}): DiagramMeasuredText {
  return measureDiagramLayoutText({ ...options, meta });
}

function titleCaseRole(role: ValidatedArchitectureNode["role"]): string {
  return `${role.slice(0, 1).toUpperCase()}${role.slice(1)}`;
}

function measureNode(node: ValidatedArchitectureNode): ArchitectureNodePlan {
  const label = measuredText({
    text: node.label,
    maximumWidth: G.node.maximumTextWidth,
    fontRole: "interface",
    fontSize: G.text.primarySize,
    lineHeight: G.text.primaryLineHeight,
    budget: "nodeLabelLines",
    path: `node ${node.id} label`,
  });
  const detail = measuredText({
    text: node.annotation === undefined
      ? `Role: ${titleCaseRole(node.role)}`
      : `Role: ${titleCaseRole(node.role)}; ${node.annotation}`,
    maximumWidth: G.node.maximumTextWidth,
    fontRole: "mono",
    fontSize: G.text.annotationSize,
    lineHeight: G.text.annotationLineHeight,
    budget: "annotationLines",
    path: `node ${node.id} role and annotation`,
  });
  const contentWidth = Math.max(label.width, detail.width);
  const contentHeight = label.height + G.node.annotationGap + detail.height;
  let width = Math.max(
    G.node.minimumWidth,
    contentWidth + G.node.horizontalPadding * 2,
  );
  let height = Math.max(
    G.node.minimumHeight,
    contentHeight + G.node.verticalPadding * 2,
  );
  width = roundDiagramNumber(width);
  height = roundDiagramNumber(height);
  return {
    node,
    label,
    detail,
    width,
    height,
    bounds: { x: 0, y: 0, width, height },
  };
}

function measureGroup(
  group: ValidatedArchitectureGroup,
): ArchitectureGroupPlan {
  return {
    group,
    label: measuredText({
      text: group.label,
      maximumWidth: G.node.maximumTextWidth,
      fontRole: "interface",
      fontSize: G.text.annotationSize,
      lineHeight: G.text.annotationLineHeight,
      budget: "groupLabelLines",
      path: `boundary ${group.id} label`,
    }),
    bounds: { x: 0, y: 0, width: 1, height: 1 },
  };
}

function measureRelationship(
  relationship: ValidatedArchitectureRelationship,
): ArchitectureRelationshipPlan {
  return {
    relationship,
    label: measuredText({
      text: relationship.label,
      maximumWidth: G.text.edgeMaximumWidth,
      fontRole: "interface",
      fontSize: G.text.edgeSize,
      lineHeight: G.text.edgeLineHeight,
      budget: "relationshipLabelLines",
      path: `relationship ${relationship.id} label`,
    }),
  };
}

function laneIds(
  spec: ValidatedArchitectureDiagram,
): readonly string[] {
  return [
    ...spec.groups.map((group) => group.id),
    ...(spec.nodes.some((node) => node.groupId === undefined)
      ? ["architecture:uncontained"]
      : []),
  ];
}

function laneId(node: ValidatedArchitectureNode): string {
  return node.groupId ?? "architecture:uncontained";
}

function hasDirectPrimaryCorridor(
  spec: ValidatedArchitectureDiagram,
  relationship: ValidatedArchitectureRelationship,
  nodeById: ReadonlyMap<string, ArchitectureNodePlan>,
): boolean {
  const source = nodeById.get(relationship.from);
  const target = nodeById.get(relationship.to);
  // A top-to-bottom lane change crosses the target boundary header, so it
  // remains on the exterior router even when the nodes are authored adjacent.
  return relationship.emphasis !== "return" && source !== undefined &&
    target !== undefined &&
    target.node.sourceOrder === source.node.sourceOrder + 1 &&
    (spec.direction === "left-to-right" ||
      laneId(source.node) === laneId(target.node));
}

function primaryNodeGap(
  spec: ValidatedArchitectureDiagram,
  nodes: readonly ArchitectureNodePlan[],
  relationships: readonly ArchitectureRelationshipPlan[],
): number {
  const nodeById = new Map(nodes.map((plan) => [plan.node.id, plan]));
  const direct = relationships.filter((plan) =>
    hasDirectPrimaryCorridor(spec, plan.relationship, nodeById)
  );
  if (direct.length === 0) return NODE_GAP;
  const labelExtent = Math.max(
    ...direct.map((plan) =>
      spec.direction === "left-to-right" ? plan.label.width : plan.label.height
    ),
  );
  return Math.max(
    NODE_GAP,
    labelExtent + (LABEL_GAP + DIRECT_STANDOFF) * 2,
  );
}

function placeLeftToRight(
  spec: ValidatedArchitectureDiagram,
  nodes: readonly ArchitectureNodePlan[],
  groups: readonly ArchitectureGroupPlan[],
  gap: number,
): void {
  let x = 0;
  for (const plan of nodes) {
    plan.bounds = { x, y: 0, width: plan.width, height: plan.height };
    x = roundDiagramNumber(x + plan.width + gap);
  }
  const groupById = new Map(groups.map((plan) => [plan.group.id, plan]));
  let y = 0;
  for (const id of laneIds(spec)) {
    const members = nodes.filter((plan) => laneId(plan.node) === id);
    if (members.length === 0) continue;
    const group = groupById.get(id);
    const headerHeight = group === undefined
      ? 0
      : GROUP_PADDING + group.label.height + GROUP_LABEL_GAP;
    const laneHeight = Math.max(...members.map((plan) => plan.height));
    for (const plan of members) {
      plan.bounds = {
        ...plan.bounds,
        y: roundDiagramNumber(
          y + headerHeight + (laneHeight - plan.height) / 2,
        ),
      };
    }
    if (group !== undefined) {
      const memberBounds = diagramRectUnion(
        members.map((plan) => plan.bounds),
      );
      const width = Math.max(
        memberBounds.width + GROUP_PADDING * 2,
        group.label.width + GROUP_PADDING * 2,
      );
      const centerX = memberBounds.x + memberBounds.width / 2;
      group.bounds = {
        x: roundDiagramNumber(centerX - width / 2),
        y: roundDiagramNumber(y),
        width: roundDiagramNumber(width),
        height: roundDiagramNumber(
          headerHeight + laneHeight + GROUP_PADDING,
        ),
      };
      y = diagramRectBottom(group.bounds) + LANE_GAP;
    } else {
      y += laneHeight + LANE_GAP;
    }
  }
}

function placeTopToBottom(
  spec: ValidatedArchitectureDiagram,
  nodes: readonly ArchitectureNodePlan[],
  groups: readonly ArchitectureGroupPlan[],
  gap: number,
): void {
  let y = 0;
  for (const plan of nodes) {
    plan.bounds = { x: 0, y, width: plan.width, height: plan.height };
    y = roundDiagramNumber(y + plan.height + gap);
  }
  const groupById = new Map(groups.map((plan) => [plan.group.id, plan]));
  let x = 0;
  for (const id of laneIds(spec)) {
    const members = nodes.filter((plan) => laneId(plan.node) === id);
    if (members.length === 0) continue;
    const group = groupById.get(id);
    const laneWidth = Math.max(...members.map((plan) => plan.width));
    const regionWidth = group === undefined ? laneWidth : Math.max(
      laneWidth + GROUP_PADDING * 2,
      group.label.width + GROUP_PADDING * 2,
    );
    for (const plan of members) {
      plan.bounds = {
        ...plan.bounds,
        x: roundDiagramNumber(
          x + (regionWidth - plan.width) / 2,
        ),
      };
    }
    if (group !== undefined) {
      const memberBounds = diagramRectUnion(
        members.map((plan) => plan.bounds),
      );
      const headerHeight = GROUP_PADDING + group.label.height + GROUP_LABEL_GAP;
      group.bounds = {
        x: roundDiagramNumber(x),
        y: roundDiagramNumber(memberBounds.y - headerHeight),
        width: roundDiagramNumber(regionWidth),
        height: roundDiagramNumber(
          headerHeight + memberBounds.height + GROUP_PADDING,
        ),
      };
      x = diagramRectRight(group.bounds) + LANE_GAP;
    } else {
      x += regionWidth + LANE_GAP;
    }
  }
}

function architectureShape(plan: ArchitectureNodePlan): DiagramShape {
  const shape = "rounded-rectangle";
  const style = plan.node.role === "focal" ? "focus" : "ordinary";
  return {
    kind: "shape",
    id: `architecture-node-${plan.node.id}-shape`,
    semanticId: plan.node.id,
    shape,
    style,
    bounds: plan.bounds,
    radius: G.node.radius,
  };
}

function architectureNodeElements(
  plan: ArchitectureNodePlan,
): readonly DiagramSceneElement[] {
  const shape = architectureShape(plan);
  const contentHeight = plan.label.height + G.node.annotationGap +
    plan.detail.height;
  const top = plan.bounds.y + (plan.bounds.height - contentHeight) / 2;
  const centerX = plan.bounds.x + plan.bounds.width / 2;
  return [
    shape,
    positionDiagramText({
      id: `architecture-node-${plan.node.id}-label`,
      ownerId: plan.node.id,
      placement: "inside-shape",
      role: "node-text",
      measured: plan.label,
      centerX,
      top,
    }),
    positionDiagramText({
      id: `architecture-node-${plan.node.id}-detail`,
      ownerId: plan.node.id,
      placement: "inside-shape",
      role: "quiet-annotation",
      measured: plan.detail,
      centerX,
      top: top + plan.label.height + G.node.annotationGap,
    }),
  ];
}

function architectureGroupElements(
  plan: ArchitectureGroupPlan,
): readonly [DiagramRegion, DiagramText] {
  const region: DiagramRegion = {
    kind: "region",
    id: `architecture-boundary-${plan.group.id}-region`,
    semanticId: plan.group.id,
    style: "boundary",
    bounds: plan.bounds,
    radius: G.node.radius,
    lineWidth: G.connector.lineWidth,
  };
  const label = positionDiagramText({
    id: `architecture-boundary-${plan.group.id}-label`,
    ownerId: plan.group.id,
    placement: "inside-region",
    role: "quiet-annotation",
    measured: plan.label,
    centerX: plan.bounds.x + plan.bounds.width / 2,
    top: plan.bounds.y + GROUP_PADDING,
  });
  return [region, label];
}

function distributedOffset(index: number, count: number, axis: number): number {
  if (count <= 1) return 0;
  const halfSpread = Math.min(
    axis / 2 - 1,
    G.connector.laneGap * (count - 1) / 2,
  );
  return roundDiagramNumber(
    -halfSpread + index * halfSpread * 2 / (count - 1),
  );
}

function portPoint(
  plan: ArchitectureNodePlan,
  side: ArchitecturePortSide,
  offset: number,
): DiagramPoint {
  const centerX = plan.bounds.x + plan.bounds.width / 2;
  const centerY = plan.bounds.y + plan.bounds.height / 2;
  const radius = G.node.radius;
  if (side === "bottom" || side === "top") {
    const x = centerX + offset;
    const leftCurveCenter = plan.bounds.x + radius;
    const rightCurveCenter = diagramRectRight(plan.bounds) - radius;
    const curveDistance = x < leftCurveCenter
      ? leftCurveCenter - x
      : x > rightCurveCenter
      ? x - rightCurveCenter
      : 0;
    const inset = radius - Math.sqrt(
      Math.max(0, radius ** 2 - curveDistance ** 2),
    );
    return {
      x: roundDiagramNumber(x),
      y: roundDiagramNumber(
        side === "top"
          ? plan.bounds.y + inset
          : diagramRectBottom(plan.bounds) - inset,
      ),
    };
  }
  const y = centerY + offset;
  const topCurveCenter = plan.bounds.y + radius;
  const bottomCurveCenter = diagramRectBottom(plan.bounds) - radius;
  const curveDistance = y < topCurveCenter
    ? topCurveCenter - y
    : y > bottomCurveCenter
    ? y - bottomCurveCenter
    : 0;
  const inset = radius - Math.sqrt(
    Math.max(0, radius ** 2 - curveDistance ** 2),
  );
  return {
    x: roundDiagramNumber(
      side === "left"
        ? plan.bounds.x + inset
        : diagramRectRight(plan.bounds) - inset,
    ),
    y: roundDiagramNumber(y),
  };
}

function endpointSide(
  spec: ValidatedArchitectureDiagram,
  relationship: ValidatedArchitectureRelationship,
  endpoint: "source" | "target",
  nodeById: ReadonlyMap<string, ArchitectureNodePlan>,
): ArchitecturePortSide {
  if (hasDirectPrimaryCorridor(spec, relationship, nodeById)) {
    if (spec.direction === "left-to-right") {
      return endpoint === "source" ? "right" : "left";
    }
    return endpoint === "source" ? "bottom" : "top";
  }
  return spec.direction === "left-to-right" ? "bottom" : "right";
}

function assignPorts(
  spec: ValidatedArchitectureDiagram,
  nodes: readonly ArchitectureNodePlan[],
): ReadonlyMap<string, DiagramPoint> {
  const byId = new Map(nodes.map((plan) => [plan.node.id, plan]));
  const requests = new Map<string, ArchitecturePortRequest[]>();
  for (const relationship of spec.relationships) {
    for (const endpoint of ["source", "target"] as const) {
      const nodeId = endpoint === "source"
        ? relationship.from
        : relationship.to;
      const plan = byId.get(nodeId);
      if (plan === undefined) continue;
      const peer = byId.get(
        endpoint === "source" ? relationship.to : relationship.from,
      );
      if (peer === undefined) continue;
      const side = endpointSide(spec, relationship, endpoint, byId);
      const peerPosition = side === "bottom" || side === "top"
        ? peer.bounds.x + peer.bounds.width / 2
        : peer.bounds.y + peer.bounds.height / 2;
      const key = `${nodeId}\u0000${side}`;
      const values = requests.get(key) ?? [];
      values.push({ relationship, endpoint, plan, peerPosition, side });
      requests.set(key, values);
    }
  }
  const ports = new Map<string, DiagramPoint>();
  for (const values of requests.values()) {
    values.sort((left, right) =>
      left.peerPosition - right.peerPosition ||
      left.relationship.sourceOrder - right.relationship.sourceOrder ||
      left.endpoint.localeCompare(right.endpoint)
    );
    values.forEach((request, index) => {
      const axis = request.side === "bottom" || request.side === "top"
        ? request.plan.bounds.width - G.node.radius * 2
        : request.plan.bounds.height -
          G.node.radius * 2;
      ports.set(
        `${request.relationship.id}\u0000${request.endpoint}`,
        portPoint(
          request.plan,
          request.side,
          distributedOffset(index, values.length, axis),
        ),
      );
    });
  }
  return ports;
}

function routeRelationships(
  spec: ValidatedArchitectureDiagram,
  nodes: readonly ArchitectureNodePlan[],
  groups: readonly ArchitectureGroupPlan[],
  relationships: readonly ArchitectureRelationshipPlan[],
): void {
  const structuralBounds = diagramRectUnion([
    ...nodes.map((plan) => plan.bounds),
    ...groups.map((plan) => plan.bounds),
  ]);
  const ports = assignPorts(spec, nodes);
  const nodeById = new Map(nodes.map((plan) => [plan.node.id, plan]));
  const groupById = new Map(groups.map((plan) => [plan.group.id, plan.bounds]));
  const laneBounds = new Map<string, DiagramRect>();
  for (const id of laneIds(spec)) {
    const groupBounds = groupById.get(id);
    if (groupBounds !== undefined) {
      laneBounds.set(id, groupBounds);
      continue;
    }
    const members = nodes.filter((plan) => laneId(plan.node) === id);
    if (members.length > 0) {
      laneBounds.set(id, diagramRectUnion(members.map((plan) => plan.bounds)));
    }
  }
  const endpointChannel = (
    nodeId: string,
    relationshipIndex: number,
    endpoint: "source" | "target",
  ): number => {
    const node = nodeById.get(nodeId);
    const bounds = node === undefined
      ? undefined
      : laneBounds.get(laneId(node.node));
    if (bounds === undefined) {
      layoutFailure(
        `Node ${nodeId} lost its architecture lane.`,
        `node ${nodeId}`,
      );
    }
    const slot = relationshipIndex * 2 + (endpoint === "source" ? 0 : 1);
    return roundDiagramNumber(
      (spec.direction === "left-to-right"
        ? diagramRectBottom(bounds)
        : diagramRectRight(bounds)) + PORT_STANDOFF + 8 + slot * 4,
    );
  };
  let routeX = diagramRectRight(structuralBounds) +
    (spec.direction === "top-to-bottom" ? LANE_GAP : 0) + EXTERNAL_GAP;
  let routeY = diagramRectBottom(structuralBounds) +
    (spec.direction === "left-to-right" ? LANE_GAP : 0) + EXTERNAL_GAP;
  for (const plan of relationships) {
    const source = ports.get(`${plan.relationship.id}\u0000source`);
    const target = ports.get(`${plan.relationship.id}\u0000target`);
    const sourcePlan = nodeById.get(plan.relationship.from);
    const targetPlan = nodeById.get(plan.relationship.to);
    if (
      source === undefined || target === undefined ||
      sourcePlan === undefined || targetPlan === undefined
    ) {
      layoutFailure(
        `Relationship ${plan.relationship.id} lost a validated endpoint.`,
        `relationship ${plan.relationship.id}`,
      );
    }
    let path: readonly DiagramPoint[];
    let labelCenterX: number;
    let labelTop: number;
    if (hasDirectPrimaryCorridor(spec, plan.relationship, nodeById)) {
      if (spec.direction === "left-to-right") {
        const gapStart = diagramRectRight(sourcePlan.bounds);
        const gapEnd = targetPlan.bounds.x;
        const centerX = roundDiagramNumber((gapStart + gapEnd) / 2);
        if (Math.abs(source.y - target.y) <= 0.02) {
          path = [source, target];
          labelCenterX = centerX;
          labelTop = source.y - LABEL_GAP - plan.label.height;
        } else {
          const channelX = roundDiagramNumber(
            centerX - plan.label.width / 2 - LABEL_GAP,
          );
          path = [
            source,
            { x: channelX, y: source.y },
            { x: channelX, y: target.y },
            target,
          ];
          labelCenterX = centerX;
          labelTop = roundDiagramNumber(
            (source.y + target.y - plan.label.height) / 2,
          );
        }
      } else {
        const gapStart = diagramRectBottom(sourcePlan.bounds);
        const gapEnd = targetPlan.bounds.y;
        const centerY = roundDiagramNumber((gapStart + gapEnd) / 2);
        labelTop = roundDiagramNumber(centerY - plan.label.height / 2);
        if (Math.abs(source.x - target.x) <= 0.02) {
          path = [source, target];
          labelCenterX = roundDiagramNumber(
            source.x + LABEL_GAP + plan.label.width / 2,
          );
        } else {
          const channelY = roundDiagramNumber(labelTop - LABEL_GAP);
          path = [
            source,
            { x: source.x, y: channelY },
            { x: target.x, y: channelY },
            target,
          ];
          labelCenterX = roundDiagramNumber((source.x + target.x) / 2);
        }
      }
    } else if (spec.direction === "left-to-right") {
      const sourceChannel = endpointChannel(
        plan.relationship.from,
        plan.relationship.sourceOrder,
        "source",
      );
      const targetChannel = endpointChannel(
        plan.relationship.to,
        plan.relationship.sourceOrder,
        "target",
      );
      const sourceLane = routeX;
      const targetLane = sourceLane + Math.max(
        ROUTE_GAP,
        plan.label.width + LABEL_GAP * 2,
      );
      path = [
        source,
        { x: source.x, y: source.y + PORT_STANDOFF },
        { x: source.x, y: sourceChannel },
        { x: sourceLane, y: sourceChannel },
        { x: sourceLane, y: routeY },
        { x: targetLane, y: routeY },
        { x: targetLane, y: targetChannel },
        { x: target.x, y: targetChannel },
        { x: target.x, y: target.y + PORT_STANDOFF },
        target,
      ];
      labelCenterX = (sourceLane + targetLane) / 2;
      labelTop = routeY + LABEL_GAP;
      routeY += plan.label.height + LABEL_GAP * 3;
      routeX = targetLane + ROUTE_GAP;
    } else {
      const sourceChannel = endpointChannel(
        plan.relationship.from,
        plan.relationship.sourceOrder,
        "source",
      );
      const targetChannel = endpointChannel(
        plan.relationship.to,
        plan.relationship.sourceOrder,
        "target",
      );
      const sourceLane = routeY;
      const targetLane = sourceLane + Math.max(
        ROUTE_GAP,
        plan.label.height + LABEL_GAP * 2,
      );
      path = [
        source,
        { x: source.x + PORT_STANDOFF, y: source.y },
        { x: sourceChannel, y: source.y },
        { x: sourceChannel, y: sourceLane },
        { x: routeX, y: sourceLane },
        { x: routeX, y: targetLane },
        { x: targetChannel, y: targetLane },
        { x: targetChannel, y: target.y },
        { x: target.x + PORT_STANDOFF, y: target.y },
        target,
      ];
      labelCenterX = routeX + LABEL_GAP + plan.label.width / 2;
      labelTop = (sourceLane + targetLane - plan.label.height) / 2;
      routeX += plan.label.width + LABEL_GAP * 3;
      routeY = targetLane + ROUTE_GAP;
    }
    plan.connector = createDiagramConnector({
      id: `architecture-relationship-${plan.relationship.id}-connector`,
      semanticId: plan.relationship.id,
      sourceId: plan.relationship.from,
      targetId: plan.relationship.to,
      style: plan.relationship.emphasis,
      routing: "orthogonal",
      pathWithTip: path,
      path: `relationship ${plan.relationship.id}`,
      remedy:
        "Split the topology into an overview plus a focused group diagram.",
    });
    plan.text = positionDiagramText({
      id: `architecture-relationship-${plan.relationship.id}-label`,
      ownerId: plan.relationship.id,
      placement: "free",
      role: "connector-label",
      measured: plan.label,
      centerX: labelCenterX,
      top: labelTop,
    });
  }
}

/** Lay a validated bounded topology into one projection-neutral scene. */
export default function layoutArchitectureDiagram(
  spec: ValidatedArchitectureDiagram,
): DiagramScene {
  const nodePlans = spec.nodes.map(measureNode);
  const groupPlans = spec.groups.map(measureGroup);
  const relationshipPlans = spec.relationships.map(measureRelationship);
  const gap = primaryNodeGap(spec, nodePlans, relationshipPlans);
  if (spec.direction === "left-to-right") {
    placeLeftToRight(spec, nodePlans, groupPlans, gap);
  } else {
    placeTopToBottom(spec, nodePlans, groupPlans, gap);
  }
  routeRelationships(spec, nodePlans, groupPlans, relationshipPlans);

  const groupElements = groupPlans.flatMap(architectureGroupElements);
  const nodeElements = nodePlans.flatMap(architectureNodeElements);
  const relationshipElements = relationshipPlans.flatMap((plan) => {
    if (plan.connector === undefined || plan.text === undefined) {
      layoutFailure(
        `Relationship ${plan.relationship.id} was not routed.`,
        `relationship ${plan.relationship.id}`,
      );
    }
    return [plan.connector, plan.text];
  });
  const elements: DiagramSceneElement[] = [
    ...groupElements,
    ...relationshipElements,
    ...nodeElements,
  ];

  const relationshipGroups: DiagramSceneGroup[] = relationshipPlans.map(
    (plan) => ({
      id: `architecture-relationship-${plan.relationship.id}-group`,
      children: [
        `architecture-relationship-${plan.relationship.id}-connector`,
        `architecture-relationship-${plan.relationship.id}-label`,
      ],
    }),
  );
  const nodeGroups: DiagramSceneGroup[] = nodePlans.map((plan) => ({
    id: `architecture-node-${plan.node.id}-group`,
    children: [
      `architecture-node-${plan.node.id}-shape`,
      `architecture-node-${plan.node.id}-label`,
      `architecture-node-${plan.node.id}-detail`,
    ],
  }));
  const boundaryGroups: DiagramSceneGroup[] = groupPlans.map((plan) => ({
    id: `architecture-boundary-${plan.group.id}-group`,
    children: [
      `architecture-boundary-${plan.group.id}-region`,
      `architecture-boundary-${plan.group.id}-label`,
      ...plan.group.members.map((member) =>
        `architecture-node-${member}-group`
      ),
    ],
  }));
  const contained = new Set(spec.groups.flatMap((group) => group.members));
  const root = [
    ...relationshipGroups.map((group) => group.id),
    ...boundaryGroups.map((group) => group.id),
    ...nodePlans.filter((plan) => !contained.has(plan.node.id)).map((plan) =>
      `architecture-node-${plan.node.id}-group`
    ),
  ];
  return createDiagramScene({
    sourceKind: "architecture",
    elements,
    groups: [...relationshipGroups, ...nodeGroups, ...boundaryGroups],
    root,
    meta,
  });
}
