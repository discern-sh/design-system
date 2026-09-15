import type { ReactNode } from "react";
import type { CodeTextRun } from "../internal/code-emphasis.ts";

/**
 * Render projected code runs as literal text and namespaced span elements.
 *
 * A run carrying neither a measured width nor an emphasis tier stays bare
 * text, so unemphasised source emits no elements at all. Shared by every
 * Component that displays source, so the emitted shape has one definition.
 */
export function renderCodeRuns(runs: readonly CodeTextRun[]): ReactNode[] {
  return runs.map((run, index) => {
    if (run.columns === undefined && run.emphasis === undefined) {
      return run.text;
    }
    return (
      <span
        key={index}
        data-discern-emphasis={run.emphasis}
        data-discern-terminal-cell={run.columns}
        style={run.columns === undefined ? undefined : {
          display: "inline-block",
          width: `${run.columns}ch`,
          textAlign: "center",
          verticalAlign: "baseline",
        }}
      >
        {run.text}
      </span>
    );
  });
}
