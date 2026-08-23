/** Public supported-kind Metadata without generated fixtures or dispatch. */

import {
  diagramKindAuthorGuide as generatedDiagramKindAuthorGuide,
  diagramKindMetadata as generatedDiagramKindMetadata,
} from "../generated/diagram-metadata.ts";
import type { DiagramKindMeta } from "./kind-meta.ts";

/** Authored Metadata for every built-in diagram kind, in canonical order. */
export const diagramKindMetadata: readonly DiagramKindMeta[] = Object.freeze(
  [...generatedDiagramKindMetadata],
);

/** Markdown author guidance generated from the same built-in kind Metadata. */
export const diagramKindAuthorGuide: string = generatedDiagramKindAuthorGuide;
