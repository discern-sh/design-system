/** Deterministic, accessible, standalone SVG projection for diagram specs. */

import { escapeXml } from "../internal/escape.ts";
import { assembleSvgThemeStyle, renderSvgDocument } from "../internal/svg.ts";
import { formatDiagramAltText } from "./accessibility.ts";
import { prepareDiagram } from "../generated/diagram-dispatch.ts";
import type { DiagramSpec } from "../generated/diagram-spec.ts";
import {
  type DiagramPaletteVariant,
  resolveDiagramFontStack,
  resolveDiagramPalette,
} from "./palette.ts";
import {
  DIAGRAM_CONNECTOR_STYLE_BUNDLES,
  DIAGRAM_GUIDE_STYLE_BUNDLES,
  DIAGRAM_LINE_TREATMENTS,
  DIAGRAM_NODE_STYLE_BUNDLES,
  DIAGRAM_REGION_STYLE_BUNDLES,
} from "./roles.ts";
import type {
  DiagramConnector,
  DiagramConnectorStyleRole,
  DiagramGuide,
  DiagramNodeStyleRole,
  DiagramRegion,
  DiagramScene,
  DiagramSceneElement,
  DiagramShape,
  DiagramText,
} from "./scene.ts";
import {
  diagramSvgInsetRect,
  type DiagramSvgRectGeometry,
  diagramSvgShapeGeometry,
  diagramSvgTextAnchorX,
  formatDiagramSvgNumber,
  formatDiagramSvgPoints,
} from "./svg-geometry.ts";

/** Standalone palette posture embedded in a rendered diagram SVG. */
export type DiagramSvgTheme = DiagramPaletteVariant | "adaptive";

/** Explicit deterministic options for {@linkcode renderDiagramSvg}. */
export interface RenderDiagramSvgOptions {
  /** Embedded palette; adaptive uses light as fallback and a dark media rule. */
  readonly theme?: DiagramSvgTheme;
}

/** Complete standalone SVG document returned by {@linkcode renderDiagramSvg}. */
export type DiagramSvgDocument = string;

function nodeRule(
  role: DiagramNodeStyleRole,
  palette: ReturnType<typeof resolveDiagramPalette>,
): string {
  const bundle = DIAGRAM_NODE_STYLE_BUNDLES[role];
  return `  .discern-diagram__node--${role} { fill: ${
    palette[bundle.surface]
  }; stroke: ${palette[bundle.border]}; }`;
}

function connectorRules(
  role: DiagramConnectorStyleRole,
  palette: ReturnType<typeof resolveDiagramPalette>,
): readonly string[] {
  const bundle = DIAGRAM_CONNECTOR_STYLE_BUNDLES[role];
  const dashArray = DIAGRAM_LINE_TREATMENTS[bundle.treatment];
  const dash = dashArray === "" ? "" : ` stroke-dasharray: ${dashArray};`;
  return [
    `  .discern-diagram__connector--${role} { stroke: ${
      palette[bundle.stroke]
    };${dash} }`,
    `  .discern-diagram__arrowhead--${role} { fill: ${
      palette[bundle.marker]
    }; }`,
  ];
}

function paletteRules(
  variant: DiagramPaletteVariant,
  includeRegion: boolean,
  includeGuide: boolean,
): readonly string[] {
  const palette = resolveDiagramPalette(variant);
  const region = DIAGRAM_REGION_STYLE_BUNDLES.boundary;
  const solidGuide = DIAGRAM_GUIDE_STYLE_BUNDLES.solid;
  return [
    `  .discern-diagram__canvas { fill: ${palette.canvas}; }`,
    ...Object.keys(DIAGRAM_NODE_STYLE_BUNDLES).map((role) =>
      nodeRule(role as DiagramNodeStyleRole, palette)
    ),
    `  .discern-diagram__node-cue { fill: none; }`,
    `  .discern-diagram__text--node-text { fill: ${palette["node-text"]}; }`,
    `  .discern-diagram__text--quiet-annotation, .discern-diagram__text--connector-label { fill: ${
      palette["quiet-annotation"]
    }; }`,
    ...(includeRegion
      ? [
        `  .discern-diagram__region { fill: ${
          palette[region.surface]
        }; fill-opacity: 0.42; stroke: ${palette[region.border]}; }`,
      ]
      : []),
    ...(includeGuide
      ? [`  .discern-diagram__guide { stroke: ${palette[solidGuide.stroke]}; }`]
      : []),
    ...Object.keys(DIAGRAM_CONNECTOR_STYLE_BUNDLES).flatMap((role) =>
      connectorRules(role as DiagramConnectorStyleRole, palette)
    ),
  ];
}

