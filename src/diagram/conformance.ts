/**
 * Universal post-layout conformance for the closed diagram scene vocabulary.
 *
 * @module
 */

import { DiagramConformanceError } from "./errors.ts";
import {
  DIAGRAM_GEOMETRY,
  diagramPointBounds,
  diagramRectBottom,
  diagramRectContains,
  diagramRectRight,
  diagramRectsOverlap,
  diagramRectUnion,
  expandDiagramRect,
  roundDiagramNumber,
} from "./geometry.ts";
import type {
  DiagramArrowhead,
  DiagramConnector,
  DiagramGuide,
  DiagramPoint,
  DiagramRect,
  DiagramRegion,
  DiagramScene,
  DiagramSceneElement,
  DiagramShape,
  DiagramText,
} from "./scene.ts";

const EPSILON = 0.02;
const ATTACHMENT_TOLERANCE = 0.05;
const TEXT_CLEARANCE = DIAGRAM_GEOMETRY.text.clearance;
const ARROW_CLEARANCE = DIAGRAM_GEOMETRY.connector.arrowClearance;

function defect(
  message: string,
  facts: Readonly<Record<string, string | number | boolean>> = {},
): never {
  throw new DiagramConformanceError(message, facts);
}

function finite(value: number, label: string): void {
  if (!Number.isFinite(value)) defect(`${label} must be finite.`, { value });
}

function positiveRect(rect: DiagramRect, label: string): void {
  finite(rect.x, `${label}.x`);
  finite(rect.y, `${label}.y`);
  finite(rect.width, `${label}.width`);
  finite(rect.height, `${label}.height`);
  if (rect.width <= 0 || rect.height <= 0) {
    defect(`${label} must have positive bounds.`, {
      width: rect.width,
      height: rect.height,
    });
  }
}

function pointInRect(point: DiagramPoint, rect: DiagramRect): boolean {
  return point.x >= rect.x - EPSILON &&
    point.x <= diagramRectRight(rect) + EPSILON &&
    point.y >= rect.y - EPSILON &&
    point.y <= diagramRectBottom(rect) + EPSILON;
}

function pointStrictlyInRect(point: DiagramPoint, rect: DiagramRect): boolean {
  return point.x > rect.x + EPSILON &&
    point.x < diagramRectRight(rect) - EPSILON &&
    point.y > rect.y + EPSILON &&
    point.y < diagramRectBottom(rect) - EPSILON;
}

function pointStrictlyInShape(
  point: DiagramPoint,
  shape: DiagramShape,
): boolean {
  if (!pointStrictlyInRect(point, shape.bounds)) return false;
  const centerX = shape.bounds.x + shape.bounds.width / 2;
  const centerY = shape.bounds.y + shape.bounds.height / 2;
  if (shape.shape === "diamond") {
    return Math.abs(point.x - centerX) / (shape.bounds.width / 2) +
        Math.abs(point.y - centerY) / (shape.bounds.height / 2) <
      1 - EPSILON;
  }
  const radius = Math.min(
    shape.radius,
    shape.bounds.width / 2,
    shape.bounds.height / 2,
  );
  if (radius <= EPSILON) return true;
  if (
    point.x >= shape.bounds.x + radius &&
      point.x <= diagramRectRight(shape.bounds) - radius ||
    point.y >= shape.bounds.y + radius &&
      point.y <= diagramRectBottom(shape.bounds) - radius
  ) return true;
  const cornerX = point.x < centerX
    ? shape.bounds.x + radius
    : diagramRectRight(shape.bounds) - radius;
  const cornerY = point.y < centerY
    ? shape.bounds.y + radius
    : diagramRectBottom(shape.bounds) - radius;
  return Math.hypot(point.x - cornerX, point.y - cornerY) < radius - EPSILON;
}

