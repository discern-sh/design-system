/** Shared concise accessible alternative derived from authored context. */

import { validateDiagram } from "../generated/diagram-dispatch.ts";

/**
 * Derive the one canonical short alternative used for ordinary image naming.
 * Structural topology remains the authority of `describeDiagram`.
 */
export function diagramAltText(spec: unknown): string {
  const validated = validateDiagram(spec);
  return `${validated.title}: ${validated.summary}`;
}
