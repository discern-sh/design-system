/**
 * Neutral semantic diagram authoring, description, Metadata, and standalone
 * SVG projection. This graph imports neither React nor terminal modules.
 *
 * @module
 */

export { diagramAltText } from "./accessibility.ts";
export type { MarkdownDiagramResource } from "./markdown.ts";
export type {
  DiagramBudgetRemedy,
  DiagramErrorCode,
  DiagramErrorFact,
} from "./errors.ts";
export {
  DiagramBudgetError,
  DiagramConformanceError,
  DiagramValidationError,
} from "./errors.ts";
export type { DiagramBudgetDefinition, DiagramKindMeta } from "./kind-meta.ts";
export type { DiagramSpec } from "../generated/diagram-spec.ts";
export { describeDiagram } from "../generated/diagram-dispatch.ts";
export { diagramKindMetadata } from "./kinds.ts";
export type {
  DiagramSvgDocument,
  DiagramSvgTheme,
  RenderDiagramSvgOptions,
} from "./svg.ts";
export { renderDiagramSvg } from "./svg.ts";
export * from "../generated/diagram-exports.ts";
