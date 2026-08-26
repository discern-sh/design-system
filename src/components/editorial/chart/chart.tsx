import { forwardRef } from "react";
import type { ReactElement } from "react";
import { formatChartAltText } from "../../../chart/accessibility.ts";
import { chartPaintStrokeDasharray } from "../../../chart/cues.ts";
import type {
  ChartAreaFill,
  ChartAxisLine,
  ChartDataPath,
  ChartDataPoints,
  ChartGridLine,
  ChartMark,
  ChartReferenceLine,
  ChartSceneElement,
  ChartTickLabel,
} from "../../../chart/scene.ts";
import {
  formatChartSvgNumber,
  formatChartSvgPoints,
} from "../../../chart/svg-geometry.ts";
import { prepareChart } from "../../../generated/chart-dispatch.ts";
import type { ChartSpec } from "../../../generated/chart-spec.ts";
import { classNames } from "../../class-names.ts";
import type { DiscernComponent } from "../../component-type.ts";

/** Safety-preserving props for the {@linkcode Chart} component. */
export interface ChartProps {
  /** Authored semantic data validated by the neutral chart authority. */
  readonly spec: ChartSpec;
  /** Optional consumer class without access to structural SVG attributes. */
  readonly className?: string;
  /** Optional document identity for the outer SVG only. */
  readonly id?: string;
}

function renderMark(mark: ChartMark): ReactElement {
  return (
    <rect
      key={mark.id}
      className={`discern-chart__mark discern-chart__mark--${mark.paint}`}
      data-discern-chart-series={mark.seriesId}
      data-discern-chart-category={mark.categoryId}
      x={formatChartSvgNumber(mark.bounds.x)}
      y={formatChartSvgNumber(mark.bounds.y)}
      width={formatChartSvgNumber(mark.bounds.width)}
      height={formatChartSvgNumber(mark.bounds.height)}
      strokeDasharray={chartPaintStrokeDasharray(mark.paint)}
    />
  );
}

function renderLine(
  line: ChartAxisLine | ChartGridLine | ChartReferenceLine,
  className: string,
): ReactElement {
  return (
    <line
      key={line.id}
      className={className}
      x1={formatChartSvgNumber(line.start.x)}
      y1={formatChartSvgNumber(line.start.y)}
      x2={formatChartSvgNumber(line.end.x)}
      y2={formatChartSvgNumber(line.end.y)}
      strokeWidth={formatChartSvgNumber(line.lineWidth)}
    />
  );
}

function renderPath(path: ChartDataPath): ReactElement {
  return (
    <polyline
      key={path.id}
      className={`discern-chart__path discern-chart__path--${path.paint}`}
      data-discern-chart-series={path.seriesId}
      points={formatChartSvgPoints(path.points)}
      strokeWidth={formatChartSvgNumber(path.lineWidth)}
      strokeDasharray={chartPaintStrokeDasharray(path.paint)}
    />
  );
}

function renderPointMarker(
  points: ChartDataPoints,
  point: { readonly x: number; readonly y: number },
  key: string,
): ReactElement {
  const radius = points.radius;
  if (points.marker === "square") {
    const side = radius * Math.SQRT2;
    return (
      <rect
        key={key}
        x={formatChartSvgNumber(point.x - side / 2)}
        y={formatChartSvgNumber(point.y - side / 2)}
        width={formatChartSvgNumber(side)}
        height={formatChartSvgNumber(side)}
      />
    );
  }
  if (points.marker === "triangle") {
    return (
      <polygon
        key={key}
        points={formatChartSvgPoints([
          { x: point.x, y: point.y - radius },
          { x: point.x + radius, y: point.y + radius },
          { x: point.x - radius, y: point.y + radius },
        ])}
      />
    );
  }
  return (
    <circle
      key={key}
      cx={formatChartSvgNumber(point.x)}
      cy={formatChartSvgNumber(point.y)}
      r={formatChartSvgNumber(points.radius)}
    />
  );
}

function renderPoints(points: ChartDataPoints): ReactElement {
  return (
    <g
      key={points.id}
      className={`discern-chart__points discern-chart__points--${points.paint}`}
      data-discern-chart-series={points.seriesId}
      strokeDasharray={chartPaintStrokeDasharray(points.paint)}
    >
      {points.points.map((point, index) =>
        renderPointMarker(points, point, `${points.id}-${index}`)
      )}
    </g>
  );
}

function renderArea(area: ChartAreaFill): ReactElement {
  return (
    <polygon
      key={area.id}
      className={`discern-chart__area discern-chart__area--${area.paint}`}
      data-discern-chart-series={area.seriesId}
      points={formatChartSvgPoints(area.points)}
      strokeDasharray={chartPaintStrokeDasharray(area.paint)}
    />
  );
}

function renderLabel(label: ChartTickLabel): ReactElement {
  const fontClass = label.fontRole === "mono"
    ? " discern-chart__label--mono"
    : "";
  return (
    <text
      key={label.id}
      className={`discern-chart__label discern-chart__label--${label.role}${fontClass}`}
      x={formatChartSvgNumber(label.x)}
      y={formatChartSvgNumber(label.baseline)}
      fontSize={formatChartSvgNumber(label.fontSize)}
      textAnchor={label.anchor}
    >
      {label.text}
    </text>
  );
}

function renderElement(element: ChartSceneElement): ReactElement {
  switch (element.kind) {
    case "mark":
      return renderMark(element);
    case "data-path":
      return renderPath(element);
    case "data-points":
      return renderPoints(element);
    case "area":
      return renderArea(element);
    case "axis-line":
      return renderLine(element, "discern-chart__axis");
    case "grid-line":
      return renderLine(element, "discern-chart__grid");
    case "reference-line":
      return renderLine(element, "discern-chart__reference");
    case "tick-label":
      return renderLabel(element);
  }
}

/**
 * Horizontally scrollable viewport containing the token-themed semantic SVG
 * projection of one authored chart spec. The forwarded ref, consumer id,
 * and consumer class name address the SVG rather than the viewport wrapper.
 * Visible figure title, caption, source, and legend remain the surrounding
 * document's responsibility, commonly through `DataFigure` with the
 * spec-derived series legend.
 */
export const Chart: DiscernComponent<SVGSVGElement, ChartProps> = forwardRef<
  SVGSVGElement,
  ChartProps
>(function Chart({ spec, className, id }, ref) {
  const { validated, scene, description } = prepareChart(spec);
  const alternative = formatChartAltText(validated);
  const { bounds } = scene.canvas;
  const width = formatChartSvgNumber(bounds.width);
  const height = formatChartSvgNumber(bounds.height);

  return (
    <div
      className="discern-chart__viewport"
      role="group"
      aria-label={`Scrollable chart viewport: ${validated.title}`}
      tabIndex={0}
    >
      <svg
        ref={ref}
        id={id}
        className={classNames("discern-chart", className)}
        data-discern-chart-kind={validated.kind}
        viewBox={`${formatChartSvgNumber(bounds.x)} ${
          formatChartSvgNumber(bounds.y)
        } ${width} ${height}`}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={alternative}
        aria-description={description.trimEnd()}
        focusable="false"
      >
        <title>{validated.title}</title>
        <desc>{description.trimEnd()}</desc>
        <rect
          className="discern-chart__canvas"
          x={formatChartSvgNumber(bounds.x)}
          y={formatChartSvgNumber(bounds.y)}
          width={width}
          height={height}
        />
        {scene.elements.map(renderElement)}
      </svg>
    </div>
  );
});
