/** Public collection renderer for prefix-aligned Result summaries. */

import type { TerminalCapabilities } from "./capabilities.ts";
import type { TerminalThemeVariant } from "./theme.ts";
import {
  renderResultSummaryCliWithPrefixWidth,
  type ResultSummaryCliProps,
  resultSummaryPrefixWidth,
} from "../components/workflow/result-summary/result-summary.cli.ts";
export { RESULT_SUMMARY_STATES } from "../components/workflow/result-summary/result-summary.types.ts";

/** One Result summary inside a collection-owned alignment group. */
export type ResultSummaryGroupCliItem = Omit<
  ResultSummaryCliProps,
  "theme" | "maxWidth"
>;

/** Inputs for a collection of Result summaries sharing one label column. */
export interface ResultSummaryGroupCliProps {
  readonly items: readonly ResultSummaryGroupCliItem[];
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Render mixed Result summary states with one widest visible prefix column. */
export function renderResultSummaryGroupCli(
  props: ResultSummaryGroupCliProps,
  capabilities: TerminalCapabilities,
): string {
  if (props.items.length === 0) {
    throw new TypeError("result summary group requires at least one item");
  }
  const prefixWidth = Math.max(
    ...props.items.map((item) =>
      resultSummaryPrefixWidth(item.state, capabilities)
    ),
  );
  return props.items.map((item) =>
    renderResultSummaryCliWithPrefixWidth(
      {
        ...item,
        ...(props.theme === undefined ? {} : { theme: props.theme }),
        ...(props.maxWidth === undefined ? {} : { maxWidth: props.maxWidth }),
      },
      capabilities,
      prefixWidth,
    )
  ).join("\n");
}
