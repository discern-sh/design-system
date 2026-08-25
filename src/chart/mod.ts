/**
 * Package-private chart foundation: scaled-decimal numerics, the closed
 * number format vocabulary, and deterministic scales and ticks. No public
 * `./chart` entrypoint exists yet; the first complete Chart surface publishes
 * this graph. The chart graph never imports React, terminal modules, or
 * anything from the diagram family.
 *
 * @module
 */

export * from "./decimal.ts";
export * from "./errors.ts";
export * from "./format.ts";
export * from "./geometry.ts";
export * from "./scale.ts";
export * from "./scene.ts";
export * from "./series-palette.ts";
export * from "./ticks.ts";
