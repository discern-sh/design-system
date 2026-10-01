/**
 * Optional React-free terminal adapter for raw input and value requests.
 * Typed interaction states render through the package's Component CLI renderers.
 *
 * @module
 */

export * from "./activity.ts";
export * from "./background.ts";
export * from "./basic-requests.ts";
export { TERMINAL_ANIMATION_INTERVAL_MS } from "./clock.ts";
export type { TerminalClock } from "./clock.ts";
export * from "./choice-requests.ts";
export { filterInteractionEntries } from "./choice-navigation.ts";
export * from "./discovery-requests.ts";
export * from "./errors.ts";
export * from "./editor.ts";
export * from "./io.ts";
export * from "./observation.ts";
export * from "./keys.ts";
export {
  assertInteractiveTerminal,
  HIDE_TERMINAL_CURSOR,
  SHOW_TERMINAL_CURSOR,
  withHiddenTerminalCursor,
  withRawTerminal,
} from "./lifecycle.ts";
export type {
  RawTerminalOptions,
  TerminalLifecycleOptions,
} from "./lifecycle.ts";
export * from "./markdown-browser.ts";
export {
  DEFAULT_TERMINAL_PAINT_OPTIONS,
  InlineFramePainter,
} from "./painter.ts";
export type {
  InlineFramePaintResult,
  InlineFrameRefusalReason,
  TerminalPaintOptions,
} from "./painter.ts";
export * from "./sequential-form.ts";
export {
  sequentialAutocompleteStep,
  sequentialConfirmationStep,
  sequentialSelectionsStep,
  sequentialSelectionStep,
  sequentialTextareaStep,
  sequentialTextStep,
} from "./sequential-steps.ts";
export type { SequentialRequestStepOptions } from "./sequential-steps.ts";
export * from "./signals.ts";
export { TERMINAL_STATE_REPORT_OSC } from "./state-report.ts";
export type { TerminalApplicationStateReport } from "./state-report.ts";
export * from "./textarea-request.ts";
export * from "./types.ts";

export * from "./application/mod.ts";
