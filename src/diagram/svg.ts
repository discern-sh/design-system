/** Deterministic, accessible, standalone SVG projection for diagram specs. */

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
  DIAGRAM_NODE_STYLE_BUNDLES,
} from "./roles.ts";
import type {
  DiagramConnector,
  DiagramConnectorStyleRole,
  DiagramNodeStyleRole,
  DiagramScene,
  DiagramSceneElement,
  DiagramShape,
  DiagramText,
} from "./scene.ts";
import {
  diagramSvgInsetRect,
  type DiagramSvgRectGeometry,
  diagramSvgShapeGeometry,
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

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

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
  const dash = bundle.treatment === "dashed" ? " stroke-dasharray: 8 6;" : "";
  return [
    `  .discern-diagram__connector--${role} { stroke: ${
      palette[bundle.stroke]
    };${dash} }`,
    `  .discern-diagram__arrowhead--${role} { fill: ${
      palette[bundle.marker]
    }; }`,
  ];
}

function paletteRules(variant: DiagramPaletteVariant): readonly string[] {
  const palette = resolveDiagramPalette(variant);
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
    ...Object.keys(DIAGRAM_CONNECTOR_STYLE_BUNDLES).flatMap((role) =>
      connectorRules(role as DiagramConnectorStyleRole, palette)
    ),
  ];
}

function standaloneStyle(theme: DiagramSvgTheme): string {
  const common = [
    "  .discern-diagram { display: block; background: transparent; shape-rendering: geometricPrecision; text-rendering: optimizeLegibility; }",
    `  .discern-diagram__text { font-family: ${
      resolveDiagramFontStack("interface")
    }; }`,
    `  .discern-diagram__text--quiet-annotation { font-family: ${
      resolveDiagramFontStack("mono")
    }; }`,
    "  .discern-diagram__node, .discern-diagram__node-cue { stroke-width: 2; vector-effect: non-scaling-stroke; }",
    "  .discern-diagram__connector { fill: none; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }",
  ];
  const light = paletteRules("light");
  if (theme !== "adaptive") {
    return [...common, ...paletteRules(theme)].join("\n");
  }
  const dark = paletteRules("dark").map((rule) => `  ${rule}`);
  return [
    ...common,
    ...light,
    "  @media (prefers-color-scheme: dark) {",
    ...dark,
    "  }",
  ].join("\n");
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
  const lines = [
    `${indent}<text class="discern-diagram__text discern-diagram__text--${role}" data-discern-diagram-owner="${
      escapeXml(text.ownerId)
    }" font-size="${formatDiagramSvgNumber(text.fontSize)}">`,
  ];
  for (const line of text.lines) {
    lines.push(
      `${indent}  <tspan x="${formatDiagramSvgNumber(line.x)}" y="${
        formatDiagramSvgNumber(line.baseline)
      }">${escapeXml(line.text)}</tspan>`,
    );
  }
  lines.push(`${indent}</text>`);
  return lines;
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

function elementMarkup(
  element: DiagramSceneElement,
  indent: string,
): readonly string[] {
  if (element.kind === "shape") return shapeMarkup(element, indent);
  if (element.kind === "text") return textMarkup(element, indent);
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
  const style = standaloneStyle(theme);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" class="discern-diagram discern-diagram--standalone" viewBox="${
      formatDiagramSvgNumber(bounds.x)
    } ${
      formatDiagramSvgNumber(bounds.y)
    } ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${
      escapeXml(altText)
    }">`,
    `  <title>${escapeXml(validated.title)}</title>`,
    `  <desc>${escapeXml(description).replaceAll("\n", "&#10;")}</desc>`,
    "  <style>",
    style,
    "  </style>",
    `  <rect class="discern-diagram__canvas" x="${
      formatDiagramSvgNumber(bounds.x)
    }" y="${
      formatDiagramSvgNumber(bounds.y)
    }" width="${width}" height="${height}" />`,
    ...sceneMarkup(scene),
    "</svg>",
    "",
  ].join("\n");
}
