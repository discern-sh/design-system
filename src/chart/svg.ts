/** Deterministic, accessible, standalone SVG projection for chart specs. */

import { escapeXml } from "../internal/escape.ts";
import { assembleSvgThemeStyle, renderSvgDocument } from "../internal/svg.ts";
import { prepareChart } from "../generated/chart-dispatch.ts";
import type { ChartSpec } from "../generated/chart-spec.ts";
import { formatChartAltText } from "./accessibility.ts";
import { chartPaintStrokeDasharray } from "./cues.ts";
import {
  type ChartPaletteVariant,
  resolveChartFontStack,
  resolveChartPalette,
} from "./palette.ts";
import type {
  ChartAreaFill,
  ChartAxisLine,
  ChartDataPath,
  ChartDataPoints,
  ChartGridLine,
  ChartMark,
  ChartMarkPaintRole,
  ChartPoint,
  ChartReferenceLine,
  ChartScene,
  ChartSceneElement,
  ChartSeriesPaintRole,
  ChartTickLabel,
} from "./scene.ts";
import { formatChartSvgNumber, formatChartSvgPoints } from "./svg-geometry.ts";

/** Standalone palette posture embedded in a rendered chart SVG. */
export type ChartSvgTheme = ChartPaletteVariant | "adaptive";

/** Explicit deterministic options for {@linkcode renderChartSvg}. */
export interface RenderChartSvgOptions {
  /** Embedded palette; adaptive uses light as fallback and a dark media rule. */
  readonly theme?: ChartSvgTheme;
}

/** Complete standalone SVG document returned by {@linkcode renderChartSvg}. */
export type ChartSvgDocument = string;

/** The series paints each data-encoding element kind actually uses. */
interface SceneInventory {
  readonly markPaints: readonly ChartMarkPaintRole[];
  readonly pathPaints: readonly ChartSeriesPaintRole[];
  readonly pointPaints: readonly ChartSeriesPaintRole[];
  readonly areaPaints: readonly ChartSeriesPaintRole[];
  readonly hasAxis: boolean;
  readonly hasGrid: boolean;
  readonly hasReference: boolean;
  readonly labelRoles: readonly ChartTickLabel["role"][];
  readonly hasMonoLabel: boolean;
  readonly hasInterfaceLabel: boolean;
}

function orderedPaints<Role extends string>(
  paints: ReadonlySet<Role>,
): readonly Role[] {
  return [...paints].toSorted();
}

function sceneInventory(scene: ChartScene): SceneInventory {
  const markPaints = new Set<ChartMarkPaintRole>();
  const pathPaints = new Set<ChartSeriesPaintRole>();
  const pointPaints = new Set<ChartSeriesPaintRole>();
  const areaPaints = new Set<ChartSeriesPaintRole>();
  const labelRoles = new Set<ChartTickLabel["role"]>();
  let hasGrid = false;
  let hasAxis = false;
  let hasReference = false;
  let hasMonoLabel = false;
  let hasInterfaceLabel = false;
  for (const element of scene.elements) {
    switch (element.kind) {
      case "mark":
        markPaints.add(element.paint);
        break;
      case "data-path":
        pathPaints.add(element.paint);
        break;
      case "data-points":
        pointPaints.add(element.paint);
        break;
      case "area":
        areaPaints.add(element.paint);
        break;
      case "grid-line":
        hasGrid = true;
        break;
      case "reference-line":
        hasReference = true;
        break;
      case "tick-label":
        labelRoles.add(element.role);
        if (element.fontRole === "mono") hasMonoLabel = true;
        else hasInterfaceLabel = true;
        break;
      case "axis-line":
        hasAxis = true;
        break;
    }
  }
  return {
    markPaints: orderedPaints(markPaints),
    pathPaints: orderedPaints(pathPaints),
    pointPaints: orderedPaints(pointPaints),
    areaPaints: orderedPaints(areaPaints),
    hasAxis,
    hasGrid,
    hasReference,
    labelRoles: [...labelRoles].toSorted(),
    hasMonoLabel,
    hasInterfaceLabel,
  };
}

