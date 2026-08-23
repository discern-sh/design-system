/** Deterministic dependency-free layered layout for documentation-scale flow. */

import {
  DiagramConformanceError,
  DiagramValidationError,
} from "../../errors.ts";
import {
  DIAGRAM_GEOMETRY,
  diagramPointBounds,
  diagramRectBottom,
  diagramRectRight,
  diagramRectUnion,
  expandDiagramRect,
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
  DiagramScene,
  DiagramSceneElement,
  DiagramSceneGroup,
  DiagramShape,
  DiagramText,
} from "../../scene.ts";
import meta from "./flow.meta.ts";
import type {
  ValidatedFlowDiagram,
  ValidatedFlowEdge,
  ValidatedFlowNode,
} from "./flow.spec.ts";

interface NodePlan {
  readonly node: ValidatedFlowNode;
  readonly width: number;
  readonly height: number;
  readonly label: DiagramMeasuredText;
  readonly annotation?: DiagramMeasuredText;
  bounds: DiagramRect;
}

interface RoutedEdge {
  readonly edge: ValidatedFlowEdge;
  readonly connector: DiagramConnector;
}

type FlowPortSide = "top" | "right" | "bottom" | "left";
type FlowEndpoint = "source" | "target";

interface FlowPortRequest {
  readonly edge: ValidatedFlowEdge;
  readonly endpoint: FlowEndpoint;
  readonly plan: NodePlan;
  readonly side: FlowPortSide;
  readonly peerPosition: number;
}

const G = DIAGRAM_GEOMETRY;

function layoutFailure(message: string, path: string, remedy: string): never {
  throw new DiagramValidationError({
    code: "diagram/layout/edge-label",
    message,
    path,
    remedy,
  });
}

function internalLayoutFailure(message: string, edgeId: string): never {
  throw new DiagramConformanceError(message, {
    kind: "flow",
    edgeId,
  });
}

function measuredText(
  text: string,
  maximumWidth: number,
  fontRole: "interface" | "mono",
  fontSize: number,
  lineHeight: number,
  budget: "nodeLabelLines" | "annotationLines" | "edgeLabelLines",
  path: string,
): DiagramMeasuredText {
  return measureDiagramLayoutText({
    text,
    maximumWidth,
    fontRole,
    fontSize,
    lineHeight,
    meta,
    budget,
    path,
  });
}

function measureNode(
  node: ValidatedFlowNode,
  direction: ValidatedFlowDiagram["direction"],
): NodePlan {
  const label = measuredText(
    node.label,
    direction === "left-to-right"
      ? G.node.horizontalMaximumTextWidth
      : G.node.maximumTextWidth,
    "interface",
    G.text.primarySize,
    G.text.primaryLineHeight,
    "nodeLabelLines",
    `node ${node.id} label`,
  );
  const annotation = node.annotation === undefined ? undefined : measuredText(
    node.annotation,
    G.node.maximumTextWidth,
    "mono",
    G.text.annotationSize,
    G.text.annotationLineHeight,
    "annotationLines",
    `node ${node.id} annotation`,
  );
  const contentWidth = Math.max(label.width, annotation?.width ?? 0);
  const contentHeight = label.height +
    (annotation === undefined ? 0 : G.node.annotationGap + annotation.height);
  let width = Math.max(
    G.node.minimumWidth,
    contentWidth + G.node.horizontalPadding * 2,
  );
  let height = Math.max(
    G.node.minimumHeight,
    contentHeight + G.node.verticalPadding * 2,
  );
  if (node.role === "decision") {
    width *= G.node.decisionScaleX;
    height *= G.node.decisionScaleY;
  }
  return {
    node,
    width: roundDiagramNumber(width),
    height: roundDiagramNumber(height),
    label,
    ...(annotation === undefined ? {} : { annotation }),
    bounds: {
      x: 0,
      y: 0,
      width: roundDiagramNumber(width),
      height: roundDiagramNumber(height),
    },
  };
}

function rankGap(
  spec: ValidatedFlowDiagram,
  boundary: number,
): number {
  const crossing = spec.edges.filter((edge) => {
    if (edge.emphasis === "return") return false;
    const source = spec.nodes.find((node) => node.id === edge.from)?.rank ?? 0;
    const target = spec.nodes.find((node) => node.id === edge.to)?.rank ?? 0;
    return source <= boundary && target > boundary;
  }).length;
  const base = spec.direction === "left-to-right"
    ? G.connector.horizontalRankGap
    : G.connector.baseRankGap;
  return base + Math.max(0, crossing - 1) *
      G.connector.laneGap;
}