function standaloneStyle(
  theme: DiagramSvgTheme,
  includeRegion: boolean,
  includeGuide: boolean,
): string {
  const common = [
    "  .discern-diagram { display: block; background: transparent; shape-rendering: geometricPrecision; text-rendering: optimizeLegibility; }",
    `  .discern-diagram__text { font-family: ${
      resolveDiagramFontStack("interface")
    }; }`,
    `  .discern-diagram__text--quiet-annotation { font-family: ${
      resolveDiagramFontStack("mono")
    }; }`,
    "  .discern-diagram__node, .discern-diagram__node-cue { stroke-width: 2; vector-effect: non-scaling-stroke; }",
    ...(includeRegion
      ? [
        `  .discern-diagram__region { vector-effect: non-scaling-stroke; stroke-dasharray: ${
          DIAGRAM_LINE_TREATMENTS[
            DIAGRAM_REGION_STYLE_BUNDLES.boundary.treatment
          ]
        }; }`,
      ]
      : []),
    ...(includeGuide
      ? [
        "  .discern-diagram__guide { fill: none; stroke-linecap: round; vector-effect: non-scaling-stroke; }",
        `  .discern-diagram__guide--dashed { stroke-dasharray: ${
          DIAGRAM_LINE_TREATMENTS[
            DIAGRAM_GUIDE_STYLE_BUNDLES.dashed.treatment
          ]
        }; }`,
      ]
      : []),
    "  .discern-diagram__connector { fill: none; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }",
  ];
  return assembleSvgThemeStyle({
    theme,
    common,
    variant: (variant) => paletteRules(variant, includeRegion, includeGuide),
  });
}

function rectMarkup(
  rect: DiagramSvgRectGeometry,
  className: string,
  indent: string,
): string {
  return `${indent}<rect class="${className}" x="${
    formatDiagramSvgNumber(rect.x)
  }" y="${formatDiagramSvgNumber(rect.y)}" width="${
    formatDiagramSvgNumber(rect.width)
  }" height="${formatDiagramSvgNumber(rect.height)}" rx="${
    formatDiagramSvgNumber(rect.radius)
  }" />`;
}

function shapeMarkup(shape: DiagramShape, indent: string): readonly string[] {
  const geometry = diagramSvgShapeGeometry(shape);
  const className =
    `discern-diagram__node discern-diagram__node--${shape.style}`;
  if (geometry.kind === "polygon") {
    return [
      `${indent}<polygon class="${className}" points="${
        formatDiagramSvgPoints(geometry.points)
      }" />`,
    ];
  }
  const lines = [rectMarkup(geometry, className, indent)];
  if (shape.style === "end") {
    lines.push(rectMarkup(
      diagramSvgInsetRect(geometry),
      `discern-diagram__node-cue discern-diagram__node--${shape.style}`,
      indent,
    ));
  }
  return lines;
}

function textMarkup(text: DiagramText, indent: string): readonly string[] {
  const role = text.role;
  const children = text.lines.map((line) =>
    `<tspan x="${formatDiagramSvgNumber(diagramSvgTextAnchorX(line))}" y="${
      formatDiagramSvgNumber(line.baseline)
    }">${escapeXml(line.text)}</tspan>`
  ).join("");
  return [
    `${indent}<text class="discern-diagram__text discern-diagram__text--${role}" data-discern-diagram-owner="${
      escapeXml(text.ownerId)
    }" font-size="${
      formatDiagramSvgNumber(text.fontSize)
    }" text-anchor="middle">${children}</text>`,
  ];
}

function connectorMarkup(
  connector: DiagramConnector,
  indent: string,
): readonly string[] {
  return [
    `${indent}<g class="discern-diagram__relationship" data-discern-diagram-relationship="${
      escapeXml(connector.semanticId)
    }">`,
    `${indent}  <polyline class="discern-diagram__connector discern-diagram__connector--${connector.style}" points="${
      formatDiagramSvgPoints(connector.points)
    }" stroke-width="${formatDiagramSvgNumber(connector.lineWidth)}" />`,
    `${indent}  <polygon class="discern-diagram__arrowhead discern-diagram__arrowhead--${connector.style}" points="${
      formatDiagramSvgPoints([
        connector.arrowhead.tip,
        connector.arrowhead.left,
        connector.arrowhead.right,
      ])
    }" />`,
    `${indent}</g>`,
  ];
}