function paletteRules(
  variant: ChartPaletteVariant,
  inventory: SceneInventory,
  root: string,
): readonly string[] {
  const palette = resolveChartPalette(variant);
  return [
    `  ${root} .discern-chart__canvas { fill: ${palette.canvas}; }`,
    ...inventory.markPaints.map((paint) =>
      `  ${root} .discern-chart__mark--${paint} { fill: ${
        palette[paint]
      }; stroke: ${palette.canvas}; }`
    ),
    ...inventory.pathPaints.map((paint) =>
      `  ${root} .discern-chart__path--${paint} { stroke: ${palette[paint]}; }`
    ),
    ...inventory.pointPaints.map((paint) =>
      `  ${root} .discern-chart__points--${paint} { fill: ${palette[paint]}; }`
    ),
    ...inventory.areaPaints.map((paint) =>
      `  ${root} .discern-chart__area--${paint} { fill: ${palette[paint]}; }`
    ),
    `  ${root} .discern-chart__axis { stroke: ${palette.axis}; }`,
    ...(inventory.hasGrid
      ? [`  ${root} .discern-chart__grid { stroke: ${palette.grid}; }`]
      : []),
    ...(inventory.hasReference
      ? [
        `  ${root} .discern-chart__reference { stroke: ${palette.reference}; }`,
      ]
      : []),
    ...inventory.labelRoles.map((role) =>
      `  ${root} .discern-chart__label--${role} { fill: ${palette[role]}; }`
    ),
  ];
}

function standaloneStyle(
  theme: ChartSvgTheme,
  inventory: SceneInventory,
): string {
  const root =
    `.discern-chart--standalone.discern-chart--theme-${theme}` as const;
  const select = (selector: string): string => `${root} ${selector}`;
  const forcedStrokeSelectors = [
    ...(inventory.pathPaints.length > 0
      ? [select(".discern-chart__path")]
      : []),
    ...(inventory.hasAxis ? [select(".discern-chart__axis")] : []),
    ...(inventory.hasGrid ? [select(".discern-chart__grid")] : []),
    ...(inventory.hasReference ? [select(".discern-chart__reference")] : []),
  ];
  const common = [
    `  ${root} { display: block; background: transparent; shape-rendering: geometricPrecision; text-rendering: optimizeLegibility; }`,
    ...(inventory.hasInterfaceLabel
      ? [
        `  ${select(".discern-chart__label")} { font-family: ${
          resolveChartFontStack("interface")
        }; }`,
      ]
      : []),
    ...(inventory.hasMonoLabel
      ? [
        `  ${
          select(".discern-chart__label.discern-chart__label--mono")
        } { font-family: ${resolveChartFontStack("mono")}; }`,
      ]
      : []),
    `  ${
      select(".discern-chart__axis")
    } { vector-effect: non-scaling-stroke; }`,
    ...(inventory.hasGrid
      ? [
        `  ${
          select(".discern-chart__grid")
        } { vector-effect: non-scaling-stroke; }`,
      ]
      : []),
    ...(inventory.hasReference
      ? [
        `  ${
          select(".discern-chart__reference")
        } { vector-effect: non-scaling-stroke; }`,
      ]
      : []),
    ...(inventory.markPaints.length > 0
      ? [
        `  ${
          select(".discern-chart__mark")
        } { stroke-width: 1; vector-effect: non-scaling-stroke; }`,
      ]
      : []),
    ...(inventory.pathPaints.length > 0
      ? [
        `  ${
          select(".discern-chart__path")
        } { fill: none; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }`,
      ]
      : []),
  ];
  const forcedColors = [
    "  @media (forced-colors: active) {",
    `    ${root} { forced-color-adjust: none; }`,
    `    ${select(".discern-chart__canvas")} { fill: Canvas; }`,
    ...(inventory.markPaints.length > 0 || inventory.areaPaints.length > 0
      ? [
        `    ${
          [
            ...(inventory.markPaints.length > 0
              ? [select(".discern-chart__mark")]
              : []),
            ...(inventory.areaPaints.length > 0
              ? [select(".discern-chart__area")]
              : []),
          ].join(", ")
        } { fill: Canvas; stroke: CanvasText; stroke-width: 1; vector-effect: non-scaling-stroke; }`,
      ]
      : []),
    ...(inventory.pointPaints.length > 0
      ? [
        `    ${
          select(".discern-chart__points")
        } { fill: Canvas; stroke: CanvasText; stroke-width: 1.5; vector-effect: non-scaling-stroke; }`,
      ]
      : []),
    ...(forcedStrokeSelectors.length > 0
      ? [`    ${forcedStrokeSelectors.join(", ")} { stroke: CanvasText; }`]
      : []),
    ...(inventory.labelRoles.length > 0
      ? [`    ${select(".discern-chart__label")} { fill: CanvasText; }`]
      : []),
    "  }",
  ];
  return assembleSvgThemeStyle({
    theme,
    common,
    variant: (variant) => paletteRules(variant, inventory, root),
    after: forcedColors,
  });
}

