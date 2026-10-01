/**
 * Terminal applications: a header bar, a grouped list with a following
 * detail, a reading document, or an empty state, with a message line, key
 * hints, and modal layers, owned by the package from input to paint.
 *
 * @module
 */

export * from "./view.ts";
export * from "./layer-view.ts";
export {
  EDITOR_RESERVED_CHORDS,
  TERMINAL_APPLICATION_LAYER_KEYS,
  TERMINAL_APPLICATION_RESERVED_KEYS,
} from "./keymap.ts";
export {
  type TerminalApplicationViewContext,
  type TerminalApplicationViewIssue,
  validateTerminalApplicationView,
} from "./validate.ts";
export {
  createTerminalApplicationModel,
  type TerminalApplicationActionSource,
  type TerminalApplicationConfig,
  terminalApplicationDeadline,
  type TerminalApplicationDensity,
  type TerminalApplicationDismissal,
  type TerminalApplicationEffect,
  type TerminalApplicationFilter,
  type TerminalApplicationGeometry,
  type TerminalApplicationInput,
  type TerminalApplicationLayout,
  type TerminalApplicationListModel,
  type TerminalApplicationListState,
  type TerminalApplicationModel,
  type TerminalApplicationSelectionMove,
  type TerminalApplicationState,
  terminalApplicationState,
  type TerminalApplicationTransition,
  transitionTerminalApplication,
  updateTerminalApplication,
} from "./model.ts";
export {
  renderTerminalApplication,
  TERMINAL_APPLICATION_MINIMUM,
  type TerminalApplicationFrame,
} from "./frame.ts";
export type { TerminalApplicationMotion } from "./paint.ts";
export * from "./runtime.ts";