function segmentRectInterval(
  start: DiagramPoint,
  end: DiagramPoint,
  rect: DiagramRect,
): readonly [number, number] | undefined {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  let entry = 0;
  let exit = 1;
  const boundaries = [
    [-dx, start.x - rect.x],
    [dx, diagramRectRight(rect) - start.x],
    [-dy, start.y - rect.y],
    [dy, diagramRectBottom(rect) - start.y],
  ] as const;
  for (const [direction, distance] of boundaries) {
    if (Math.abs(direction) <= EPSILON) {
      if (distance < -EPSILON) return undefined;
      continue;
    }
    const ratio = distance / direction;
    if (direction < 0) entry = Math.max(entry, ratio);
    else exit = Math.min(exit, ratio);
    if (entry > exit + EPSILON) return undefined;
  }
  return [entry, exit];
}

function segmentCrossesShapeInterior(
  start: DiagramPoint,
  end: DiagramPoint,
  shape: DiagramShape,
): boolean {
  const interval = segmentRectInterval(start, end, shape.bounds);
  if (interval === undefined || interval[1] - interval[0] <= EPSILON) {
    return false;
  }
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= EPSILON) return pointStrictlyInShape(start, shape);
  const centerX = shape.bounds.x + shape.bounds.width / 2;
  const centerY = shape.bounds.y + shape.bounds.height / 2;
  const closest = Math.max(
    interval[0],
    Math.min(
      interval[1],
      ((centerX - start.x) * dx + (centerY - start.y) * dy) /
        lengthSquared,
    ),
  );
  return pointStrictlyInShape(
    { x: start.x + dx * closest, y: start.y + dy * closest },
    shape,
  );
}

function shapeContainsRect(
  shape: DiagramShape,
  rect: DiagramRect,
  clearance: number,
): boolean {
  if (shape.shape !== "diamond") {
    return diagramRectContains(shape.bounds, rect, clearance);
  }
  const centerX = shape.bounds.x + shape.bounds.width / 2;
  const centerY = shape.bounds.y + shape.bounds.height / 2;
  const radiusX = shape.bounds.width / 2;
  const radiusY = shape.bounds.height / 2;
  const corners = [
    [rect.x - clearance, rect.y - clearance],
    [diagramRectRight(rect) + clearance, rect.y - clearance],
    [rect.x - clearance, diagramRectBottom(rect) + clearance],
    [diagramRectRight(rect) + clearance, diagramRectBottom(rect) + clearance],
  ] as const;
  return corners.every(([x, y]) =>
    Math.abs(x - centerX) / radiusX + Math.abs(y - centerY) / radiusY <=
      1 + EPSILON
  );
}

function pointOnShapeBoundary(
  point: DiagramPoint,
  shape: DiagramShape,
): boolean {
  if (!pointInRect(point, shape.bounds)) return false;
  const centerX = shape.bounds.x + shape.bounds.width / 2;
  const centerY = shape.bounds.y + shape.bounds.height / 2;
  if (shape.shape === "diamond") {
    const value = Math.abs(point.x - centerX) / (shape.bounds.width / 2) +
      Math.abs(point.y - centerY) / (shape.bounds.height / 2);
    return Math.abs(value - 1) <= ATTACHMENT_TOLERANCE;
  }
  const radius = Math.min(
    shape.radius,
    shape.bounds.width / 2,
    shape.bounds.height / 2,
  );
  const onHorizontalSide =
    Math.abs(point.y - shape.bounds.y) <= ATTACHMENT_TOLERANCE ||
    Math.abs(point.y - diagramRectBottom(shape.bounds)) <=
      ATTACHMENT_TOLERANCE;
  const onVerticalSide =
    Math.abs(point.x - shape.bounds.x) <= ATTACHMENT_TOLERANCE ||
    Math.abs(point.x - diagramRectRight(shape.bounds)) <=
      ATTACHMENT_TOLERANCE;
  const onStraightBoundary = (onHorizontalSide &&
    point.x >= shape.bounds.x + radius - EPSILON &&
    point.x <= diagramRectRight(shape.bounds) - radius + EPSILON) ||
    (onVerticalSide &&
      point.y >= shape.bounds.y + radius - EPSILON &&
      point.y <= diagramRectBottom(shape.bounds) - radius + EPSILON);
  if (onStraightBoundary || radius === 0) return onStraightBoundary;
  const cornerX = point.x < centerX
    ? shape.bounds.x + radius
    : diagramRectRight(shape.bounds) - radius;
  const cornerY = point.y < centerY
    ? shape.bounds.y + radius
    : diagramRectBottom(shape.bounds) - radius;
  const inCorner = Math.abs(point.x - centerX) >=
      shape.bounds.width / 2 - radius - EPSILON &&
    Math.abs(point.y - centerY) >=
      shape.bounds.height / 2 - radius - EPSILON;
  return inCorner &&
    Math.abs(Math.hypot(point.x - cornerX, point.y - cornerY) - radius) <=
      ATTACHMENT_TOLERANCE;
}