function strokeDasharrayAttribute(paint: ChartMarkPaintRole): string {
  const dasharray = chartPaintStrokeDasharray(paint);
  return dasharray === undefined ? "" : ` stroke-dasharray="${dasharray}"`;
}

function markMarkup(mark: ChartMark): string {
  return `  <rect class="discern-chart__mark discern-chart__mark--${mark.paint}"${
    strokeDasharrayAttribute(mark.paint)
  } data-discern-chart-series="${
    escapeXml(mark.seriesId)
  }" data-discern-chart-category="${escapeXml(mark.categoryId)}" x="${
    formatChartSvgNumber(mark.bounds.x)
  }" y="${formatChartSvgNumber(mark.bounds.y)}" width="${
    formatChartSvgNumber(mark.bounds.width)
  }" height="${formatChartSvgNumber(mark.bounds.height)}" />`;
}

function lineMarkup(
  line: ChartAxisLine | ChartGridLine | ChartReferenceLine,
  className: string,
): string {
  return `  <line class="${className}" x1="${
    formatChartSvgNumber(line.start.x)
  }" y1="${formatChartSvgNumber(line.start.y)}" x2="${
    formatChartSvgNumber(line.end.x)
  }" y2="${formatChartSvgNumber(line.end.y)}" stroke-width="${
    formatChartSvgNumber(line.lineWidth)
  }" />`;
}

function pathMarkup(path: ChartDataPath): string {
  return `  <polyline class="discern-chart__path discern-chart__path--${path.paint}"${
    strokeDasharrayAttribute(path.paint)
  } data-discern-chart-series="${escapeXml(path.seriesId)}" points="${
    formatChartSvgPoints(path.points)
  }" stroke-width="${formatChartSvgNumber(path.lineWidth)}" />`;
}

function pointMarkerMarkup(
  points: ChartDataPoints,
  point: ChartPoint,
): string {
  const radius = points.radius;
  if (points.marker === "square") {
    const side = radius * Math.SQRT2;
    return `    <rect x="${formatChartSvgNumber(point.x - side / 2)}" y="${
      formatChartSvgNumber(point.y - side / 2)
    }" width="${formatChartSvgNumber(side)}" height="${
      formatChartSvgNumber(side)
    }" />`;
  }
  if (points.marker === "triangle") {
    const corners: readonly ChartPoint[] = [
      { x: point.x, y: point.y - radius },
      { x: point.x + radius, y: point.y + radius },
      { x: point.x - radius, y: point.y + radius },
    ];
    return `    <polygon points="${formatChartSvgPoints(corners)}" />`;
  }
  return `    <circle cx="${formatChartSvgNumber(point.x)}" cy="${
    formatChartSvgNumber(point.y)
  }" r="${formatChartSvgNumber(radius)}" />`;
}

