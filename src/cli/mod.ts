/**
 * React-free terminal rendering foundation, component registry, and renderers.
 * Every renderer is pure and receives explicit terminal capabilities.
 *
 * @module
 */

export * from "./ansi.ts";
export * from "./box.ts";
export * from "./block-composition.ts";
export * from "./capabilities.ts";
export * from "./contracts.ts";
export * from "./interactive-states.ts";
export * from "./semantic-inline.ts";
export * from "./layout.ts";
export {
  defineTerminalMotif,
  deriveTerminalMotif,
  DISCERN_TERMINAL_MOTIF,
  terminalMotifQuietMarker,
  terminalMotifRegisterRoles,
  terminalMotifRepertoire,
} from "./motif.ts";
export type {
  TerminalMotif,
  TerminalMotifBrandRegister,
  TerminalMotifCycle,
  TerminalMotifDefinition,
  TerminalMotifOptions,
  TerminalMotifOverrides,
  TerminalMotifRegister,
  TerminalMotifRepertoire,
  TerminalMotifRepertoireDefinition,
  TerminalMotifRepertoireOverrides,
} from "./motif.ts";
export * from "./motifs.ts";
export * from "./narration.ts";
export * from "./presenter.ts";
export * from "./result-summary-group.ts";
export * from "./rhythm.ts";
export * from "./text.ts";
export * from "./theme.ts";
export * from "./triangles.ts";
export * from "../generated/cli-registry.ts";
export * from "../generated/cli-renderers.ts";
