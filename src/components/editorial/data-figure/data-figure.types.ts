/**
 * Framework-neutral vocabulary shared by Data figure renderers.
 *
 * @module
 */

import type { ChartSeriesPaintRole } from "../../../chart/scene.ts";

/** Semantic legend tone shared by web and CLI Data figure renderers. */
export type DataFigureLegendTone = "accent" | "ink" | "success" | "warning";

/**
 * Series-identity legend tone: one of the six fixed chart palette slots.
 * Series tones join the semantic tones additively, so existing consumers
 * of the closed {@linkcode DataFigureLegendTone} union stay untouched.
 */
export type DataFigureSeriesTone = ChartSeriesPaintRole;

/** Surface treatment shared by web and CLI Data figure renderers. */
export type DataFigureSurface = "canvas" | "sunken";
