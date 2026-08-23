/** React-free resource contract joining ordinary Markdown to diagram specs. */

import type { DiagramSpec } from "../generated/diagram-spec.ts";

/** Explicit relationship between an ordinary Markdown image and its spec. */
export interface MarkdownDiagramResource {
  /** Safe Markdown image source, matched after package URL normalisation. */
  readonly source: string;
  /** Typed semantic authority used by live browser and terminal projections. */
  readonly spec: DiagramSpec;
}