function pointsMarkup(points: ChartDataPoints): readonly string[] {
  return [
    `  <g class="discern-chart__points discern-chart__points--${points.paint}"${
      strokeDasharrayAttribute(points.paint)
    } data-discern-chart-series="${escapeXml(points.seriesId)}">`,
    ...points.points.map((point) => pointMarkerMarkup(points, point)),
    "  </g>",
  ];
}

function areaMarkup(area: ChartAreaFill): string {
  return `  <polygon class="discern-chart__area discern-chart__area--${area.paint}"${
    strokeDasharrayAttribute(area.paint)
  } data-discern-chart-series="${escapeXml(area.seriesId)}" points="${
    formatChartSvgPoints(area.points)
  }" />`;
}

function labelMarkup(label: ChartTickLabel): string {
  const fontClass = label.fontRole === "mono"
    ? " discern-chart__label--mono"
    : "";
  return `  <text class="discern-chart__label discern-chart__label--${label.role}${fontClass}" x="${
    formatChartSvgNumber(label.x)
  }" y="${formatChartSvgNumber(label.baseline)}" font-size="${
    formatChartSvgNumber(label.fontSize)
  }" text-anchor="${label.anchor}">${escapeXml(label.text)}</text>`;
}

function elementMarkup(element: ChartSceneElement): readonly string[] {
  switch (element.kind) {
    case "mark":
      return [markMarkup(element)];
    case "data-path":
      return [pathMarkup(element)];
    case "data-points":
      return pointsMarkup(element);
    case "area":
      return [areaMarkup(element)];
    case "axis-line":
      return [lineMarkup(element, "discern-chart__axis")];
    case "grid-line":
      return [lineMarkup(element, "discern-chart__grid")];
    case "reference-line":
      return [lineMarkup(element, "discern-chart__reference")];
    case "tick-label":
      return [labelMarkup(element)];
  }
}

/**
 * Validate and lay out one spec, then serialize a byte-stable portable SVG.
 * The document performs no I/O and contains no script, links, external
 * references, caller markup, random identifiers, or environment-derived
 * values; `light` and `dark` embed resolved Token literals, while `adaptive`
 * embeds both with a deterministic light fallback behind a
 * `prefers-color-scheme` rule.
 */
export function renderChartSvg(
  spec: ChartSpec,
  options: RenderChartSvgOptions = {},
): ChartSvgDocument {
  const { validated, scene, description: rawDescription } = prepareChart(spec);
  const description = rawDescription.trimEnd();
  const altText = formatChartAltText(validated);
  const { bounds } = scene.canvas;
  const theme = options.theme ?? "adaptive";
  const allowedThemes: readonly ChartSvgTheme[] = ["light", "dark", "adaptive"];
  if (!allowedThemes.includes(theme)) {
    throw new TypeError(
      `Chart SVG theme must be light, dark, or adaptive; received ${
        String(theme)
      }`,
    );
  }
  const style = standaloneStyle(theme, sceneInventory(scene));
  return renderSvgDocument({
    className:
      `discern-chart discern-chart--standalone discern-chart--theme-${theme}`,
    bounds,
    ariaLabel: altText,
    title: validated.title,
    description,
    style,
    body: [
      `  <rect class="discern-chart__canvas" x="${
        formatChartSvgNumber(bounds.x)
      }" y="${formatChartSvgNumber(bounds.y)}" width="${
        formatChartSvgNumber(bounds.width)
      }" height="${formatChartSvgNumber(bounds.height)}" />`,
      ...scene.elements.flatMap(elementMarkup),
    ],
    subject: "Chart",
  });
}
