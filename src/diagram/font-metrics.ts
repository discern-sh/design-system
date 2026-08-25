/**
 * Deterministic conservative text measurement for diagram layout.
 *
 * The measurement implementation is the shared internal authority in
 * `src/internal/font-metrics.ts`; this facade binds the diagram vocabulary so
 * every existing diagram-side name keeps resolving here.
 *
 * @module
 */

import {
  auditSceneFontMetricAssets,
  type SceneFontMetricAsset,
} from "../internal/font-metrics.ts";

export {
  measureSceneText as measureDiagramText,
  SCENE_FONT_METRICS as DIAGRAM_FONT_METRICS,
  sceneGraphemeCount as diagramGraphemeCount,
  sceneGraphemes as diagramGraphemes,
  wrapSceneText as wrapDiagramText,
} from "../internal/font-metrics.ts";
export type {
  SceneFontMetricAsset as DiagramFontMetricAsset,
  SceneFontMetricAuthority as DiagramFontMetricAuthority,
  SceneFontRole as DiagramFontRole,
  SceneMeasuredLine as DiagramMeasuredLine,
} from "../internal/font-metrics.ts";

/** Verify that every committed measurement still names its calibrated bytes. */
export async function auditDiagramFontMetricAssets(
  assets: readonly SceneFontMetricAsset[],
): Promise<readonly string[]> {
  return await auditSceneFontMetricAssets(assets, "diagram");
}
