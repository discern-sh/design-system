/** Shared measured-text, connector, and scene construction for diagram kinds. */

import { DiagramValidationError } from "./errors.ts";
import { type DiagramFontRole, wrapDiagramText } from "./font-metrics.ts";
import {
  DIAGRAM_GEOMETRY,
  diagramPointBounds,
  diagramRectUnion,
  roundDiagramNumber,
} from "./geometry.ts";
import type { DiagramKindMeta } from "./kind-meta.ts";
import type {
  DiagramConnector,
  DiagramConnectorStyleRole,
  DiagramGuide,
  DiagramPoint,
  DiagramRect,
  DiagramScene,
  DiagramSceneElement,
  DiagramSceneGroup,
  DiagramText,
  DiagramTextLine,
} from "./scene.ts";
import { assertDiagramKindBudget } from "./validation.ts";

/** Conservatively wrapped text before a kind chooses its semantic position. */
export interface DiagramMeasuredText {
  readonly lines: readonly { readonly text: string; readonly width: number }[];
  readonly width: number;
  readonly height: number;
  readonly fontRole: DiagramFontRole;
  readonly fontSize: number;
  readonly lineHeight: number;
}

/** Measure one text fact and apply the owning kind's wrapped-line budget. */
export function measureDiagramLayoutText(options: {
  readonly text: string;
  readonly maximumWidth: number;
  readonly fontRole: DiagramFontRole;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly meta: DiagramKindMeta;
  readonly budget: string;
  readonly path: string;
}): DiagramMeasuredText {
  const lines = wrapDiagramText(
    options.text,
    options.maximumWidth,
    options.fontSize,
    options.fontRole,
  );
  assertDiagramKindBudget(
    options.meta,
    options.budget,
    lines.length,
    options.path,
  );
  const width = Math.max(...lines.map((line) => line.width));
  if (!Number.isFinite(width) || width <= 0) {
    throw new DiagramValidationError({
      code: "diagram/layout/non-finite",
      message: `${options.path} cannot be measured as visible text.`,
      path: options.path,
      remedy: "Replace isolated marks with concise visible letters or words.",
    });
  }
  return {
    lines,
    width: roundDiagramNumber(width),
    height: roundDiagramNumber(lines.length * options.lineHeight),
    fontRole: options.fontRole,
    fontSize: options.fontSize,
    lineHeight: options.lineHeight,
  };
}

/** Place a measured text block around one stable horizontal centre. */
export function positionDiagramText(options: {
  readonly id: string;
  readonly ownerId: string;
  readonly placement: DiagramText["placement"];
  readonly role: DiagramText["role"];
  readonly measured: DiagramMeasuredText;
  readonly centerX: number;
  readonly top: number;
}): DiagramText {
  const bounds = {
    x: roundDiagramNumber(options.centerX - options.measured.width / 2),
    y: roundDiagramNumber(options.top),
    width: options.measured.width,
    height: options.measured.height,
  };
  const lines: DiagramTextLine[] = options.measured.lines.map(
    (line, index) => ({
      text: line.text,
      x: roundDiagramNumber(options.centerX - line.width / 2),
      baseline: roundDiagramNumber(
        options.top + index * options.measured.lineHeight +
          options.measured.fontSize,
      ),
      width: line.width,
    }),
  );
  return {
    kind: "text",
    id: options.id,
    ownerId: options.ownerId,
    placement: options.placement,
    role: options.role,
    fontRole: options.measured.fontRole,
    fontSize: options.measured.fontSize,
    lineHeight: options.measured.lineHeight,
    bounds,
    lines,
  };
}

/** Rounded centre point of one rectangle. */
export function diagramRectCenter(rect: DiagramRect): DiagramPoint {
  return {
    x: roundDiagramNumber(rect.x + rect.width / 2),
    y: roundDiagramNumber(rect.y + rect.height / 2),
  };
}