function segmentIntersectsRect(
  start: DiagramPoint,
  end: DiagramPoint,
  rect: DiagramRect,
): boolean {
  return segmentRectInterval(start, end, rect) !== undefined;
}

function pointOnSegment(
  point: DiagramPoint,
  start: DiagramPoint,
  end: DiagramPoint,
): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length <= EPSILON) return equalPoint(point, start);
  const cross = Math.abs(
    (point.x - start.x) * dy - (point.y - start.y) * dx,
  );
  if (cross > ATTACHMENT_TOLERANCE * length) return false;
  const projection = (point.x - start.x) * dx + (point.y - start.y) * dy;
  return projection >= -EPSILON && projection <= length ** 2 + EPSILON;
}

function pointOnGuide(point: DiagramPoint, guide: DiagramGuide): boolean {
  return guide.points.slice(1).some((end, index) =>
    pointOnSegment(point, guide.points[index] as DiagramPoint, end)
  );
}

function connectorSegments(connector: DiagramConnector): readonly (
  readonly [DiagramPoint, DiagramPoint]
)[] {
  const segments: Array<readonly [DiagramPoint, DiagramPoint]> = [];
  for (let index = 1; index < connector.points.length; index += 1) {
    const start = connector.points[index - 1];
    const end = connector.points[index];
    if (start !== undefined && end !== undefined) segments.push([start, end]);
  }
  return segments;
}

function equalPoint(left: DiagramPoint, right: DiagramPoint): boolean {
  return Math.abs(left.x - right.x) <= EPSILON &&
    Math.abs(left.y - right.y) <= EPSILON;
}

function segmentsOverlap(
  left: readonly [DiagramPoint, DiagramPoint],
  right: readonly [DiagramPoint, DiagramPoint],
): boolean {
  const [leftStart, leftEnd] = left;
  const [rightStart, rightEnd] = right;
  const leftDx = leftEnd.x - leftStart.x;
  const leftDy = leftEnd.y - leftStart.y;
  const rightDx = rightEnd.x - rightStart.x;
  const rightDy = rightEnd.y - rightStart.y;
  if (Math.abs(leftDx * rightDy - leftDy * rightDx) > EPSILON) return false;
  if (
    Math.abs(
      (rightStart.x - leftStart.x) * leftDy -
        (rightStart.y - leftStart.y) * leftDx,
    ) > EPSILON
  ) return false;
  const horizontal = Math.abs(leftDx) >= Math.abs(leftDy);
  const leftValues = horizontal
    ? [leftStart.x, leftEnd.x]
    : [leftStart.y, leftEnd.y];
  const rightValues = horizontal
    ? [rightStart.x, rightEnd.x]
    : [rightStart.y, rightEnd.y];
  return Math.min(Math.max(...leftValues), Math.max(...rightValues)) -
      Math.max(Math.min(...leftValues), Math.min(...rightValues)) > EPSILON;
}

function elementBounds(element: DiagramSceneElement): DiagramRect {
  return element.bounds;
}

function arrowBounds(arrowhead: DiagramArrowhead): DiagramRect {
  return diagramPointBounds(
    [arrowhead.tip, arrowhead.left, arrowhead.right],
  );
}

function expectedConnectorBounds(connector: DiagramConnector): DiagramRect {
  return diagramRectUnion([
    diagramPointBounds(connector.points, connector.lineWidth / 2),
    arrowBounds(connector.arrowhead),
  ]);
}

