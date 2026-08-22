/**
 * Neutral semantic diagram contracts, generated kind set, and projections.
 *
 * This module remains an internal wave-one seam until the public vertical slice
 * can publish SVG, React, and terminal behavior atomically.
 *
 * @module
 */

export { diagramAltText } from "./accessibility.ts";
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
export type {
  DiagramBudgetDefinition,
  DiagramKindCliRegistryEntry,
  DiagramKindMeta,
  DiagramKindRegistryEntry,
} from "./kind-meta.ts";
export type {
  DiagramCanvas,
  DiagramConnector,
  DiagramConnectorStyleRole,
  DiagramPaintRole,
  DiagramPoint,
  DiagramRect,
  DiagramScene,
  DiagramSceneElement,
  DiagramSceneGroup,
  DiagramShape,
  DiagramShapeKind,
  DiagramText,
} from "./scene.ts";
export type { DiagramSpec } from "../generated/diagram-spec.ts";
export {
  describeDiagram,
  layoutDiagram,
  validateDiagram,
} from "../generated/diagram-dispatch.ts";
export { diagramKindRegistry } from "../generated/diagram-registry.ts";
export { diagramKindCliRegistry } from "../generated/diagram-cli-registry.ts";
export * from "../generated/diagram-exports.ts";