function placeNodes(
  spec: ValidatedFlowDiagram,
  plans: readonly NodePlan[],
): readonly number[] {
  const byId = new Map(plans.map((plan) => [plan.node.id, plan]));
  const rankPrimarySizes = spec.ranks.map((rank) =>
    Math.max(...rank.map((id) => {
      const plan = byId.get(id);
      return spec.direction === "top-to-bottom"
        ? plan?.height ?? 0
        : plan?.width ?? 0;
    }))
  );
  const rankSecondarySizes = spec.ranks.map((rank) =>
    rank.reduce((total, id, index) => {
      const plan = byId.get(id);
      const size = spec.direction === "top-to-bottom"
        ? plan?.width ?? 0
        : plan?.height ?? 0;
      return total + size + (index === 0 ? 0 : G.node.rankMemberGap);
    }, 0)
  );
  const maximumSecondary = Math.max(...rankSecondarySizes);
  const rankStarts: number[] = [];
  let primary = 0;
  for (const [rankIndex, rank] of spec.ranks.entries()) {
    rankStarts.push(primary);
    let secondary = (maximumSecondary - (rankSecondarySizes[rankIndex] ?? 0)) /
      2;
    for (const id of rank) {
      const plan = byId.get(id);
      if (plan === undefined) continue;
      if (spec.direction === "top-to-bottom") {
        plan.bounds = {
          x: roundDiagramNumber(secondary),
          y: roundDiagramNumber(
            primary + ((rankPrimarySizes[rankIndex] ?? 0) - plan.height) / 2,
          ),
          width: plan.width,
          height: plan.height,
        };
        secondary += plan.width + G.node.rankMemberGap;
      } else {
        plan.bounds = {
          x: roundDiagramNumber(
            primary + ((rankPrimarySizes[rankIndex] ?? 0) - plan.width) / 2,
          ),
          y: roundDiagramNumber(secondary),
          width: plan.width,
          height: plan.height,
        };
        secondary += plan.height + G.node.rankMemberGap;
      }
    }
    primary += (rankPrimarySizes[rankIndex] ?? 0) +
      (rankIndex === spec.ranks.length - 1 ? 0 : rankGap(spec, rankIndex));
  }
  return Object.freeze(rankStarts);
}

function nodeShape(plan: NodePlan): DiagramShape {
  const role = plan.node.role === "step" ? "ordinary" : plan.node.role;
  const shape = plan.node.role === "decision"
    ? "diamond"
    : plan.node.role === "start" || plan.node.role === "end"
    ? "capsule"
    : "rounded-rectangle";
  return {
    kind: "shape",
    id: `node-${plan.node.id}-shape`,
    semanticId: plan.node.id,
    shape,
    style: role,
    bounds: plan.bounds,
    radius: shape === "capsule"
      ? roundDiagramNumber(Math.min(plan.bounds.width, plan.bounds.height) / 2)
      : shape === "rounded-rectangle"
      ? G.node.radius
      : 0,
  };
}

function positionedText(
  id: string,
  ownerId: string,
  role: DiagramText["role"],
  measured: DiagramMeasuredText,
  centerX: number,
  top: number,
): DiagramText {
  return positionDiagramText({
    id,
    ownerId,
    placement: role === "connector-label" ? "free" : "inside-shape",
    role,
    measured,
    centerX,
    top,
  });
}

function nodeElements(plan: NodePlan): readonly DiagramSceneElement[] {
  const contentHeight = plan.label.height +
    (plan.annotation === undefined
      ? 0
      : G.node.annotationGap + plan.annotation.height);
  const top = plan.bounds.y + (plan.bounds.height - contentHeight) / 2;
  const centerX = plan.bounds.x + plan.bounds.width / 2;
  const elements: DiagramSceneElement[] = [
    nodeShape(plan),
    positionedText(
      `node-${plan.node.id}-label`,
      plan.node.id,
      "node-text",
      plan.label,
      centerX,
      top,
    ),
  ];
  if (plan.annotation !== undefined) {
    elements.push(
      positionedText(
        `node-${plan.node.id}-annotation`,
        plan.node.id,
        "quiet-annotation",
        plan.annotation,
        centerX,
        top + plan.label.height + G.node.annotationGap,
      ),
    );
  }
  return elements;
}