function regionMarkup(
  region: DiagramRegion,
  indent: string,
): readonly string[] {
  return [
    `${indent}<rect class="discern-diagram__region discern-diagram__region--${region.style}" x="${
      formatDiagramSvgNumber(region.bounds.x)
    }" y="${formatDiagramSvgNumber(region.bounds.y)}" width="${
      formatDiagramSvgNumber(region.bounds.width)
    }" height="${formatDiagramSvgNumber(region.bounds.height)}" rx="${
      formatDiagramSvgNumber(region.radius)
    }" stroke-width="${formatDiagramSvgNumber(region.lineWidth)}" />`,
  ];
}

function guideMarkup(guide: DiagramGuide, indent: string): readonly string[] {
  return [
    `${indent}<polyline class="discern-diagram__guide discern-diagram__guide--${guide.style}" data-discern-diagram-guide="${
      escapeXml(guide.semanticId)
    }" points="${formatDiagramSvgPoints(guide.points)}" stroke-width="${
      formatDiagramSvgNumber(guide.lineWidth)
    }" />`,
  ];
}

function elementMarkup(
  element: DiagramSceneElement,
  indent: string,
): readonly string[] {
  if (element.kind === "shape") return shapeMarkup(element, indent);
  if (element.kind === "text") return textMarkup(element, indent);
  if (element.kind === "region") return regionMarkup(element, indent);
  if (element.kind === "guide") return guideMarkup(element, indent);
  return connectorMarkup(element, indent);
}

function sceneMarkup(scene: DiagramScene): readonly string[] {
  const groups = new Map(scene.groups.map((group) => [group.id, group]));
  const elements = new Map(
    scene.elements.map((element) => [element.id, element]),
  );
  const renderReference = (id: string, indent: string): readonly string[] => {
    const element = elements.get(id);
    if (element !== undefined) return elementMarkup(element, indent);
    const group = groups.get(id);
    if (group === undefined) {
      throw new TypeError(`Conformant diagram scene has no member ${id}`);
    }
    return [
      `${indent}<g class="discern-diagram__group" data-discern-diagram-group="${
        escapeXml(group.id)
      }">`,
      ...group.children.flatMap((child) =>
        renderReference(child, `${indent}  `)
      ),
      `${indent}</g>`,
    ];
  };
  return scene.root.flatMap((id) => renderReference(id, "  "));
}

/**
 * Validate and lay out one spec, then serialize a byte-stable portable SVG.
 * The document performs no I/O and contains no script, links, external
 * references, caller markup, or environment-derived values.
 */
export function renderDiagramSvg(
  spec: DiagramSpec,
  options: RenderDiagramSvgOptions = {},
): DiagramSvgDocument {
  const { validated, scene, description: rawDescription } = prepareDiagram(
    spec,
  );
  const description = rawDescription.trimEnd();
  const altText = formatDiagramAltText(validated);
  const { bounds } = scene.canvas;
  const width = formatDiagramSvgNumber(bounds.width);
  const height = formatDiagramSvgNumber(bounds.height);
  const theme = options.theme ?? "adaptive";
  const allowedThemes: readonly DiagramSvgTheme[] = [
    "light",
    "dark",
    "adaptive",
  ];
  if (!allowedThemes.includes(theme)) {
    throw new TypeError(
      `Diagram SVG theme must be light, dark, or adaptive; received ${
        String(theme)
      }`,
    );
  }
  const style = standaloneStyle(
    theme,
    scene.elements.some((element) => element.kind === "region"),
    scene.elements.some((element) => element.kind === "guide"),
  );
  return renderSvgDocument({
    className: "discern-diagram discern-diagram--standalone",
    bounds,
    ariaLabel: altText,
    title: validated.title,
    description,
    style,
    body: [
      `  <rect class="discern-diagram__canvas" x="${
        formatDiagramSvgNumber(bounds.x)
      }" y="${
        formatDiagramSvgNumber(bounds.y)
      }" width="${width}" height="${height}" />`,
      ...sceneMarkup(scene),
    ],
    subject: "Diagram",
  });
}
