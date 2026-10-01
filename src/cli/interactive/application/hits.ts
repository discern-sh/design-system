/**
 * Where the last frame put each clickable or scrollable thing, so mouse
 * input resolves against exactly what was on screen.
 *
 * @module
 */

import type { KeyChord } from "../../key-hints.ts";
import type { LayerControl } from "./layer-controls.ts";
import type { ListRowKey } from "./list-model.ts";

/** What a screen region stands for. */
export type ApplicationHitTarget =
  /** A list row; a click selects it, and a click on the selected row is Enter. */
  | { readonly kind: "row"; readonly listId: string; readonly key: ListRowKey }
  /** A list's viewport; the wheel moves its selection. */
  | { readonly kind: "list"; readonly listId: string }
  /** The following detail; the wheel scrolls it. */
  | { readonly kind: "detail" }
  /** A reading body; the wheel scrolls it. */
  | { readonly kind: "reading" }
  /** A key hint; a click presses its key. */
  | { readonly kind: "hint"; readonly chord: KeyChord }
  /** A header chip with an action; a click runs it. */
  | { readonly kind: "chip"; readonly index: number }
  /** Anywhere inside a layer; clicks there never reach what lies beneath. */
  | { readonly kind: "layer"; readonly layerId: string }
  /** A layer's scrolling region; the wheel scrolls it. */
  | { readonly kind: "layer-scroll"; readonly layerId: string }
  /** One control inside a layer. */
  | {
    readonly kind: "control";
    readonly layerId: string;
    readonly control: LayerControl;
  };

/** One region of one screen row, zero-based, ending before `end`. */
export interface ApplicationHit {
  readonly row: number;
  readonly start: number;
  readonly end: number;
  readonly target: ApplicationHitTarget;
}

/** The innermost target at a zero-based cell: later regions cover earlier ones. */
export function hitAt(
  hits: readonly ApplicationHit[] | undefined,
  row: number,
  column: number,
): ApplicationHitTarget | undefined {
  if (hits === undefined) return undefined;
  for (let index = hits.length - 1; index >= 0; index -= 1) {
    const hit = hits[index];
    if (
      hit !== undefined && hit.row === row && column >= hit.start &&
      column < hit.end
    ) return hit.target;
  }
  return undefined;
}

/** Move hits by a row and column offset. */
export function offsetHits(
  hits: readonly ApplicationHit[],
  rows: number,
  columns: number,
): readonly ApplicationHit[] {
  return hits.map((hit) => ({
    ...hit,
    row: hit.row + rows,
    start: hit.start + columns,
    end: hit.end + columns,
  }));
}
