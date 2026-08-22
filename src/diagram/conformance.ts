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
  DiagramPoint,
  DiagramRect,
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
  const onHorizontalSide =
    Math.abs(point.y - shape.bounds.y) <= ATTACHMENT_TOLERANCE ||
    Math.abs(point.y - diagramRectBottom(shape.bounds)) <=
      ATTACHMENT_TOLERANCE;
  const onVerticalSide =
    Math.abs(point.x - shape.bounds.x) <= ATTACHMENT_TOLERANCE ||
    Math.abs(point.x - diagramRectRight(shape.bounds)) <=
      ATTACHMENT_TOLERANCE;
  return (onHorizontalSide &&
    point.x >= shape.bounds.x + shape.radius - EPSILON &&
    point.x <= diagramRectRight(shape.bounds) - shape.radius + EPSILON) ||
    (onVerticalSide &&
      point.y >= shape.bounds.y + shape.radius - EPSILON &&
      point.y <= diagramRectBottom(shape.bounds) - shape.radius + EPSILON);
}

function segmentIntersectsRect(
  start: DiagramPoint,
  end: DiagramPoint,
  rect: DiagramRect,
): boolean {
  if (Math.abs(start.x - end.x) <= EPSILON) {
    if (
      start.x < rect.x - EPSILON || start.x > diagramRectRight(rect) + EPSILON
    ) {
      return false;
    }
    const low = Math.min(start.y, end.y);
    const high = Math.max(start.y, end.y);
    return high >= rect.y - EPSILON && low <= diagramRectBottom(rect) + EPSILON;
  }
  if (Math.abs(start.y - end.y) <= EPSILON) {
    if (
      start.y < rect.y - EPSILON || start.y > diagramRectBottom(rect) + EPSILON
    ) {
      return false;
    }
    const low = Math.min(start.x, end.x);
    const high = Math.max(start.x, end.x);
    return high >= rect.x - EPSILON && low <= diagramRectRight(rect) + EPSILON;
  }
  defect("Diagram connectors must use deterministic orthogonal segments.");
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
    text.lines.length === 0
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
  if (scene.canvas.padding <= 0) defect("Canvas padding must be positive.");

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
  for (const text of texts) {
    if (text.role === "connector-label") continue;
    const owner = shapes.find((shape) => shape.semanticId === text.ownerId);
    if (owner === undefined) {
      defect(`Text ${text.id} has no owning node shape.`);
    }
    if (!shapeContainsRect(owner, text.bounds, TEXT_CLEARANCE)) {
      defect(`Text ${text.id} lacks clearance inside its actual node shape.`);
    }
  }
  for (let left = 0; left < texts.length; left += 1) {
    for (let right = left + 1; right < texts.length; right += 1) {
      const leftText = texts[left];
      const rightText = texts[right];
      if (
        leftText !== undefined && rightText !== undefined &&
        leftText.ownerId !== rightText.ownerId &&
        diagramRectsOverlap(leftText.bounds, rightText.bounds, TEXT_CLEARANCE)
      ) {
        defect(`Text ${leftText.id} collides with ${rightText.id}.`);
      }
    }
  }
  for (const connector of connectors) {
    if (connector.points.length < 2 || connector.lineWidth <= 0) {
      defect(`Connector ${connector.semanticId} has incomplete body geometry.`);
    }
    const source = shapes.find((shape) =>
      shape.semanticId === connector.sourceId
    );
    const target = shapes.find((shape) =>
      shape.semanticId === connector.targetId
    );
    if (source === undefined || target === undefined) {
      defect(`Connector ${connector.semanticId} has no scene endpoint shape.`);
    }
    const first = connector.points[0];
    const last = connector.points.at(-1);
    if (
      first === undefined || last === undefined ||
      !pointOnShapeBoundary(first, source)
    ) {
      defect(
        `Connector ${connector.semanticId} is detached from its source boundary.`,
      );
    }
    if (!pointOnShapeBoundary(connector.arrowhead.tip, target)) {
      defect(
        `Connector ${connector.semanticId} is detached from its target boundary.`,
      );
    }
    const second = connector.points[1];
    if (second !== undefined && pointStrictlyInRect(second, source.bounds)) {
      defect(
        `Connector ${connector.semanticId} passes behind its source fill.`,
      );
    }
    if (pointStrictlyInRect(last, target.bounds)) {
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
      for (const shape of shapes) {
        if (shape === source || shape === target) continue;
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
      if (shape === target) continue;
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
