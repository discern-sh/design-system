/** Public supported-kind Metadata without generated fixtures or dispatch. */

import { diagramKindRegistry } from "../generated/diagram-registry.ts";
import type { DiagramKindMeta } from "./kind-meta.ts";

/** Authored Metadata for every built-in diagram kind, in canonical order. */
export const diagramKindMetadata: readonly DiagramKindMeta[] = Object.freeze(
  diagramKindRegistry.map(({ meta }) => meta),
);
