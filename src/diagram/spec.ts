/**
 * Common semantic facts authored by every diagram kind.
 *
 * @module
 */

/** Recursively JSON-safe data admitted by diagram specs. */
export type DiagramJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly DiagramJsonValue[]
  | { readonly [key: string]: DiagramJsonValue };

/** Accessible context and discriminant shared by every diagram spec. */
export interface DiagramCommonSpec {
  /** Generated built-in kind identity. */
  readonly kind: string;
  /** Short accessible name for the informative image. */
  readonly title: string;
  /** Concise accessible explanation of what the diagram communicates. */
  readonly summary: string;
}
