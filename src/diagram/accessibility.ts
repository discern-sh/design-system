/** Shared concise accessible alternative derived from authored context. */

import { validateDiagram } from "../generated/diagram-dispatch.ts";
import type { DiagramCommonSpec } from "./spec.ts";

/** Format the shared short alternative from already validated context. */
export function formatDiagramAltText(spec: DiagramCommonSpec): string {
  return `${spec.title}: ${spec.summary}`;
}

/**
 * Derive the one canonical short alternative used for ordinary image naming.
 * Structural topology remains the authority of `describeDiagram`.
 */
export function diagramAltText(spec: unknown): string {
  const validated = validateDiagram(spec);
  return formatDiagramAltText(validated);
}
