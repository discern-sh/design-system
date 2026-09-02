/** Public collection renderer for prefix-aligned Result summaries. */

import type { TerminalCapabilities } from "./capabilities.ts";
import {
  type CliPresentationOptions,
  cliPresentationPassthrough,
} from "./contracts.ts";
import {
  renderResultSummaryCliWithPrefixWidth,
  type ResultSummaryCliProps,
  resultSummaryPrefixWidth,
} from "../components/workflow/result-summary/result-summary.cli.ts";
export * from "../components/workflow/result-summary/result-summary.types.ts";

/** One Result summary inside a collection-owned alignment group. */
export type ResultSummaryGroupCliItem = Omit<
  ResultSummaryCliProps,
  "maxWidth"
>;

/** Inputs for a collection of Result summaries sharing one label column. */
export interface ResultSummaryGroupCliProps extends CliPresentationOptions {
  readonly items: readonly ResultSummaryGroupCliItem[];
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
        ...cliPresentationPassthrough(props),
        ...item,
        ...(props.maxWidth === undefined ? {} : { maxWidth: props.maxWidth }),
      },
      capabilities,
      prefixWidth,
    )
  ).join("\n");
}
