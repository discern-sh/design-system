/**
 * Universal post-layout conformance for the closed chart scene vocabulary.
 *
 * @module
 */

import { measureSceneText } from "../internal/font-metrics.ts";
import {
  scenePointInRect,
  sceneRectContains,
  sceneRectsOverlap,
} from "../internal/geometry.ts";
import { ChartConformanceError } from "./errors.ts";
import {
  CHART_GEOMETRY,
  chartPointBounds,
  chartRectUnion,
  expandChartRect,
  roundChartNumber,
} from "./geometry.ts";
import {
  CHART_LAYER_ORDER,
  type ChartAxisLine,
  type ChartGridLine,
  type ChartMark,
  type ChartPoint,
  type ChartRect,
  type ChartReferenceLine,
  type ChartScene,
  chartSceneLayer,
  type ChartTickLabel,
} from "./scene.ts";

const EPSILON = 0.02;
const TEXT_CLEARANCE = CHART_GEOMETRY.text.clearance;

function defect(
  message: string,
  facts: Readonly<Record<string, string | number | boolean>> = {},
): never {
  throw new ChartConformanceError(message, facts);
}

function finite(value: number, label: string): void {
  if (!Number.isFinite(value)) defect(`${label} must be finite.`, { value });
}

function positiveRect(rect: ChartRect, label: string): void {
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

function finitePoint(point: ChartPoint, label: string): void {
  finite(point.x, `${label}.x`);
  finite(point.y, `${label}.y`);
}

function equalRect(left: ChartRect, right: ChartRect): boolean {
  return Math.abs(left.x - right.x) <= EPSILON &&
    Math.abs(left.y - right.y) <= EPSILON &&
    Math.abs(left.width - right.width) <= EPSILON &&
    Math.abs(left.height - right.height) <= EPSILON;
}

type ChartLine = ChartAxisLine | ChartGridLine | ChartReferenceLine;

function assertLine(line: ChartLine): void {
  finitePoint(line.start, `${line.kind} ${line.id} start`);
  finitePoint(line.end, `${line.kind} ${line.id} end`);
  finite(line.lineWidth, `${line.kind} ${line.id}.lineWidth`);
  if (line.lineWidth <= 0) {
    defect(`${line.kind} ${line.id} needs a positive line width.`);
  }
  const horizontal = Math.abs(line.start.y - line.end.y) <= EPSILON;
  const vertical = Math.abs(line.start.x - line.end.x) <= EPSILON;
  if (horizontal === vertical) {
    defect(
      `${line.kind} ${line.id} must run exactly horizontal or vertical.`,
    );
  }
  const length = Math.abs(
    horizontal ? line.end.x - line.start.x : line.end.y - line.start.y,
  );
  if (length <= EPSILON) {
    defect(`${line.kind} ${line.id} has no positive length.`);
  }
  const expected = chartPointBounds(
    [line.start, line.end],
    line.lineWidth / 2,
  );
  if (!equalRect(line.bounds, expected)) {
    defect(`${line.kind} ${line.id} declares stale bounds.`);
  }
}

function assertTickLabel(label: ChartTickLabel): void {
  positiveRect(label.bounds, `tick-label ${label.id}`);
  finite(label.x, `tick-label ${label.id}.x`);
  finite(label.baseline, `tick-label ${label.id}.baseline`);
  if (
    label.text === "" || label.text.includes("\n") ||
    label.fontSize <= 0 || label.lineHeight < label.fontSize
  ) {
    defect(`Tick label ${label.id} has invalid text geometry.`);
  }
  const measured = measureSceneText(
    label.text,
    label.fontSize,
    label.fontRole,
  );
  if (Math.abs(measured - label.width) > EPSILON) {
    defect(`Tick label ${label.id} declares a stale measured width.`, {
      declared: label.width,
      measured,
    });
  }
  const left = label.anchor === "start"
    ? label.x
    : label.anchor === "middle"
    ? label.x - label.width / 2
    : label.x - label.width;
  const expected: ChartRect = {
    x: roundChartNumber(left),
    y: roundChartNumber(label.baseline - label.fontSize),
    width: label.width,
    height: label.lineHeight,
  };
  if (!equalRect(label.bounds, expected)) {
    defect(`Tick label ${label.id} bounds disagree with its anchor.`, {
      anchor: label.anchor,
    });
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
 * Prove universal chart-scene promises, then recursively freeze the accepted
 * scene. Kind layout is incomplete until this authority returns.
 */
export function conformChartScene(scene: ChartScene): ChartScene {
  if (scene.kind !== "chart-scene" || scene.sourceKind === "") {
    defect("Scene identity is incomplete.");
  }
  positiveRect(scene.canvas.bounds, "canvas");
  finite(scene.canvas.padding, "canvas.padding");
  if (scene.canvas.padding < CHART_GEOMETRY.canvasPadding) {
    defect(
      `Canvas padding must be at least ${CHART_GEOMETRY.canvasPadding}.`,
      { padding: scene.canvas.padding },
    );
  }
  positiveRect(scene.plot, "plot");
  if (!sceneRectContains(scene.canvas.bounds, scene.plot)) {
    defect("Plot area escapes the canvas.");
  }
  if (scene.elements.length === 0) defect("A chart scene must not be empty.");

  const ids = new Set<string>();
  let highestLayer = 0;
  for (const element of scene.elements) {
    if (element.id === "") defect("A scene element is missing its identity.");
    if (ids.has(element.id)) defect(`Duplicate scene identity ${element.id}.`);
    ids.add(element.id);
    positiveRect(element.bounds, `${element.kind} ${element.id}`);
    if (!sceneRectContains(scene.canvas.bounds, element.bounds, -EPSILON)) {
      defect(`${element.kind} ${element.id} escapes the canvas.`);
    }
    const layer = CHART_LAYER_ORDER.indexOf(chartSceneLayer(element));
    if (layer < highestLayer) {
      defect(
        `${element.kind} ${element.id} paints beneath a later layer; scene order must follow ${
          CHART_LAYER_ORDER.join(" < ")
        }.`,
      );
    }
    highestLayer = layer;
  }

  const plotWithTolerance = expandChartRect(scene.plot, EPSILON);
  const marks: ChartMark[] = [];
  const labels: ChartTickLabel[] = [];
  const markLayerBounds: ChartRect[] = [];
  for (const element of scene.elements) {
    switch (element.kind) {
      case "mark": {
        if (!sceneRectContains(plotWithTolerance, element.bounds)) {
          defect(`Mark ${element.id} escapes the plot area.`);
        }
        marks.push(element);
        markLayerBounds.push(element.bounds);
        break;
      }
      case "data-path":
      case "area":
      case "data-points": {
        const minimum = element.kind === "area"
          ? 3
          : element.kind === "data-path"
          ? 2
          : 1;
        if (element.points.length < minimum) {
          defect(
            `${element.kind} ${element.id} needs at least ${minimum} points.`,
          );
        }
        for (const point of element.points) {
          finitePoint(point, `${element.kind} ${element.id} point`);
          if (
            point.x < plotWithTolerance.x ||
            point.x > plotWithTolerance.x + plotWithTolerance.width ||
            point.y < plotWithTolerance.y ||
            point.y > plotWithTolerance.y + plotWithTolerance.height
          ) {
            defect(`${element.kind} ${element.id} escapes the plot area.`);
          }
        }
        const expansion = element.kind === "data-path"
          ? element.lineWidth / 2
          : element.kind === "data-points"
          ? element.radius
          : 0;
        if (element.kind !== "area" && expansion <= 0) {
          defect(`${element.kind} ${element.id} needs positive stroke extent.`);
        }
        if (
          !equalRect(
            element.bounds,
            chartPointBounds(element.points, expansion),
          )
        ) {
          defect(`${element.kind} ${element.id} declares stale bounds.`);
        }
        markLayerBounds.push(element.bounds);
        break;
      }
      case "axis-line":
        assertLine(element);
        break;
      case "grid-line":
      case "reference-line": {
        assertLine(element);
        if (
          !scenePointInRect(element.start, scene.plot, EPSILON) ||
          !scenePointInRect(element.end, scene.plot, EPSILON)
        ) {
          defect(`${element.kind} ${element.id} escapes the plot area.`);
        }
        break;
      }
      case "tick-label": {
        assertTickLabel(element);
        labels.push(element);
        break;
      }
    }
  }

  for (let left = 0; left < marks.length; left += 1) {
    for (let right = left + 1; right < marks.length; right += 1) {
      const leftMark = marks[left];
      const rightMark = marks[right];
      if (
        leftMark !== undefined && rightMark !== undefined &&
        sceneRectsOverlap(leftMark.bounds, rightMark.bounds, -EPSILON)
      ) {
        defect(
          `Marks ${leftMark.id} and ${rightMark.id} overlap beyond declared stacking.`,
        );
      }
    }
  }
  for (let left = 0; left < labels.length; left += 1) {
    for (let right = left + 1; right < labels.length; right += 1) {
      const leftLabel = labels[left];
      const rightLabel = labels[right];
      if (
        leftLabel !== undefined && rightLabel !== undefined &&
        sceneRectsOverlap(leftLabel.bounds, rightLabel.bounds, TEXT_CLEARANCE)
      ) {
        defect(
          `Tick labels ${leftLabel.id} and ${rightLabel.id} lack clearance.`,
        );
      }
    }
  }
  for (const label of labels) {
    for (const bounds of markLayerBounds) {
      if (sceneRectsOverlap(label.bounds, bounds, TEXT_CLEARANCE)) {
        defect(`Tick label ${label.id} lacks clearance from the data marks.`);
      }
    }
  }

  const content = chartRectUnion(scene.elements.map(({ bounds }) => bounds));
  const expectedCanvas: ChartRect = {
    x: roundChartNumber(content.x - scene.canvas.padding),
    y: roundChartNumber(content.y - scene.canvas.padding),
    width: roundChartNumber(content.width + scene.canvas.padding * 2),
    height: roundChartNumber(content.height + scene.canvas.padding * 2),
  };
  if (!equalRect(scene.canvas.bounds, expectedCanvas)) {
    defect(
      "Canvas bounds are not tight around scene content and declared padding.",
    );
  }
  return deepFreeze(scene);
}
