import { forwardRef, Fragment, useId } from "react";
import type { ReactElement } from "react";
import { prepareDiagram } from "../../../generated/diagram-dispatch.ts";
import type { DiagramSpec } from "../../../generated/diagram-spec.ts";
import { formatDiagramAltText } from "../../../diagram/accessibility.ts";
import type {
  DiagramConnector,
  DiagramSceneElement,
  DiagramShape,
  DiagramText,
} from "../../../diagram/scene.ts";
import {
  diagramSvgInsetRect,
  diagramSvgShapeGeometry,
  diagramSvgTextAnchorX,
  formatDiagramSvgNumber,
  formatDiagramSvgPoints,
} from "../../../diagram/svg-geometry.ts";
import { classNames } from "../../class-names.ts";
import type { DiscernComponent } from "../../component-type.ts";

/** Safety-preserving props for the {@linkcode Diagram} component. */
export interface DiagramProps {
  /** Authored semantic data validated by the neutral diagram authority. */
  readonly spec: DiagramSpec;
  /** Optional consumer class without access to structural SVG attributes. */
  readonly className?: string;
  /** Optional document identity for the outer SVG only. */
  readonly id?: string;
}

function renderShape(shape: DiagramShape): ReactElement {
  const geometry = diagramSvgShapeGeometry(shape);
  const className =
    `discern-diagram__node discern-diagram__node--${shape.style}`;
  if (geometry.kind === "polygon") {
    return (
      <polygon
        key={shape.id}
        className={className}
        points={formatDiagramSvgPoints(geometry.points)}
      />
    );
  }
  const rect = (
    <rect
      className={className}
      x={formatDiagramSvgNumber(geometry.x)}
      y={formatDiagramSvgNumber(geometry.y)}
      width={formatDiagramSvgNumber(geometry.width)}
      height={formatDiagramSvgNumber(geometry.height)}
      rx={formatDiagramSvgNumber(geometry.radius)}
    />
  );
  if (shape.style !== "end") {
    return <Fragment key={shape.id}>{rect}</Fragment>;
  }
  const inset = diagramSvgInsetRect(geometry);
  return (
    <Fragment key={shape.id}>
      {rect}
      <rect
        className="discern-diagram__node-cue discern-diagram__node--end"
        x={formatDiagramSvgNumber(inset.x)}
        y={formatDiagramSvgNumber(inset.y)}
        width={formatDiagramSvgNumber(inset.width)}
        height={formatDiagramSvgNumber(inset.height)}
        rx={formatDiagramSvgNumber(inset.radius)}
      />
    </Fragment>
  );
}

function renderText(text: DiagramText): ReactElement {
  return (
    <text
      key={text.id}
      className={`discern-diagram__text discern-diagram__text--${text.role}`}
      data-discern-diagram-owner={text.ownerId}
      fontSize={formatDiagramSvgNumber(text.fontSize)}
      textAnchor="middle"
    >
      {text.lines.map((line, index) => (
        <tspan
          key={`${text.id}-${index}`}
          x={formatDiagramSvgNumber(diagramSvgTextAnchorX(line))}
          y={formatDiagramSvgNumber(line.baseline)}
        >
          {line.text}
        </tspan>
      ))}
    </text>
  );
}

function renderConnector(connector: DiagramConnector): ReactElement {
  return (
    <g
      key={connector.id}
      className="discern-diagram__relationship"
      data-discern-diagram-relationship={connector.semanticId}
    >
      <polyline
        className={`discern-diagram__connector discern-diagram__connector--${connector.style}`}
        points={formatDiagramSvgPoints(connector.points)}
        strokeWidth={formatDiagramSvgNumber(connector.lineWidth)}
      />
      <polygon
        className={`discern-diagram__arrowhead discern-diagram__arrowhead--${connector.style}`}
        points={formatDiagramSvgPoints([
          connector.arrowhead.tip,
          connector.arrowhead.left,
          connector.arrowhead.right,
        ])}
      />
    </g>
  );
}

function renderElement(element: DiagramSceneElement): ReactElement {
  if (element.kind === "shape") return renderShape(element);
  if (element.kind === "text") return renderText(element);
  return renderConnector(element);
}

/**
 * Token-themed semantic SVG projection of one authored diagram spec.
 * Visible figure title, caption, source, and legend remain the surrounding
 * document's responsibility, commonly through `DataFigure`.
 */
export const Diagram: DiscernComponent<SVGSVGElement, DiagramProps> =
  forwardRef<
    SVGSVGElement,
    DiagramProps
  >(function Diagram({ spec, className, id }, ref) {
    const descriptionId = `discern-diagram-${
      useId().replaceAll(":", "")
    }-description`;
    const { validated, scene, description } = prepareDiagram(spec);
    const groups = new Map(scene.groups.map((group) => [group.id, group]));
    const elements = new Map(
      scene.elements.map((element) => [element.id, element]),
    );
    const renderReference = (memberId: string): ReactElement => {
      const element = elements.get(memberId);
      if (element !== undefined) return renderElement(element);
      const group = groups.get(memberId);
      if (group === undefined) {
        throw new TypeError(
          `Conformant diagram scene has no member ${memberId}`,
        );
      }
      return (
        <g
          key={group.id}
          className="discern-diagram__group"
          data-discern-diagram-group={group.id}
        >
          {group.children.map(renderReference)}
        </g>
      );
    };
    const { bounds } = scene.canvas;
    const width = formatDiagramSvgNumber(bounds.width);
    const height = formatDiagramSvgNumber(bounds.height);

    return (
      <svg
        ref={ref}
        id={id}
        className={classNames("discern-diagram", className)}
        data-discern-diagram-kind={validated.kind}
        viewBox={`${formatDiagramSvgNumber(bounds.x)} ${
          formatDiagramSvgNumber(bounds.y)
        } ${width} ${height}`}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={formatDiagramAltText(validated)}
        aria-describedby={descriptionId}
        focusable="false"
      >
        <title>{validated.title}</title>
        <desc id={descriptionId}>{description.trimEnd()}</desc>
        <rect
          className="discern-diagram__canvas"
          x={formatDiagramSvgNumber(bounds.x)}
          y={formatDiagramSvgNumber(bounds.y)}
          width={width}
          height={height}
        />
        {scene.root.map(renderReference)}
      </svg>
    );
  });
