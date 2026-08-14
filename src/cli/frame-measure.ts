/**
 * Default terminal frame width derived from the authored measure Token.
 * Renderers with a bounded default width (form frames, Toast, Meter, and the
 * interactive activity and sequential-form paints) resolve it here so "how
 * wide is a readable frame" has exactly one authority: `--discern-measure`
 * in tokens.ts. Deliberately absent from the public `./cli` export surface;
 * callers choose their own width through each renderer's `width` prop.
 *
 * @module
 */

import { designTokens } from "../tokens/tokens.ts";
import type { TerminalCapabilities } from "./capabilities.ts";

function measureCells(): number {
  const token = designTokens.find((candidate) =>
    candidate.name === "--discern-measure"
  );
  const match = token === undefined
    ? null
    : /^(\d+)ch$/u.exec(token.value.trim());
  const cells = match?.[1] === undefined ? Number.NaN : Number(match[1]);
  if (!Number.isSafeInteger(cells) || cells < 8) {
    throw new TypeError(
      "--discern-measure must be an authored token of at least 8ch to bound terminal frames",
    );
  }
  return cells;
}

/** Character cells in the authored readable measure. */
export const TERMINAL_FRAME_MEASURE = measureCells();

/** Default frame width: the authored measure, clamped to the terminal. */
export function defaultTerminalFrameWidth(
  capabilities: TerminalCapabilities,
): number {
  return Math.min(TERMINAL_FRAME_MEASURE, capabilities.columns);
}
