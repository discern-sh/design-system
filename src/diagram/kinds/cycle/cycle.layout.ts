/** Deterministic radial layout for documentation-scale repeating cycles. */

import { DIAGRAM_GEOMETRY, roundDiagramNumber } from "../../geometry.ts";
import {
  createDiagramConnector,
  createDiagramScene,
  type DiagramMeasuredText,
  diagramRectCenter,
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
import meta from "./cycle.meta.ts";
import type {
  ValidatedCycleDiagram,
  ValidatedCycleHub,
  ValidatedCycleStage,
} from "./cycle.spec.ts";

interface StagePlan {
  readonly stage: ValidatedCycleStage;
  readonly angle: number;
  readonly label: DiagramMeasuredText;
  readonly annotation?: DiagramMeasuredText;
  readonly bounds: DiagramRect;
}

interface HubPlan {
  readonly hub: ValidatedCycleHub;
  readonly label: DiagramMeasuredText;
  readonly annotation?: DiagramMeasuredText;
  readonly bounds: DiagramRect;
}

const G = DIAGRAM_GEOMETRY;
const STAGE_MINIMUM_WIDTH = 136;
const STAGE_MAXIMUM_TEXT_WIDTH = 300;
const HUB_MINIMUM_WIDTH = 136;
const HUB_MAXIMUM_TEXT_WIDTH = 240;
const SPOKE_MAXIMUM_TEXT_WIDTH = 180;
const MINIMUM_RING_RADIUS = 300;
const HUB_RING_RADIUS = 340;
const STAGE_ARC_GAP = 72;
const LOOP_OUTER_GAP = 76;
const LOOP_TANGENT_LENGTH = 52;
const SPOKE_LABEL_CLEARANCE = 14;

function measuredText(options: {
  readonly text: string;
  readonly maximumWidth: number;
  readonly fontRole: "interface" | "mono";
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly budget: string;
  readonly path: string;
}): DiagramMeasuredText {
  return measureDiagramLayoutText({ ...options, meta });
}

function contentSize(
  label: DiagramMeasuredText,
  annotation: DiagramMeasuredText | undefined,
): { readonly width: number; readonly height: number } {
  return {
    width: Math.max(label.width, annotation?.width ?? 0),
    height: label.height +
      (annotation === undefined ? 0 : G.node.annotationGap + annotation.height),
  };
}

function stagePlan(
  stage: ValidatedCycleStage,
  angle: number,
  center: DiagramPoint,
  radius: number,
): StagePlan {
  const label = measuredText({
    text: `${stage.sourceOrder + 1}. ${stage.label}`,
    maximumWidth: STAGE_MAXIMUM_TEXT_WIDTH,
    fontRole: "interface",
    fontSize: G.text.primarySize,
    lineHeight: G.text.primaryLineHeight,
    budget: "stageLabelLines",
    path: `stage ${stage.id} label`,
  });
  const annotation = stage.annotation === undefined ? undefined : measuredText({
    text: stage.annotation,
    maximumWidth: STAGE_MAXIMUM_TEXT_WIDTH,
    fontRole: "mono",
    fontSize: G.text.annotationSize,
    lineHeight: G.text.annotationLineHeight,
    budget: "annotationLines",
    path: `stage ${stage.id} annotation`,
  });
  const content = contentSize(label, annotation);
  const width = roundDiagramNumber(Math.max(
    STAGE_MINIMUM_WIDTH,
    content.width + G.node.horizontalPadding * 2,
  ));
  const height = roundDiagramNumber(Math.max(
    G.node.minimumHeight,
    content.height + G.node.verticalPadding * 2,
  ));
  const stageCenter = {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  };
  return {
    stage,
    angle,
    label,
    ...(annotation === undefined ? {} : { annotation }),
    bounds: {
      x: roundDiagramNumber(stageCenter.x - width / 2),
      y: roundDiagramNumber(stageCenter.y - height / 2),
      width,
      height,
    },
  };
}

function hubPlan(hub: ValidatedCycleHub, center: DiagramPoint): HubPlan {
  const label = measuredText({
    text: `Hub: ${hub.label}`,
    maximumWidth: HUB_MAXIMUM_TEXT_WIDTH,
    fontRole: "interface",
    fontSize: G.text.primarySize,
    lineHeight: G.text.primaryLineHeight,
    budget: "hubLabelLines",
    path: `hub ${hub.id} label`,
  });
  const annotation = hub.annotation === undefined ? undefined : measuredText({
    text: hub.annotation,
    maximumWidth: HUB_MAXIMUM_TEXT_WIDTH,
    fontRole: "mono",
    fontSize: G.text.annotationSize,
    lineHeight: G.text.annotationLineHeight,
    budget: "annotationLines",
    path: `hub ${hub.id} annotation`,
  });
  const content = contentSize(label, annotation);
  const width = roundDiagramNumber(Math.max(
    HUB_MINIMUM_WIDTH,
    content.width + G.node.horizontalPadding * 2,
  ));
  const height = roundDiagramNumber(Math.max(
    G.node.minimumHeight,
    content.height + G.node.verticalPadding * 2,
  ));
  return {
    hub,
    label,
    ...(annotation === undefined ? {} : { annotation }),
    bounds: {
      x: roundDiagramNumber(center.x - width / 2),
      y: roundDiagramNumber(center.y - height / 2),
      width,
      height,
    },
  };
}

function shapeForPlan(
  id: string,
  semanticId: string,
  bounds: DiagramRect,
  style: DiagramShape["style"],
): DiagramShape {
  return {
    kind: "shape",
    id,
    semanticId,
    shape: "rounded-rectangle",
    style,
    bounds,
    // A square corner lets radial and tangent ports attach exactly while the
    // semantic focus treatment still distinguishes the hub without colour.
    radius: 0,
  };
}

function planText(
  id: string,
  ownerId: string,
  role: DiagramText["role"],
  measured: DiagramMeasuredText,
  bounds: DiagramRect,
  top: number,
): DiagramText {
  return positionDiagramText({
    id,
    ownerId,
    placement: "inside-shape",
    role,
    measured,
    centerX: bounds.x + bounds.width / 2,
    top,
  });
}

function planElements(
  idPrefix: "stage" | "hub",
  semanticId: string,
  bounds: DiagramRect,
  label: DiagramMeasuredText,
  annotation: DiagramMeasuredText | undefined,
  style: DiagramShape["style"],
): readonly DiagramSceneElement[] {
  const contentHeight = label.height +
    (annotation === undefined ? 0 : G.node.annotationGap + annotation.height);
  const contentTop = bounds.y + (bounds.height - contentHeight) / 2;
  return [
    shapeForPlan(`${idPrefix}-${semanticId}-shape`, semanticId, bounds, style),
    planText(
      `${idPrefix}-${semanticId}-label`,
      semanticId,
      "node-text",
      label,
      bounds,
      contentTop,
    ),
    ...(annotation === undefined ? [] : [
      planText(
        `${idPrefix}-${semanticId}-annotation`,
        semanticId,
        "quiet-annotation",
        annotation,
        bounds,
        contentTop + label.height + G.node.annotationGap,
      ),
    ]),
  ];
}

function unit(angle: number): DiagramPoint {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function clockwiseTangent(angle: number): DiagramPoint {
  return { x: -Math.sin(angle), y: Math.cos(angle) };
}

function add(
  point: DiagramPoint,
  vector: DiagramPoint,
  distance: number,
): DiagramPoint {
  return {
    x: roundDiagramNumber(point.x + vector.x * distance),
    y: roundDiagramNumber(point.y + vector.y * distance),
  };
}

function rectPort(bounds: DiagramRect, direction: DiagramPoint): DiagramPoint {
  const center = diagramRectCenter(bounds);
  const horizontal = Math.abs(direction.x) < 1e-8
    ? Number.POSITIVE_INFINITY
    : bounds.width / 2 / Math.abs(direction.x);
  const vertical = Math.abs(direction.y) < 1e-8
    ? Number.POSITIVE_INFINITY
    : bounds.height / 2 / Math.abs(direction.y);
  const scale = Math.min(horizontal, vertical);
  return add(center, direction, scale);
}

function ringRadius(
  spec: ValidatedCycleDiagram,
  maximumStageExtent: number,
): number {
  const circumferenceRadius = spec.stages.length *
    (maximumStageExtent + STAGE_ARC_GAP) / (Math.PI * 2);
  return roundDiagramNumber(Math.max(
    spec.hub === undefined ? MINIMUM_RING_RADIUS : HUB_RING_RADIUS,
    circumferenceRadius,
  ));
}

function outerLoopConnector(
  source: StagePlan,
  target: StagePlan,
  center: DiagramPoint,
  outerRadius: number,
  angularStep: number,
): DiagramConnector {
  const sourceTangent = clockwiseTangent(source.angle);
  const targetTangent = clockwiseTangent(target.angle);
  const sourcePort = rectPort(source.bounds, sourceTangent);
  const targetPort = rectPort(target.bounds, {
    x: -targetTangent.x,
    y: -targetTangent.y,
  });
  const midpointAngle = source.angle + angularStep / 2;
  const midpointDirection = unit(midpointAngle);
  return createDiagramConnector({
    id: `cycle-${source.stage.id}-to-${target.stage.id}-connector`,
    semanticId: `cycle-order-${source.stage.id}-to-${target.stage.id}`,
    sourceId: source.stage.id,
    targetId: target.stage.id,
    style: "primary",
    routing: "polyline",
    pathWithTip: [
      sourcePort,
      add(sourcePort, sourceTangent, LOOP_TANGENT_LENGTH),
      add(center, midpointDirection, outerRadius),
      add(targetPort, targetTangent, -LOOP_TANGENT_LENGTH),
      targetPort,
    ],
    path: `cycle stage ${source.stage.id}`,
    remedy:
      "Shorten stage labels or split the repeating overview into smaller linked cycles.",
  });
}

function spokeLabel(
  id: string,
  ownerId: string,
  measured: DiagramMeasuredText,
  center: DiagramPoint,
  stageCenter: DiagramPoint,
  tangent: DiagramPoint,
): DiagramText {
  const dx = stageCenter.x - center.x;
  const dy = stageCenter.y - center.y;
  const distance = Math.hypot(dx, dy);
  const radial = { x: dx / distance, y: dy / distance };
  const anchor = add(center, radial, distance * 0.58);
  const projectedHalfExtent = Math.abs(tangent.x) * measured.width / 2 +
    Math.abs(tangent.y) * measured.height / 2;
  const labelCenter = add(
    anchor,
    tangent,
    projectedHalfExtent + SPOKE_LABEL_CLEARANCE,
  );
  return positionDiagramText({
    id,
    ownerId,
    placement: "free",
    role: "connector-label",
    measured,
    centerX: labelCenter.x,
    top: labelCenter.y - measured.height / 2,
  });
}

/** Lay out authored stages clockwise, with hub relationships inside the ring. */
export default function layoutCycleDiagram(
  spec: ValidatedCycleDiagram,
): DiagramScene {
  const angularStep = Math.PI * 2 / spec.stages.length;
  const provisionalCenter = { x: 0, y: 0 };
  const provisionalPlans = spec.stages.map((stage, index) =>
    stagePlan(
      stage,
      -Math.PI / 2 + angularStep * index,
      provisionalCenter,
      0,
    )
  );
  const maximumStageExtent = Math.max(
    ...provisionalPlans.map((plan) =>
      Math.hypot(plan.bounds.width, plan.bounds.height)
    ),
  );
  const radius = ringRadius(spec, maximumStageExtent);
  const center = { x: radius, y: radius };
  const stages = spec.stages.map((stage, index) =>
    stagePlan(stage, -Math.PI / 2 + angularStep * index, center, radius)
  );
  const stageById = new Map(stages.map((plan) => [plan.stage.id, plan]));
  const hub = spec.hub === undefined ? undefined : hubPlan(spec.hub, center);
  const elements: DiagramSceneElement[] = [];
  const groups: DiagramSceneGroup[] = [];
  const root: string[] = [];

  const maximumHalfExtent = maximumStageExtent / 2;
  const outerRadius = radius + maximumHalfExtent + LOOP_OUTER_GAP;
  const loopConnectors = stages.map((stage, index) =>
    outerLoopConnector(
      stage,
      stages[(index + 1) % stages.length] as StagePlan,
      center,
      outerRadius,
      angularStep,
    )
  );
  elements.push(...loopConnectors);
  groups.push({
    id: "cycle-loop-group",
    children: loopConnectors.map((connector) => connector.id),
  });
  root.push("cycle-loop-group");

  if (hub !== undefined && spec.spokes.length > 0) {
    const spokeChildren: string[] = [];
    for (const spoke of spec.spokes) {
      const stage = stageById.get(spoke.stageId) as StagePlan;
      const stageCenter = diagramRectCenter(stage.bounds);
      const radialDistance = Math.hypot(
        stageCenter.x - center.x,
        stageCenter.y - center.y,
      );
      const radial = {
        x: (stageCenter.x - center.x) / radialDistance,
        y: (stageCenter.y - center.y) / radialDistance,
      };
      const stagePort = rectPort(stage.bounds, { x: -radial.x, y: -radial.y });
      const hubPort = rectPort(hub.bounds, radial);
      const sourceId = spoke.direction === "to-hub"
        ? stage.stage.id
        : hub.hub.id;
      const targetId = spoke.direction === "to-hub"
        ? hub.hub.id
        : stage.stage.id;
      const connector = createDiagramConnector({
        id: `spoke-${spoke.id}-connector`,
        semanticId: spoke.id,
        sourceId,
        targetId,
        style: spoke.direction === "to-hub" ? "secondary" : "return",
        routing: "polyline",
        pathWithTip: spoke.direction === "to-hub"
          ? [stagePort, hubPort]
          : [hubPort, stagePort],
        path: `spoke ${spoke.id}`,
        remedy:
          "Use one concise hub relationship per stage or split the exchange into a sequence diagram.",
      });
      const labelMeasure = measuredText({
        text: spoke.label,
        maximumWidth: SPOKE_MAXIMUM_TEXT_WIDTH,
        fontRole: "interface",
        fontSize: G.text.edgeSize,
        lineHeight: G.text.edgeLineHeight,
        budget: "spokeLabelLines",
        path: `spoke ${spoke.id} label`,
      });
      const label = spokeLabel(
        `spoke-${spoke.id}-label`,
        spoke.id,
        labelMeasure,
        center,
        stageCenter,
        clockwiseTangent(stage.angle),
      );
      elements.push(connector, label);
      spokeChildren.push(connector.id, label.id);
    }
    groups.push({ id: "cycle-spokes-group", children: spokeChildren });
    root.push("cycle-spokes-group");
  }

  for (const stage of stages) {
    const stageElements = planElements(
      "stage",
      stage.stage.id,
      stage.bounds,
      stage.label,
      stage.annotation,
      "ordinary",
    );
    elements.push(...stageElements);
    const groupId = `stage-${stage.stage.id}-group`;
    groups.push({
      id: groupId,
      children: stageElements.map((element) => element.id),
    });
    root.push(groupId);
  }
  if (hub !== undefined) {
    const hubElements = planElements(
      "hub",
      hub.hub.id,
      hub.bounds,
      hub.label,
      hub.annotation,
      "focus",
    );
    elements.push(...hubElements);
    groups.push({
      id: `hub-${hub.hub.id}-group`,
      children: hubElements.map((element) => element.id),
    });
    root.push(`hub-${hub.hub.id}-group`);
  }

  return createDiagramScene({
    sourceKind: "cycle",
    elements,
    groups,
    root,
    meta,
  });
}