function boundaryAfterRank(
  spec: ValidatedFlowDiagram,
  plans: readonly NodePlan[],
  rank: number,
): number {
  const members = plans.filter((plan) => plan.node.rank === rank);
  const end = Math.max(
    ...members.map((plan) =>
      spec.direction === "top-to-bottom"
        ? diagramRectBottom(plan.bounds)
        : diagramRectRight(plan.bounds)
    ),
  );
  const next = plans.filter((plan) => plan.node.rank === rank + 1);
  const start = Math.min(
    ...next.map((plan) =>
      spec.direction === "top-to-bottom" ? plan.bounds.y : plan.bounds.x
    ),
  );
  return roundDiagramNumber((end + start) / 2);
}

function centerOf(rect: DiagramRect): DiagramPoint {
  return {
    x: roundDiagramNumber(rect.x + rect.width / 2),
    y: roundDiagramNumber(rect.y + rect.height / 2),
  };
}

function endpointSide(
  spec: ValidatedFlowDiagram,
  edge: ValidatedFlowEdge,
  endpoint: FlowEndpoint,
): FlowPortSide {
  if (spec.direction === "top-to-bottom") {
    if (edge.emphasis === "return") return "left";
    return endpoint === "source" ? "bottom" : "top";
  }
  if (edge.emphasis === "return") return "top";
  return endpoint === "source" ? "right" : "left";
}

function portKey(edge: ValidatedFlowEdge, endpoint: FlowEndpoint): string {
  return `${edge.id}\u0000${endpoint}`;
}

function nodeRadius(plan: NodePlan): number {
  if (plan.node.role === "decision") return 0;
  if (plan.node.role === "start" || plan.node.role === "end") {
    return Math.min(plan.bounds.width, plan.bounds.height) / 2;
  }
  return G.node.radius;
}

function distributedPortOffset(
  index: number,
  count: number,
  maximumOffset: number,
): number {
  if (count <= 1) return 0;
  const halfSpread = Math.min(
    maximumOffset,
    G.connector.laneGap * (count - 1) / 2,
  );
  return roundDiagramNumber(
    -halfSpread + index * halfSpread * 2 / (count - 1),
  );
}

function roundedPortPoint(
  plan: NodePlan,
  side: FlowPortSide,
  offset: number,
): DiagramPoint {
  const { bounds } = plan;
  const center = centerOf(bounds);
  const radius = nodeRadius(plan);
  if (side === "top" || side === "bottom") {
    const x = center.x + offset;
    const leftCurveCenter = bounds.x + radius;
    const rightCurveCenter = diagramRectRight(bounds) - radius;
    const curveDistance = x < leftCurveCenter
      ? leftCurveCenter - x
      : x > rightCurveCenter
      ? x - rightCurveCenter
      : 0;
    const inset = radius === 0 ? 0 : radius - Math.sqrt(
      Math.max(0, radius ** 2 - curveDistance ** 2),
    );
    return {
      x: roundDiagramNumber(x),
      y: roundDiagramNumber(
        side === "top" ? bounds.y + inset : diagramRectBottom(bounds) - inset,
      ),
    };
  }
  const y = center.y + offset;
  const topCurveCenter = bounds.y + radius;
  const bottomCurveCenter = diagramRectBottom(bounds) - radius;
  const curveDistance = y < topCurveCenter
    ? topCurveCenter - y
    : y > bottomCurveCenter
    ? y - bottomCurveCenter
    : 0;
  const inset = radius === 0 ? 0 : radius - Math.sqrt(
    Math.max(0, radius ** 2 - curveDistance ** 2),
  );
  return {
    x: roundDiagramNumber(
      side === "left" ? bounds.x + inset : diagramRectRight(bounds) - inset,
    ),
    y: roundDiagramNumber(y),
  };
}

