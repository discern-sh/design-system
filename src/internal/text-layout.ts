/**
 * Shared measured-text layout composition for the kind families.
 *
 * Owns the neutral wrap-budget-measure-position arithmetic. The owning family
 * supplies its budget assertion and refusal through hooks, so family error
 * classes, codes, and messages stay with the family.
 *
 * @module
 */

import {
  type SceneFontRole,
  type SceneMeasuredLine,
  wrapSceneText,
} from "./font-metrics.ts";
import {
  roundToPrecision,
  SCENE_PRECISION,
  type SceneRect,
} from "./geometry.ts";

/** Conservatively wrapped text before a kind chooses its semantic position. */
export interface MeasuredSceneText {
  readonly lines: readonly SceneMeasuredLine[];
  readonly width: number;
  readonly height: number;
  readonly fontRole: SceneFontRole;
  readonly fontSize: number;
  readonly lineHeight: number;
}

/** Wrap one text fact, apply the owning family's line budget, and measure. */
export function measureSceneLayoutText(options: {
  readonly text: string;
  readonly maximumWidth: number;
  readonly fontRole: SceneFontRole;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly assertLineBudget: (lineCount: number) => void;
  readonly onUnmeasurable: () => never;
}): MeasuredSceneText {
  const lines = wrapSceneText(
    options.text,
    options.maximumWidth,
    options.fontSize,
    options.fontRole,
  );
  options.assertLineBudget(lines.length);
  const width = Math.max(...lines.map((line) => line.width));
  if (!Number.isFinite(width) || width <= 0) options.onUnmeasurable();
  return {
    lines,
    width: roundToPrecision(width, SCENE_PRECISION),
    height: roundToPrecision(
      lines.length * options.lineHeight,
      SCENE_PRECISION,
    ),
    fontRole: options.fontRole,
    fontSize: options.fontSize,
    lineHeight: options.lineHeight,
  };
}

/** One positioned line with its centred offset and text baseline. */
export interface PositionedSceneTextLine {
  readonly text: string;
  readonly x: number;
  readonly baseline: number;
  readonly width: number;
}

/** Measured block geometry placed around one stable horizontal centre. */
export interface PositionedSceneText {
  readonly bounds: SceneRect;
  readonly lines: readonly PositionedSceneTextLine[];
}

/** Centre a measured block and its lines around one stable horizontal centre. */
export function positionSceneText(options: {
  readonly measured: MeasuredSceneText;
  readonly centerX: number;
  readonly top: number;
}): PositionedSceneText {
  const bounds = {
    x: roundToPrecision(
      options.centerX - options.measured.width / 2,
      SCENE_PRECISION,
    ),
    y: roundToPrecision(options.top, SCENE_PRECISION),
    width: options.measured.width,
    height: options.measured.height,
  };
  const lines = options.measured.lines.map((line, index) => ({
    text: line.text,
    x: roundToPrecision(options.centerX - line.width / 2, SCENE_PRECISION),
    baseline: roundToPrecision(
      options.top + index * options.measured.lineHeight +
        options.measured.fontSize,
      SCENE_PRECISION,
    ),
    width: line.width,
  }));
  return { bounds, lines };
}
