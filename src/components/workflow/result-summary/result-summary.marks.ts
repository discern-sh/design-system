/**
 * State marks the terminal Result summary renderer leads each state with.
 * The browser renderer draws the matching Workflow marks instead.
 *
 * @module
 */

import { TERMINAL_GLYPHS } from "../../../cli/terminal-glyphs.ts";
import type { ResultSummaryState } from "./result-summary.types.ts";

/** One result-state mark with its Unicode form and printable ASCII fallback. */
export interface ResultSummaryMark {
  readonly unicode: string;
  readonly ascii: string;
}

/** The mark that leads every canonical Result summary state. */
export const RESULT_SUMMARY_STATE_MARKS = {
  passed: TERMINAL_GLYPHS.done,
  failed: TERMINAL_GLYPHS.failed,
  blocked: TERMINAL_GLYPHS.attention,
  changed: { unicode: "◇", ascii: "*" },
  declared: { unicode: "·", ascii: "." },
  unchanged: { unicode: "=", ascii: "=" },
} as const satisfies Readonly<Record<ResultSummaryState, ResultSummaryMark>>;
