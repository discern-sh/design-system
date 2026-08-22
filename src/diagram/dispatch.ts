/**
 * Internal callable contracts shared by generated diagram-kind dispatch.
 *
 * @module
 */

import type { DiagramKindMeta } from "./kind-meta.ts";
import type { DiagramScene } from "./scene.ts";
import type { DiagramCommonSpec } from "./spec.ts";

/** Validated semantic data owned by one built-in kind. */
export interface ValidatedDiagramSpec extends DiagramCommonSpec {
  readonly kind: string;
}

/** Complete preflight for one generated kind. */
export type DiagramKindValidator<Validated extends ValidatedDiagramSpec> = (
  spec: unknown,
) => Validated;

/** Deterministic kind layout before the universal conformance pass. */
export type DiagramKindLayout<Validated extends ValidatedDiagramSpec> = (
  spec: Validated,
) => DiagramScene;

/** Lossless kind-specific structural description. */
export type DiagramKindDescription<Validated extends ValidatedDiagramSpec> = (
  spec: Validated,
) => string;

/** Runtime surfaces required for every generated built-in kind. */
export interface DiagramKindRuntime<Validated extends ValidatedDiagramSpec> {
  readonly meta: DiagramKindMeta;
  readonly validate: DiagramKindValidator<Validated>;
  readonly layout: DiagramKindLayout<Validated>;
  readonly describe: DiagramKindDescription<Validated>;
  readonly fixtures: readonly DiagramCommonSpec[];
}