/** Remove repeated neighboring points and round the remaining path once. */
export function compactDiagramPoints(
  points: readonly DiagramPoint[],
): readonly DiagramPoint[] {
  const compact: DiagramPoint[] = [];
  const precisionStep = 10 ** -DIAGRAM_GEOMETRY.precision;
  for (const point of points) {
    let rounded = {
      x: roundDiagramNumber(point.x),
      y: roundDiagramNumber(point.y),
    };
    const previous = compact.at(-1);
    if (previous !== undefined) {
      rounded = {
        x: Math.abs(previous.x - rounded.x) <= precisionStep
          ? previous.x
          : rounded.x,
        y: Math.abs(previous.y - rounded.y) <= precisionStep
          ? previous.y
          : rounded.y,
      };
    }
    if (
      previous === undefined || previous.x !== rounded.x ||
      previous.y !== rounded.y
    ) compact.push(rounded);
  }
  return compact;
}

/** Construct one non-directional guide with authoritative point bounds. */
export function createDiagramGuide(options: {
  readonly id: string;
  readonly semanticId: string;
  readonly style?: DiagramGuide["style"];
  readonly lineWidth?: number;
  readonly points: readonly DiagramPoint[];
}): DiagramGuide {
  const lineWidth = options.lineWidth ?? DIAGRAM_GEOMETRY.connector.lineWidth;
  const points = compactDiagramPoints(options.points);
  return {
    kind: "guide",
    id: options.id,
    semanticId: options.semanticId,
    style: options.style ?? "solid",
    lineWidth,
    points,
    bounds: diagramPointBounds(points, lineWidth / 2),
  };
}

/** Construct a directed connector and the package-owned triangular marker. */
export function createDiagramConnector(options: {
  readonly id: string;
  readonly semanticId: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly style: DiagramConnectorStyleRole;
  readonly routing: DiagramConnector["routing"];
  readonly pathWithTip: readonly DiagramPoint[];
  readonly lineWidth?: number;
  readonly path?: string;
  readonly remedy?: string;
}): DiagramConnector {
  const path = compactDiagramPoints(options.pathWithTip);
  const tip = path.at(-1);
  const beforeTip = path.at(-2);
  const diagnosticPath = options.path ?? options.semanticId;
  const remedy = options.remedy ??
    "Reduce density or split the overview into smaller diagrams.";
  if (tip === undefined || beforeTip === undefined) {
    throw new DiagramValidationError({
      code: "diagram/layout/connector",
      message: `Relationship ${options.semanticId} has no routable span.`,
      path: diagnosticPath,
      remedy,
    });
  }
  const dx = tip.x - beforeTip.x;
  const dy = tip.y - beforeTip.y;
  const distance = Math.hypot(dx, dy);
  if (
    !Number.isFinite(distance) ||
    distance < DIAGRAM_GEOMETRY.connector.arrowLength + 1
  ) {
    throw new DiagramValidationError({
      code: "diagram/layout/connector",
      message:
        `Relationship ${options.semanticId} has insufficient arrow clearance.`,
      path: diagnosticPath,
      remedy,
    });
  }
  const unitX = dx / distance;
  const unitY = dy / distance;
  const base = {
    x: roundDiagramNumber(
      tip.x - unitX * DIAGRAM_GEOMETRY.connector.arrowLength,
    ),
    y: roundDiagramNumber(
      tip.y - unitY * DIAGRAM_GEOMETRY.connector.arrowLength,
    ),
  };
  const left = {
    x: roundDiagramNumber(
      base.x - unitY * DIAGRAM_GEOMETRY.connector.arrowHalfWidth,
    ),
    y: roundDiagramNumber(
      base.y + unitX * DIAGRAM_GEOMETRY.connector.arrowHalfWidth,
    ),
  };
  const right = {
    x: roundDiagramNumber(
      base.x + unitY * DIAGRAM_GEOMETRY.connector.arrowHalfWidth,
    ),
    y: roundDiagramNumber(
      base.y - unitX * DIAGRAM_GEOMETRY.connector.arrowHalfWidth,
    ),
  };
  const points = compactDiagramPoints([...path.slice(0, -1), base]);
  const lineWidth = options.lineWidth ?? DIAGRAM_GEOMETRY.connector.lineWidth;
  const arrowBounds = diagramPointBounds([tip, left, right]);
  return {
    kind: "connector",
    id: options.id,
    semanticId: options.semanticId,
    sourceId: options.sourceId,
    targetId: options.targetId,
    style: options.style,
    routing: options.routing,
    lineWidth,
    points,
    arrowhead: { tip, left, right, bounds: arrowBounds },
    bounds: diagramRectUnion([
      diagramPointBounds(points, lineWidth / 2),
      arrowBounds,
    ]),
  };
}