function portPoint(
  request: FlowPortRequest,
  index: number,
  count: number,
): DiagramPoint {
  const { plan, side } = request;
  const horizontalSide = side === "top" || side === "bottom";
  const halfAxis = horizontalSide
    ? plan.bounds.width / 2
    : plan.bounds.height / 2;
  const maximumOffset = Math.max(0, halfAxis - 1);
  const offset = distributedPortOffset(index, count, maximumOffset);
  if (plan.node.role !== "decision") {
    return roundedPortPoint(plan, side, offset);
  }
  const center = centerOf(plan.bounds);
  const radiusX = plan.bounds.width / 2;
  const radiusY = plan.bounds.height / 2;
  if (horizontalSide) {
    const boundaryDistance = radiusY * (1 - Math.abs(offset) / radiusX);
    return {
      x: roundDiagramNumber(center.x + offset),
      y: roundDiagramNumber(
        side === "top"
          ? center.y - boundaryDistance
          : center.y + boundaryDistance,
      ),
    };
  }
  const boundaryDistance = radiusX * (1 - Math.abs(offset) / radiusY);
  return {
    x: roundDiagramNumber(
      side === "left"
        ? center.x - boundaryDistance
        : center.x + boundaryDistance,
    ),
    y: roundDiagramNumber(center.y + offset),
  };
}

function assignEdgePorts(
  spec: ValidatedFlowDiagram,
  plans: readonly NodePlan[],
): ReadonlyMap<string, DiagramPoint> {
  const byId = new Map(plans.map((plan) => [plan.node.id, plan]));
  const grouped = new Map<string, FlowPortRequest[]>();
  for (const edge of spec.edges) {
    for (const endpoint of ["source", "target"] as const) {
      const plan = byId.get(endpoint === "source" ? edge.from : edge.to);
      const peer = byId.get(endpoint === "source" ? edge.to : edge.from);
      if (plan === undefined || peer === undefined) continue;
      const side = endpointSide(spec, edge, endpoint);
      const peerCenter = centerOf(peer.bounds);
      const request = {
        edge,
        endpoint,
        plan,
        side,
        peerPosition: side === "top" || side === "bottom"
          ? peerCenter.x
          : peerCenter.y,
      } satisfies FlowPortRequest;
      const key = `${plan.node.id}\u0000${side}`;
      const requests = grouped.get(key) ?? [];
      requests.push(request);
      grouped.set(key, requests);
    }
  }
  const ports = new Map<string, DiagramPoint>();
  for (const requests of grouped.values()) {
    requests.sort((left, right) =>
      left.peerPosition - right.peerPosition ||
      left.edge.sourceOrder - right.edge.sourceOrder ||
      left.endpoint.localeCompare(right.endpoint)
    );
    requests.forEach((request, index) =>
      ports.set(
        portKey(request.edge, request.endpoint),
        portPoint(request, index, requests.length),
      )
    );
  }
  return ports;
}

function connectorFromPath(
  edge: ValidatedFlowEdge,
  pathWithTip: readonly DiagramPoint[],
): DiagramConnector {
  return createDiagramConnector({
    id: `edge-${edge.id}-connector`,
    semanticId: edge.id,
    sourceId: edge.from,
    targetId: edge.to,
    style: edge.emphasis,
    routing: "orthogonal",
    pathWithTip,
    path: `edge ${edge.id}`,
    remedy: "Reduce node density or split the overview.",
  });
}

