/**
 * Framework-neutral vocabulary shared by Result summary renderers.
 *
 * @module
 */

import { componentExampleVocabulary } from "./result-summary.meta.ts";

/** Result states shared by web and CLI Result summary renderers. */
export type ResultSummaryState =
  (typeof componentExampleVocabulary)[number]["id"];

/** Canonical result-state enrollment shared by Result summary renderers. */
export const RESULT_SUMMARY_STATES: readonly ResultSummaryState[] =
  componentExampleVocabulary.map(({ id }) => id);

/** Visible labels for every canonical Result summary state. */
export const RESULT_SUMMARY_STATE_LABELS = Object.fromEntries(
  componentExampleVocabulary.map(({ id, label }) => [id, label]),
) as Readonly<Record<ResultSummaryState, string>>;
