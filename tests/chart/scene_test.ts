import { assert, assertThrows } from "@std/assert";
import { measureSceneText } from "../../src/internal/font-metrics.ts";
import { conformChartScene } from "../../src/chart/conformance.ts";
import { ChartConformanceError } from "../../src/chart/errors.ts";
import {
  chartPointBounds,
  chartRectUnion,
  roundChartNumber,
} from "../../src/chart/geometry.ts";
import type {
  ChartAxisLine,
  ChartGridLine,
  ChartMark,
  ChartPoint,
  ChartRect,
  ChartScene,
  ChartSceneElement,
  ChartSeriesPaintRole,
  ChartTickLabel,
} from "../../src/chart/scene.ts";

const PLOT: ChartRect = { x: 60, y: 24, width: 120, height: 96 };

function mark(
  id: string,
  bounds: ChartRect,
  paint: ChartSeriesPaintRole = "series-1",
): ChartMark {
  return {
    kind: "mark",
    id,
    seriesId: "s1",
    categoryId: id,
    paint,
    bounds,
  };
}

function axisLine(
  id: string,
  start: ChartPoint,
  end: ChartPoint,
): ChartAxisLine {
  return {
    kind: "axis-line",
    id,
    axis: "category",
    lineWidth: 1.5,
    start,
    end,
    bounds: chartPointBounds([start, end], 0.75),
  };
}

function gridLine(
  id: string,
  start: ChartPoint,
  end: ChartPoint,
): ChartGridLine {
  return {
    kind: "grid-line",
    id,
    lineWidth: 1,
    start,
    end,
    bounds: chartPointBounds([start, end], 0.5),
  };
}

function tickLabel(options: {
  readonly id: string;
  readonly text: string;
  readonly anchor: ChartTickLabel["anchor"];
  readonly x: number;
  readonly baseline: number;
  readonly axis?: ChartTickLabel["axis"];
  readonly fontRole?: ChartTickLabel["fontRole"];
}): ChartTickLabel {
  const fontRole = options.fontRole ?? "mono";
  const width = measureSceneText(options.text, 13, fontRole);
  const left = options.anchor === "start"
    ? options.x
    : options.anchor === "middle"
    ? options.x - width / 2
    : options.x - width;
  return {
    kind: "tick-label",
    id: options.id,
    axis: options.axis ?? "value",
    role: "axis-label",
    text: options.text,
    anchor: options.anchor,
    x: options.x,
    baseline: options.baseline,
    fontRole,
    fontSize: 13,
    lineHeight: 17,
    width,
    bounds: {
      x: roundChartNumber(left),
      y: roundChartNumber(options.baseline - 13),
      width,
      height: 17,
    },
  };
}

function buildScene(elements: readonly ChartSceneElement[]): ChartScene {
  const content = chartRectUnion(elements.map(({ bounds }) => bounds));
  return {
    kind: "chart-scene",
    sourceKind: "bar",
    canvas: {
      bounds: {
        x: roundChartNumber(content.x - 24),
        y: roundChartNumber(content.y - 24),
        width: roundChartNumber(content.width + 48),
        height: roundChartNumber(content.height + 48),
      },
      role: "canvas",
      padding: 24,
    },
    plot: PLOT,
    elements,
  };
}

function validElements(): ChartSceneElement[] {
  return [
    mark("alpha", { x: 70, y: 60, width: 30, height: 60 }),
    mark("beta", { x: 130, y: 84, width: 30, height: 36 }, "series-2"),
    axisLine("baseline", { x: 60, y: 120 }, { x: 180, y: 120 }),
    tickLabel({
      id: "value-0",
      text: "0",
      anchor: "end",
      x: 52,
      baseline: 126,
    }),
    tickLabel({
      id: "value-50",
      text: "50",
      anchor: "end",
      x: 52,
      baseline: 30,
    }),
    tickLabel({
      id: "category-alpha",
      text: "A",
      anchor: "middle",
      x: 85,
      baseline: 138,
      axis: "category",
      fontRole: "interface",
    }),
    tickLabel({
      id: "category-beta",
      text: "B",
      anchor: "middle",
      x: 145,
      baseline: 138,
      axis: "category",
      fontRole: "interface",
    }),
  ];
}