function routeEdges(
  spec: ValidatedFlowDiagram,
  plans: readonly NodePlan[],
): readonly RoutedEdge[] {
  const byId = new Map(plans.map((plan) => [plan.node.id, plan]));
  const ports = assignEdgePorts(spec, plans);
  const allBounds = diagramRectUnion(plans.map((plan) => plan.bounds));
  const adjacent = spec.edges.filter((edge) =>
    edge.emphasis !== "return" &&
    (byId.get(edge.to)?.node.rank ?? 0) ===
      (byId.get(edge.from)?.node.rank ?? 0) + 1
  );
  const laneByEdge = new Map<string, number>();
  for (let boundary = 0; boundary < spec.ranks.length - 1; boundary += 1) {
    const crossing = adjacent.filter((edge) =>
      byId.get(edge.from)?.node.rank === boundary
    );
    const center = boundaryAfterRank(spec, plans, boundary);
    crossing.forEach((edge, index) =>
      laneByEdge.set(
        edge.id,
        roundDiagramNumber(
          center + (index - (crossing.length - 1) / 2) * G.connector.laneGap,
        ),
      )
    );
  }
  const long = spec.edges.filter((edge) =>
    edge.emphasis !== "return" &&
    (byId.get(edge.to)?.node.rank ?? 0) >
      (byId.get(edge.from)?.node.rank ?? 0) + 1
  );
  const returns = spec.edges.filter((edge) => edge.emphasis === "return");
  return spec.edges.map((edge) => {
    const source = byId.get(edge.from);
    const target = byId.get(edge.to);
    if (source === undefined || target === undefined) {
      internalLayoutFailure(
        `Edge ${edge.id} lost a validated endpoint.`,
        edge.id,
      );
    }
    const sourcePort = ports.get(portKey(edge, "source"));
    const targetPort = ports.get(portKey(edge, "target"));
    if (sourcePort === undefined || targetPort === undefined) {
      internalLayoutFailure(
        `Edge ${edge.id} lost a deterministic endpoint port.`,
        edge.id,
      );
    }
    let path: readonly DiagramPoint[];
    if (spec.direction === "top-to-bottom") {
      if (edge.emphasis === "return") {
        const index = returns.indexOf(edge);
        const external = allBounds.x - G.connector.externalGap -
          index * G.connector.laneGap;
        path = [
          sourcePort,
          { x: external, y: sourcePort.y },
          { x: external, y: targetPort.y },
          targetPort,
        ];
      } else if (target.node.rank === source.node.rank + 1) {
        const lane = laneByEdge.get(edge.id) ??
          boundaryAfterRank(spec, plans, source.node.rank);
        path = [
          sourcePort,
          { x: sourcePort.x, y: lane },
          { x: targetPort.x, y: lane },
          targetPort,
        ];
      } else {
        const index = long.indexOf(edge);
        const external = diagramRectRight(allBounds) + G.connector.externalGap +
          index * G.connector.laneGap;
        const sourceLane = boundaryAfterRank(spec, plans, source.node.rank);
        const targetLane = boundaryAfterRank(spec, plans, target.node.rank - 1);
        path = [
          sourcePort,
          { x: sourcePort.x, y: sourceLane },
          { x: external, y: sourceLane },
          { x: external, y: targetLane },
          { x: targetPort.x, y: targetLane },
          targetPort,
        ];
      }
    } else if (edge.emphasis === "return") {
      const index = returns.indexOf(edge);
      const external = allBounds.y - G.connector.externalGap -
        index * G.connector.laneGap;
      path = [
        sourcePort,
        { x: sourcePort.x, y: external },
        { x: targetPort.x, y: external },
        targetPort,
      ];
    } else if (target.node.rank === source.node.rank + 1) {
      const lane = laneByEdge.get(edge.id) ??
        boundaryAfterRank(spec, plans, source.node.rank);
      path = [
        sourcePort,
        { x: lane, y: sourcePort.y },
        { x: lane, y: targetPort.y },
        targetPort,
      ];
    } else {
      const index = long.indexOf(edge);
      const external = diagramRectBottom(allBounds) + G.connector.externalGap +
        index * G.connector.laneGap;
      const sourceLane = boundaryAfterRank(spec, plans, source.node.rank);
      const targetLane = boundaryAfterRank(spec, plans, target.node.rank - 1);
      path = [
        sourcePort,
        { x: sourceLane, y: sourcePort.y },
        { x: sourceLane, y: external },
        { x: targetLane, y: external },
        { x: targetLane, y: targetPort.y },
        targetPort,
      ];
    }
    return { edge, connector: connectorFromPath(edge, path) };
  });
}

function segmentBounds(
  start: DiagramPoint,
  end: DiagramPoint,
  expansion: number,
): DiagramRect {
  return diagramPointBounds([start, end], expansion);
}