function expectedGuideBounds(guide: DiagramGuide): DiagramRect {
  return diagramPointBounds(guide.points, guide.lineWidth / 2);
}

function equalRect(left: DiagramRect, right: DiagramRect): boolean {
  return Math.abs(left.x - right.x) <= EPSILON &&
    Math.abs(left.y - right.y) <= EPSILON &&
    Math.abs(left.width - right.width) <= EPSILON &&
    Math.abs(left.height - right.height) <= EPSILON;
}

function assertText(text: DiagramText): void {
  positiveRect(text.bounds, `text ${text.id}`);
  finite(text.fontSize, `text ${text.id}.fontSize`);
  finite(text.lineHeight, `text ${text.id}.lineHeight`);
  if (
    text.fontSize <= 0 || text.lineHeight < text.fontSize ||
    text.lines.length === 0 ||
    !["inside-shape", "inside-region", "free"].includes(text.placement)
  ) {
    defect(`Text ${text.id} has invalid line geometry.`);
  }
  for (const line of text.lines) {
    finite(line.x, `text ${text.id} line x`);
    finite(line.baseline, `text ${text.id} line baseline`);
    finite(line.width, `text ${text.id} line width`);
    if (line.text === "" || line.width <= 0) {
      defect(`Text ${text.id} contains an empty or non-positive line.`);
    }
    const lineRect = {
      x: line.x,
      y: line.baseline - text.fontSize,
      width: line.width,
      height: text.lineHeight,
    };
    if (!diagramRectContains(text.bounds, lineRect)) {
      defect(`Text line escapes declared bounds for ${text.id}.`);
    }
  }
}

function deepFreeze<T>(value: T, visited = new Set<object>()): T {
  if (typeof value !== "object" || value === null || visited.has(value)) {
    return value;
  }
  visited.add(value);
  for (const child of Object.values(value)) deepFreeze(child, visited);
  return Object.freeze(value);
}

/**
 * Prove universal scene promises, then recursively freeze the accepted scene.
 * Kind layout is incomplete until this authority returns.
 */