function translateRect(rect: DiagramRect, dx: number, dy: number): DiagramRect {
  return {
    x: roundDiagramNumber(rect.x + dx),
    y: roundDiagramNumber(rect.y + dy),
    width: rect.width,
    height: rect.height,
  };
}

function translatePoint(
  point: DiagramPoint,
  dx: number,
  dy: number,
): DiagramPoint {
  return {
    x: roundDiagramNumber(point.x + dx),
    y: roundDiagramNumber(point.y + dy),
  };
}

/** Translate any member of the closed scene vocabulary. */
export function translateDiagramElement(
  element: DiagramSceneElement,
  dx: number,
  dy: number,
): DiagramSceneElement {
  if (element.kind === "shape" || element.kind === "region") {
    return { ...element, bounds: translateRect(element.bounds, dx, dy) };
  }
  if (element.kind === "text") {
    return {
      ...element,
      bounds: translateRect(element.bounds, dx, dy),
      lines: element.lines.map((line) => ({
        ...line,
        x: roundDiagramNumber(line.x + dx),
        baseline: roundDiagramNumber(line.baseline + dy),
      })),
    };
  }
  if (element.kind === "guide") {
    return {
      ...element,
      bounds: translateRect(element.bounds, dx, dy),
      points: element.points.map((point) => translatePoint(point, dx, dy)),
    };
  }
  return {
    ...element,
    bounds: translateRect(element.bounds, dx, dy),
    points: element.points.map((point) => translatePoint(point, dx, dy)),
    arrowhead: {
      tip: translatePoint(element.arrowhead.tip, dx, dy),
      left: translatePoint(element.arrowhead.left, dx, dy),
      right: translatePoint(element.arrowhead.right, dx, dy),
      bounds: translateRect(element.arrowhead.bounds, dx, dy),
    },
  };
}

/** Tighten, translate, and budget a kind's ordered raw scene exactly once. */
export function createDiagramScene(options: {
  readonly sourceKind: string;
  readonly elements: readonly DiagramSceneElement[];
  readonly groups: readonly DiagramSceneGroup[];
  readonly root: readonly string[];
  readonly meta: DiagramKindMeta;
  readonly extentBudget?: string;
}): DiagramScene {
  const content = diagramRectUnion(
    options.elements.map((element) => element.bounds),
  );
  const padding = DIAGRAM_GEOMETRY.canvasPadding;
  const dx = padding - content.x;
  const dy = padding - content.y;
  const elements = options.elements.map((element) =>
    translateDiagramElement(element, dx, dy)
  );
  const canvasBounds = {
    x: 0,
    y: 0,
    width: roundDiagramNumber(content.width + padding * 2),
    height: roundDiagramNumber(content.height + padding * 2),
  };
  assertDiagramKindBudget(
    options.meta,
    options.extentBudget ?? "sceneExtent",
    Math.max(canvasBounds.width, canvasBounds.height),
    "scene.canvas",
  );
  return {
    kind: "diagram-scene",
    sourceKind: options.sourceKind,
    canvas: { bounds: canvasBounds, role: "canvas", padding },
    root: options.root,
    groups: options.groups,
    elements,
  };
}