function labelCandidates(
  connector: DiagramConnector,
  text: DiagramMeasuredText,
): readonly DiagramRect[] {
  const segments = connector.points.slice(1).map((end, index) => ({
    start: connector.points[index] as DiagramPoint,
    end,
    index,
  })).toSorted((left, right) => {
    const leftLength = Math.abs(left.end.x - left.start.x) +
      Math.abs(left.end.y - left.start.y);
    const rightLength = Math.abs(right.end.x - right.start.x) +
      Math.abs(right.end.y - right.start.y);
    return rightLength - leftLength || left.index - right.index;
  });
  const candidates: DiagramRect[] = [];
  for (const { start, end } of segments) {
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const offset = G.connector.labelGap + G.text.clearance;
    if (Math.abs(start.y - end.y) <= 0.02) {
      candidates.push(
        {
          x: centerX - text.width / 2,
          y: centerY - offset - text.height,
          width: text.width,
          height: text.height,
        },
        {
          x: centerX - text.width / 2,
          y: centerY + offset,
          width: text.width,
          height: text.height,
        },
      );
    } else {
      candidates.push(
        {
          x: centerX + offset,
          y: centerY - text.height / 2,
          width: text.width,
          height: text.height,
        },
        {
          x: centerX - offset - text.width,
          y: centerY - text.height / 2,
          width: text.width,
          height: text.height,
        },
      );
    }
  }
  return candidates.map((rect) => ({
    x: roundDiagramNumber(rect.x),
    y: roundDiagramNumber(rect.y),
    width: roundDiagramNumber(rect.width),
    height: roundDiagramNumber(rect.height),
  }));
}

function rectsOverlap(left: DiagramRect, right: DiagramRect): boolean {
  return left.x < diagramRectRight(right) && diagramRectRight(left) > right.x &&
    left.y < diagramRectBottom(right) && diagramRectBottom(left) > right.y;
}

function placeEdgeLabels(
  routed: readonly RoutedEdge[],
  nodeElementsValue: readonly DiagramSceneElement[],
): readonly DiagramText[] {
  const obstacles: DiagramRect[] = nodeElementsValue.map((element) =>
    expandDiagramRect(element.bounds, G.text.clearance)
  );
  const connectorObstacles = routed.flatMap(({ connector }) => {
    const bodies = connector.points.slice(1).map((end, index) =>
      segmentBounds(
        connector.points[index] as DiagramPoint,
        end,
        G.text.clearance,
      )
    );
    return [
      ...bodies,
      expandDiagramRect(connector.arrowhead.bounds, G.text.clearance),
    ];
  });
  const labels: DiagramText[] = [];
  for (const { edge, connector } of routed) {
    if (edge.label === undefined) continue;
    const measured = measuredText(
      edge.label,
      G.text.edgeMaximumWidth,
      "interface",
      G.text.edgeSize,
      G.text.edgeLineHeight,
      "edgeLabelLines",
      `edge ${edge.id} label`,
    );
    const bounds = labelCandidates(connector, measured).find((candidate) =>
      ![...obstacles, ...connectorObstacles].some((obstacle) =>
        rectsOverlap(candidate, obstacle)
      )
    );
    if (bounds === undefined) {
      layoutFailure(
        `Edge label ${edge.id} has no deterministic clear placement.`,
        `edge ${edge.id} label`,
        "Shorten the label or split the overview from a detailed sub-flow.",
      );
    }
    const text = positionedText(
      `edge-${edge.id}-label`,
      edge.id,
      "connector-label",
      measured,
      bounds.x + bounds.width / 2,
      bounds.y,
    );
    labels.push(text);
    obstacles.push(expandDiagramRect(text.bounds, G.text.clearance));
  }
  return labels;
}

/** Lay a validated flow into one projection-neutral scene. */
export default function layoutFlowDiagram(
  spec: ValidatedFlowDiagram,
): DiagramScene {
  const plans = spec.nodes.map((node) => measureNode(node, spec.direction));
  placeNodes(spec, plans);
  const nodes = plans.flatMap(nodeElements);
  const routed = routeEdges(spec, plans);
  const labels = placeEdgeLabels(routed, nodes);
  const rawElements: DiagramSceneElement[] = [
    ...routed.map(({ connector }) => connector),
    ...labels,
    ...nodes,
  ];
  const groups: DiagramSceneGroup[] = [
    ...routed.map(({ edge, connector }) => ({
      id: `edge-${edge.id}-group`,
      children: labels.some((label) => label.ownerId === edge.id)
        ? [connector.id, `edge-${edge.id}-label`]
        : [connector.id],
    })),
    ...plans.map((plan) => ({
      id: `node-${plan.node.id}-group`,
      children: [
        `node-${plan.node.id}-shape`,
        `node-${plan.node.id}-label`,
        ...(plan.annotation === undefined
          ? []
          : [`node-${plan.node.id}-annotation`]),
      ],
    })),
  ];
  return createDiagramScene({
    sourceKind: "flow",
    elements: rawElements,
    groups,
    root: groups.map((group) => group.id),
    meta,
  });
}
