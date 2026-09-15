/**
 * Optional React-free terminal adapter for raw input and value requests.
 * Typed interaction states render through the package's Component CLI renderers.
 *
 * @module
 */

export * from "./activity.ts";
export * from "./background.ts";
export * from "./basic-requests.ts";
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
export { InlineFramePainter } from "./painter.ts";
export type {
  InlineFramePaintResult,
  InlineFrameRefusalReason,
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
export * from "./textarea-request.ts";
export * from "./types.ts";

export {
  renderTerminalApplication,
  TERMINAL_APPLICATION_MINIMUM,
  transitionTerminalApplication,
  updateTerminalApplication,
} from "./application-model.ts";
export type {
  TerminalApplicationAction,
  TerminalApplicationFrame,
  TerminalApplicationPosition,
  TerminalApplicationRegion,
  TerminalApplicationState,
  TerminalApplicationView,
} from "./application-model.ts";
export * from "./application.ts";