export function conformDiagramScene(scene: DiagramScene): DiagramScene {
  if (scene.kind !== "diagram-scene" || scene.sourceKind === "") {
    defect("Scene identity is incomplete.");
  }
  positiveRect(scene.canvas.bounds, "canvas");
  finite(scene.canvas.padding, "canvas.padding");
  if (scene.canvas.padding < DIAGRAM_GEOMETRY.canvasPadding) {
    defect(
      `Canvas padding must be at least ${DIAGRAM_GEOMETRY.canvasPadding}.`,
      { padding: scene.canvas.padding },
    );
  }

  const ids = new Set<string>();
  for (const element of scene.elements) {
    if (ids.has(element.id)) defect(`Duplicate scene identity ${element.id}.`);
    ids.add(element.id);
    positiveRect(element.bounds, `${element.kind} ${element.id}`);
    if (!diagramRectContains(scene.canvas.bounds, element.bounds)) {
      defect(`${element.kind} ${element.id} escapes the canvas.`);
    }
    if (element.kind === "text") assertText(element);
    if (element.kind === "shape") {
      finite(element.radius, `shape ${element.id}.radius`);
      if (element.radius < 0) {
        defect(`Shape ${element.id} has a negative radius.`);
      }
    }
    if (element.kind === "region") {
      finite(element.radius, `region ${element.id}.radius`);
      finite(element.lineWidth, `region ${element.id}.lineWidth`);
      if (element.radius < 0 || element.lineWidth <= 0) {
        defect(`Region ${element.id} has invalid boundary geometry.`);
      }
    }
    if (element.kind === "guide") {
      finite(element.lineWidth, `guide ${element.id}.lineWidth`);
      if (
        element.lineWidth <= 0 || element.points.length < 2 ||
        !equalRect(element.bounds, expectedGuideBounds(element))
      ) {
        defect(`Guide ${element.id} has incomplete or stale geometry.`);
      }
      for (const point of element.points) {
        finite(point.x, `guide ${element.id} point x`);
        finite(point.y, `guide ${element.id} point y`);
      }
      for (let index = 1; index < element.points.length; index += 1) {
        if (
          equalPoint(
            element.points[index - 1] as DiagramPoint,
            element.points[index] as DiagramPoint,
          )
        ) defect(`Guide ${element.id} contains a zero-length run.`);
      }
    }
  }
  const groupIds = new Set<string>();
  for (const group of scene.groups) {
    if (ids.has(group.id) || groupIds.has(group.id)) {
      defect(`Duplicate scene group identity ${group.id}.`);
    }
    groupIds.add(group.id);
  }
  const allIds = new Set([...ids, ...groupIds]);
  if (
    scene.root.length === 0 || new Set(scene.root).size !== scene.root.length
  ) {
    defect("Scene root must contain unique ordered members.");
  }
  const referenceCounts = new Map([...allIds].map((id) => [id, 0]));
  for (const id of scene.root) {
    if (!allIds.has(id)) defect(`Scene root refers to missing member ${id}.`);
    referenceCounts.set(id, (referenceCounts.get(id) ?? 0) + 1);
  }
  for (const group of scene.groups) {
    if (
      group.children.length === 0 ||
      new Set(group.children).size !== group.children.length
    ) {
      defect(`Scene group ${group.id} must contain unique ordered members.`);
    }
    for (const id of group.children) {
      if (!allIds.has(id)) {
        defect(`Scene group ${group.id} refers to missing member ${id}.`);
      }
      if (id === group.id) defect(`Scene group ${group.id} contains itself.`);
      referenceCounts.set(id, (referenceCounts.get(id) ?? 0) + 1);
    }
  }
  for (const [id, references] of referenceCounts) {
    if (references !== 1) {
      defect(`Scene member ${id} must be reachable exactly once.`, {
        references,
      });
    }
  }
  const reachable = new Set<string>();
  const visitGroup = (id: string, active: Set<string>): void => {
    if (active.has(id)) defect(`Scene group cycle reaches ${id}.`);
    reachable.add(id);
    const group = scene.groups.find((candidate) => candidate.id === id);
    if (group === undefined) return;
    const next = new Set(active).add(id);
    for (const child of group.children) visitGroup(child, next);
  };
  for (const id of scene.root) visitGroup(id, new Set());
  if (reachable.size !== allIds.size) {
    const missing = [...allIds].find((id) => !reachable.has(id)) ?? "unknown";
    defect(`Scene member ${missing} is not reachable from the root.`);
  }

  const shapes = scene.elements.filter((element): element is DiagramShape =>
    element.kind === "shape"
  );
  const texts = scene.elements.filter((element): element is DiagramText =>
    element.kind === "text"
  );
  const regions = scene.elements.filter((element): element is DiagramRegion =>
    element.kind === "region"
  );
  const guides = scene.elements.filter((element): element is DiagramGuide =>
    element.kind === "guide"
  );
  const connectors = scene.elements.filter((
    element,
  ): element is DiagramConnector => element.kind === "connector");
  if (new Set(shapes.map((shape) => shape.semanticId)).size !== shapes.length) {
    defect("Scene node semantic identities must be unique.");
  }
  if (
    new Set(connectors.map((connector) => connector.semanticId)).size !==
      connectors.length
  ) {
    defect("Scene connector semantic identities must be unique.");
  }
  if (
    new Set(regions.map((region) => region.semanticId)).size !== regions.length
  ) {
    defect("Scene region semantic identities must be unique.");
  }
  if (new Set(guides.map((guide) => guide.semanticId)).size !== guides.length) {
    defect("Scene guide semantic identities must be unique.");
  }
  for (let left = 0; left < shapes.length; left += 1) {
    for (let right = left + 1; right < shapes.length; right += 1) {
      const leftShape = shapes[left];
      const rightShape = shapes[right];
      if (
        leftShape !== undefined && rightShape !== undefined &&
        diagramRectsOverlap(leftShape.bounds, rightShape.bounds)
      ) {
        defect(
          `Node shapes ${leftShape.semanticId} and ${rightShape.semanticId} overlap.`,
        );
      }
    }
  }
  const semanticOwners = new Set([
    ...shapes.map((shape) => shape.semanticId),
    ...regions.map((region) => region.semanticId),
    ...guides.map((guide) => guide.semanticId),
    ...connectors.map((connector) => connector.semanticId),
  ]);
  for (const text of texts) {
    if (!semanticOwners.has(text.ownerId)) {
      defect(`Text ${text.id} has no owning semantic scene member.`);
    }
    if (text.placement === "inside-shape") {
      const owner = shapes.find((shape) => shape.semanticId === text.ownerId);
      if (owner === undefined) {
        defect(`Text ${text.id} has no owning node shape.`);
      }
      if (!shapeContainsRect(owner, text.bounds, TEXT_CLEARANCE)) {
        defect(`Text ${text.id} lacks clearance inside its actual node shape.`);
      }
    } else if (text.placement === "inside-region") {
      const owner = regions.find((region) =>
        region.semanticId === text.ownerId
      );
      if (owner === undefined) {
        defect(`Text ${text.id} has no owning region.`);
      }
      if (!diagramRectContains(owner.bounds, text.bounds, TEXT_CLEARANCE)) {
        defect(`Text ${text.id} lacks clearance inside its region.`);
      }
    }
  }
  for (let left = 0; left < texts.length; left += 1) {
    for (let right = left + 1; right < texts.length; right += 1) {
      const leftText = texts[left];
      const rightText = texts[right];
      if (
        leftText !== undefined && rightText !== undefined &&
        diagramRectsOverlap(leftText.bounds, rightText.bounds, TEXT_CLEARANCE)
      ) {
        defect(`Text ${leftText.id} collides with ${rightText.id}.`);
      }
    }
  }
  for (const text of texts) {
    for (const shape of shapes) {
      if (
        text.placement === "inside-shape" &&
        text.ownerId === shape.semanticId
      ) continue;
      if (diagramRectsOverlap(text.bounds, shape.bounds, TEXT_CLEARANCE)) {
        defect(
          `Text ${text.id} overlaps unrelated node ${shape.semanticId}.`,
        );
      }
    }
  }
  for (const connector of connectors) {
    if (
      connector.points.length < 2 || connector.lineWidth <= 0 ||
      !["orthogonal", "polyline"].includes(connector.routing)
    ) {
      defect(`Connector ${connector.semanticId} has incomplete body geometry.`);
    }
    const source = shapes.find((shape) =>
      shape.semanticId === connector.sourceId
    ) ?? guides.find((guide) => guide.semanticId === connector.sourceId);
    const target = shapes.find((shape) =>
      shape.semanticId === connector.targetId
    ) ?? guides.find((guide) => guide.semanticId === connector.targetId);
    if (source === undefined || target === undefined) {
      defect(`Connector ${connector.semanticId} has no scene endpoint.`);
    }
    const first = connector.points[0];
    const last = connector.points.at(-1);
    if (
      first === undefined || last === undefined ||
      !(source.kind === "shape"
        ? pointOnShapeBoundary(first, source)
        : pointOnGuide(first, source))
    ) {
      defect(
        `Connector ${connector.semanticId} is detached from its source boundary.`,
      );
    }
    if (
      !(target.kind === "shape"
        ? pointOnShapeBoundary(connector.arrowhead.tip, target)
        : pointOnGuide(connector.arrowhead.tip, target))
    ) {
      defect(
        `Connector ${connector.semanticId} is detached from its target boundary.`,
      );
    }
    const arrowBase = {
      x: roundDiagramNumber(
        (connector.arrowhead.left.x + connector.arrowhead.right.x) / 2,
      ),
      y: roundDiagramNumber(
        (connector.arrowhead.left.y + connector.arrowhead.right.y) / 2,
      ),
    };
    const arrowDx = connector.arrowhead.tip.x - arrowBase.x;
    const arrowDy = connector.arrowhead.tip.y - arrowBase.y;
    const wingDx = connector.arrowhead.left.x - connector.arrowhead.right.x;
    const wingDy = connector.arrowhead.left.y - connector.arrowhead.right.y;
    if (
      !equalPoint(arrowBase, last) ||
      Math.abs(
          Math.hypot(arrowDx, arrowDy) -
            DIAGRAM_GEOMETRY.connector.arrowLength,
        ) > ATTACHMENT_TOLERANCE ||
      Math.abs(
          Math.hypot(
            connector.arrowhead.left.x - arrowBase.x,
            connector.arrowhead.left.y - arrowBase.y,
          ) - DIAGRAM_GEOMETRY.connector.arrowHalfWidth,
        ) > ATTACHMENT_TOLERANCE ||
      Math.abs(
          Math.hypot(
            connector.arrowhead.right.x - arrowBase.x,
            connector.arrowhead.right.y - arrowBase.y,
          ) - DIAGRAM_GEOMETRY.connector.arrowHalfWidth,
        ) > ATTACHMENT_TOLERANCE ||
      Math.abs(arrowDx * wingDx + arrowDy * wingDy) /
            (Math.hypot(arrowDx, arrowDy) * Math.hypot(wingDx, wingDy)) >
        0.005
    ) {
      defect(
        `Connector ${connector.semanticId} has invalid arrowhead geometry.`,
      );
    }
    const beforeBase = connector.points.at(-2);
    if (beforeBase === undefined) {
      defect(`Connector ${connector.semanticId} has no arrowhead approach.`);
    }
    const approachX = arrowBase.x - beforeBase.x;
    const approachY = arrowBase.y - beforeBase.y;
    if (
      approachX * arrowDx + approachY * arrowDy <= EPSILON ||
      Math.abs(approachX * arrowDy - approachY * arrowDx) >
        ATTACHMENT_TOLERANCE * Math.hypot(approachX, approachY)
    ) {
      defect(`Connector ${connector.semanticId} arrowhead opposes its body.`);
    }
    if (
      target.kind === "shape" &&
      [
        [connector.arrowhead.tip, connector.arrowhead.left],
        [connector.arrowhead.tip, connector.arrowhead.right],
        [connector.arrowhead.left, connector.arrowhead.right],
      ].some(([start, end]) =>
        start !== undefined && end !== undefined &&
        segmentCrossesShapeInterior(start, end, target)
      )
    ) {
      defect(
        `Connector ${connector.semanticId} arrowhead passes behind its target fill.`,
      );
    }
    const second = connector.points[1];
    if (
      source.kind === "shape" && second !== undefined &&
      pointStrictlyInRect(second, source.bounds)
    ) {
      defect(
        `Connector ${connector.semanticId} passes behind its source fill.`,
      );
    }
    if (target.kind === "shape" && pointStrictlyInRect(last, target.bounds)) {
      defect(
        `Connector ${connector.semanticId} passes behind its target fill.`,
      );
    }
    if (
      !equalRect(connector.bounds, expectedConnectorBounds(connector)) ||
      !equalRect(connector.arrowhead.bounds, arrowBounds(connector.arrowhead))
    ) {
      defect(`Connector ${connector.semanticId} declares stale bounds.`);
    }
    for (const [start, end] of connectorSegments(connector)) {
      if (equalPoint(start, end)) {
        defect(`Connector ${connector.semanticId} contains a zero-length run.`);
      }
      if (
        connector.routing === "orthogonal" &&
        Math.abs(start.x - end.x) > EPSILON &&
        Math.abs(start.y - end.y) > EPSILON
      ) {
        defect(
          `Orthogonal connector ${connector.semanticId} contains a diagonal segment.`,
        );
      }
      for (const shape of shapes) {
        if (shape === source || shape === target) {
          if (segmentCrossesShapeInterior(start, end, shape)) {
            defect(
              `Connector ${connector.semanticId} passes behind its ${
                shape === source ? "source" : "target"
              } fill.`,
            );
          }
          continue;
        }
        if (
          segmentIntersectsRect(
            start,
            end,
            expandDiagramRect(shape.bounds, connector.lineWidth / 2),
          )
        ) {
          defect(
            `Connector ${connector.semanticId} crosses unrelated node ${shape.semanticId}.`,
          );
        }
      }
      for (const text of texts) {
        if (
          segmentIntersectsRect(
            start,
            end,
            expandDiagramRect(text.bounds, TEXT_CLEARANCE),
          )
        ) {
          defect(`Connector ${connector.semanticId} crosses text ${text.id}.`);
        }
      }
    }
    for (const shape of shapes) {
      if (target.kind === "shape" && shape === target) continue;
      if (
        diagramRectsOverlap(
          connector.arrowhead.bounds,
          shape.bounds,
          ARROW_CLEARANCE,
        )
      ) {
        defect(
          `Connector ${connector.semanticId} arrowhead lacks node clearance.`,
        );
      }
    }
    for (const text of texts) {
      if (
        diagramRectsOverlap(
          connector.arrowhead.bounds,
          text.bounds,
          ARROW_CLEARANCE,
        )
      ) {
        defect(
          `Connector ${connector.semanticId} arrowhead lacks text clearance.`,
        );
      }
    }
  }

  const ports = connectors.flatMap((connector) => [
    {
      nodeId: connector.sourceId,
      relationshipId: connector.semanticId,
      point: connector.points[0] as DiagramPoint,
    },
    {
      nodeId: connector.targetId,
      relationshipId: connector.semanticId,
      point: connector.arrowhead.tip,
    },
  ]);
  for (let left = 0; left < ports.length; left += 1) {
    for (let right = left + 1; right < ports.length; right += 1) {
      const leftPort = ports[left];
      const rightPort = ports[right];
      if (
        leftPort !== undefined && rightPort !== undefined &&
        leftPort.nodeId === rightPort.nodeId &&
        equalPoint(leftPort.point, rightPort.point)
      ) {
        defect(
          `Connectors ${leftPort.relationshipId} and ${rightPort.relationshipId} reuse node ${leftPort.nodeId} port.`,
        );
      }
    }
  }
  for (let left = 0; left < connectors.length; left += 1) {
    const leftConnector = connectors[left];
    if (leftConnector === undefined) continue;
    const leftSegments = connectorSegments(leftConnector);
    for (let first = 0; first < leftSegments.length; first += 1) {
      for (let second = first + 1; second < leftSegments.length; second += 1) {
        const firstSegment = leftSegments[first];
        const secondSegment = leftSegments[second];
        if (
          firstSegment !== undefined && secondSegment !== undefined &&
          segmentsOverlap(firstSegment, secondSegment)
        ) {
          defect(
            `Connector ${leftConnector.semanticId} retraces a positive-length run.`,
          );
        }
      }
    }
    for (let right = left + 1; right < connectors.length; right += 1) {
      const rightConnector = connectors[right];
      if (
        rightConnector !== undefined &&
        leftSegments.some((leftSegment) =>
          connectorSegments(rightConnector).some((rightSegment) =>
            segmentsOverlap(leftSegment, rightSegment)
          )
        )
      ) {
        defect(
          `Connectors ${leftConnector.semanticId} and ${rightConnector.semanticId} overlap along a positive-length run.`,
        );
      }
    }
  }

  if (scene.elements.length === 0) defect("A diagram scene must not be empty.");
  const content = diagramRectUnion(scene.elements.map(elementBounds));
  const expectedCanvas = {
    x: roundDiagramNumber(content.x - scene.canvas.padding),
    y: roundDiagramNumber(content.y - scene.canvas.padding),
    width: roundDiagramNumber(content.width + scene.canvas.padding * 2),
    height: roundDiagramNumber(content.height + scene.canvas.padding * 2),
  };
  if (!equalRect(scene.canvas.bounds, expectedCanvas)) {
    defect(
      "Canvas bounds are not tight around scene content and declared padding.",
    );
  }
  return deepFreeze(scene);
}