Deno.test("a bar-shaped scene with anchored labels conforms and freezes", () => {
  const scene = conformChartScene(buildScene(validElements()));
  assert(Object.isFrozen(scene));
  assert(Object.isFrozen(scene.elements));
  assert(Object.isFrozen(scene.elements[0]?.bounds));
});

Deno.test("exactly abutting stacked marks conform without a declared overlap", () => {
  const elements = validElements();
  elements.splice(
    1,
    1,
    mark("beta-low", { x: 130, y: 84, width: 30, height: 18 }, "series-2"),
    mark("beta-high", { x: 130, y: 102, width: 30, height: 18 }, "series-3"),
  );
  conformChartScene(buildScene(elements));
});

Deno.test("gridlines conform beneath marks by declaration", () => {
  const elements: ChartSceneElement[] = [
    gridLine("grid-50", { x: 60, y: 72 }, { x: 180, y: 72 }),
    ...validElements(),
  ];
  conformChartScene(buildScene(elements));
});

function rejects(
  elements: readonly ChartSceneElement[],
  expected: string,
): void {
  assertThrows(
    () => conformChartScene(buildScene(elements)),
    ChartConformanceError,
    expected,
  );
}

Deno.test("the scene grammar rejects every broken universal promise", () => {
  assertThrows(
    () => conformChartScene({ ...buildScene(validElements()), elements: [] }),
    ChartConformanceError,
    "must not be empty",
  );

  const escaped = validElements();
  escaped[0] = mark("alpha", { x: 20, y: 60, width: 30, height: 60 });
  rejects(escaped, "escapes the plot area");

  const nonFinite = validElements();
  nonFinite[0] = mark("alpha", {
    x: Number.NaN,
    y: 60,
    width: 30,
    height: 60,
  });
  rejects(nonFinite, "must be finite");

  const duplicate = validElements();
  duplicate[1] = mark("alpha", { x: 130, y: 84, width: 30, height: 36 });
  rejects(duplicate, "Duplicate scene identity");

  const overlapping = validElements();
  overlapping[1] = mark("beta", { x: 90, y: 70, width: 30, height: 50 });
  rejects(overlapping, "overlap beyond declared stacking");

  const lateGrid: ChartSceneElement[] = [
    ...validElements(),
    gridLine("grid-late", { x: 60, y: 72 }, { x: 180, y: 72 }),
  ];
  rejects(lateGrid, "paints beneath a later layer");

  const strayGrid: ChartSceneElement[] = [
    gridLine("grid-out", { x: 40, y: 72 }, { x: 180, y: 72 }),
    ...validElements(),
  ];
  rejects(strayGrid, "escapes the plot area");

  const diagonal = validElements();
  diagonal[2] = axisLine("baseline", { x: 60, y: 120 }, { x: 180, y: 110 });
  rejects(diagonal, "exactly horizontal or vertical");
});

Deno.test("label honesty and clearance are proven, not trusted", () => {
  const staleWidth = validElements();
  const label = staleWidth[3] as ChartTickLabel;
  staleWidth[3] = { ...label, width: label.width + 5 };
  rejects(staleWidth, "stale measured width");

  const movedBounds = validElements();
  const anchored = movedBounds[3] as ChartTickLabel;
  movedBounds[3] = {
    ...anchored,
    bounds: { ...anchored.bounds, x: anchored.bounds.x + 6 },
  };
  rejects(movedBounds, "disagree with its anchor");

  const colliding = validElements();
  const first = colliding[3] as ChartTickLabel;
  colliding.push(tickLabel({
    id: "value-close",
    text: "1",
    anchor: "end",
    x: first.x,
    baseline: first.baseline + 10,
  }));
  rejects(colliding, "lack clearance");

  const ontoMark = validElements();
  ontoMark.push(tickLabel({
    id: "value-mid",
    text: "25",
    anchor: "start",
    x: 72,
    baseline: 80,
  }));
  rejects(ontoMark, "clearance from the data marks");
});

Deno.test("canvas bounds must stay tight around content and padding", () => {
  const scene = buildScene(validElements());
  const loose: ChartScene = {
    ...scene,
    canvas: {
      ...scene.canvas,
      bounds: { ...scene.canvas.bounds, width: scene.canvas.bounds.width + 40 },
    },
  };
  assertThrows(
    () => conformChartScene(loose),
    ChartConformanceError,
    "not tight around scene content",
  );
});
