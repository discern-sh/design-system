/** Pure geometry shared by owned terminal applications and reading panes. @module */
import type { TerminalCapabilities } from "./capabilities.ts";
import { measureText, padText, truncateStyledText } from "./text.ts";

/** Fit a styled line to an exact cell measure, closing styles through the text authority. */
export function fitTerminalLine(
  value: string,
  columns: number,
  capabilities: TerminalCapabilities,
): string {
  return padText(
    measureText(value) <= columns
      ? value
      : truncateStyledText(value, columns, capabilities.unicode ? "…" : "."),
    columns,
  );
}

/** Allocate two bounded panes, or give the focused pane the complete available extent. */
export function allocateTerminalPanes(
  extent: number,
  firstMinimum: number,
  secondMinimum: number,
  focused: 0 | 1,
): readonly [number, number] {
  for (const value of [extent, firstMinimum, secondMinimum]) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new TypeError("pane extents must be positive safe integers");
    }
  }
  if (extent >= firstMinimum + secondMinimum) {
    const first = Math.max(
      firstMinimum,
      Math.min(Math.round(extent / 3), extent - secondMinimum),
    );
    return [first, extent - first];
  }
  return focused === 0 ? [extent, 0] : [0, extent];
}

/** Clamp a reading offset to the last full page, including empty documents. */
export function terminalScrollOffset(
  offset: number,
  lineCount: number,
  visibleRows: number,
): number {
  return Math.max(0, Math.min(offset, Math.max(0, lineCount - visibleRows)));
}
