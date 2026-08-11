/**
 * Temporary pure frame-state-to-string seam for the interactive adapter.
 * Wave three replaces only this module with component renderers.
 *
 * @module
 */

import { styleText } from "../ansi.ts";
import { renderBox } from "../box.ts";
import type { TerminalCapabilities } from "../capabilities.ts";
import type {
  AutocompleteFrameState,
  ConfirmFrameState,
  DeterminateProgressFrameState,
  InteractiveChoiceState,
  InteractiveFrameLifecycle,
  InteractiveFrameState,
  MaskedInputFrameState,
  MultiselectFrameState,
  SearchFrameState,
  SelectFrameState,
  SequentialFormFrameState,
  SpinnerFrameState,
  TextareaFrameState,
  TextInputFrameState,
} from "../interactive-states.ts";
import { measureText, truncateText } from "../text.ts";
import {
  type TerminalTheme,
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../theme.ts";
import {
  renderTriangleActivityBeacon,
  renderTriangleProgressFrame,
  renderTriangleSpinnerFrame,
  renderTriangleWorkflowStepper,
} from "../triangles.ts";
import { segmentGraphemes } from "./editor.ts";

/** Theme selection accepted by every temporary interactive frame renderer. */
export interface InteractiveFrameRenderOptions {
  readonly theme?: TerminalThemeVariant;
}

function themeFor(options: InteractiveFrameRenderOptions): TerminalTheme {
  return terminalThemes[options.theme ?? "dark"];
}

function lifecycleTone(
  lifecycle: InteractiveFrameLifecycle,
): "accent" | "warning" | "success" | "danger" {
  switch (lifecycle.status) {
    case "active":
      return "accent";
    case "validation-error":
      return "warning";
    case "submitted":
      return "success";
    case "cancelled":
      return "danger";
  }
}

function lifecycleTitle(
  label: string,
  lifecycle: InteractiveFrameLifecycle,
  capabilities: TerminalCapabilities,
): string {
  const divider = capabilities.unicode ? " — " : " - ";
  switch (lifecycle.status) {
    case "active":
      return label;
    case "validation-error":
      return `${label}${divider}Check`;
    case "submitted":
      return `${label}${divider}Done`;
    case "cancelled":
      return `${label}${divider}Cancelled`;
  }
}

function feedback(
  state: {
    readonly lifecycle: InteractiveFrameLifecycle;
    readonly hint?: string;
  },
): string | undefined {
  if (state.lifecycle.status === "validation-error") {
    return state.lifecycle.message;
  }
  if (state.lifecycle.status === "cancelled") return state.lifecycle.reason;
  if (state.lifecycle.status === "active") return state.hint;
  return undefined;
}

function frameBody(
  state: {
    readonly lifecycle: InteractiveFrameLifecycle;
    readonly hint?: string;
  },
  body: string,
): string {
  const note = feedback(state);
  return note === undefined || note === "" ? body : `${body}\n${note}`;
}

function renderFrameBox(
  state: {
    readonly label: string;
    readonly lifecycle: InteractiveFrameLifecycle;
    readonly hint?: string;
  },
  body: string,
  capabilities: TerminalCapabilities,
  options: InteractiveFrameRenderOptions,
): string {
  const completeBody = frameBody(state, body);
  if (capabilities.columns < 5) {
    return completeBody.split("\n").map((line) =>
      truncateText(line, capabilities.columns, capabilities.unicode ? "…" : ".")
    ).join("\n");
  }
  const theme = themeFor(options);
  return renderBox({
    title: lifecycleTitle(state.label, state.lifecycle, capabilities),
    body: completeBody,
    width: Math.min(64, capabilities.columns),
    borderStyle: {
      color: terminalToneColor(theme, lifecycleTone(state.lifecycle)),
    },
  }, capabilities);
}

function cursorGlyph(capabilities: TerminalCapabilities): string {
  return capabilities.unicode ? "▌" : "|";
}

function editableLine(
  value: string,
  cursor: number,
  placeholder: string | undefined,
  capabilities: TerminalCapabilities,
): string {
  const graphemes = [...segmentGraphemes(value)];
  if (graphemes.length === 0) {
    const empty = cursorGlyph(capabilities);
    return placeholder === undefined || placeholder === ""
      ? empty
      : `${empty} ${placeholder}`;
  }
  const index = Math.max(0, Math.min(graphemes.length, cursor));
  graphemes.splice(index, 0, cursorGlyph(capabilities));
  return graphemes.join("");
}

function maskedValue(
  length: number,
  capabilities: TerminalCapabilities,
): string {
  const glyph = capabilities.unicode ? "•" : "*";
  return glyph.repeat(Math.max(0, length));
}

/** Render one text-input frame state. */
export function renderTextInputFrame(
  state: TextInputFrameState,
  capabilities: TerminalCapabilities,
  options: InteractiveFrameRenderOptions = {},
): string {
  const body = state.lifecycle.status === "submitted"
    ? state.value
    : editableLine(state.value, state.cursor, state.placeholder, capabilities);
  return renderFrameBox(state, body, capabilities, options);
}

/** Render one masked-input frame without exposing the raw value. */
export function renderMaskedInputFrame(
  state: MaskedInputFrameState,
  capabilities: TerminalCapabilities,
  options: InteractiveFrameRenderOptions = {},
): string {
  const masked = maskedValue(state.valueLength, capabilities);
  const body = state.lifecycle.status === "submitted"
    ? masked
    : editableLine(masked, state.cursor, state.placeholder, capabilities);
  return renderFrameBox(state, body, capabilities, options);
}

function confirmBody(
  state: ConfirmFrameState,
  capabilities: TerminalCapabilities,
): string {
  if (state.lifecycle.status === "submitted") {
    return state.value ? state.yesLabel : state.noLabel;
  }
  const selected = capabilities.unicode ? "●" : "*";
  const empty = capabilities.unicode ? "○" : " ";
  return state.value
    ? `[${selected}] ${state.yesLabel}  [${empty}] ${state.noLabel}`
    : `[${empty}] ${state.yesLabel}  [${selected}] ${state.noLabel}`;
}

/** Render one yes/no confirmation frame state. */
export function renderConfirmFrame(
  state: ConfirmFrameState,
  capabilities: TerminalCapabilities,
  options: InteractiveFrameRenderOptions = {},
): string {
  return renderFrameBox(
    state,
    confirmBody(state, capabilities),
    capabilities,
    options,
  );
}

function choiceRange(
  options: readonly InteractiveChoiceState[],
  visibleStart: number | undefined,
  visibleCount: number | undefined,
): readonly InteractiveChoiceState[] {
  const start = Math.max(0, Math.min(options.length, visibleStart ?? 0));
  const count = visibleCount === undefined
    ? options.length - start
    : Math.max(0, visibleCount);
  return options.slice(start, start + count);
}

function selectedChoiceLabel(state: SelectFrameState): string {
  const selected = state.selectedId === undefined
    ? state.options[state.highlightedIndex]
    : state.options.find((choice) => choice.id === state.selectedId);
  return selected?.label ?? "";
}

/** Render one single-select frame state. */
export function renderSelectFrame(
  state: SelectFrameState,
  capabilities: TerminalCapabilities,
  options: InteractiveFrameRenderOptions = {},
): string {
  if (state.lifecycle.status === "submitted") {
    return renderFrameBox(
      state,
      selectedChoiceLabel(state),
      capabilities,
      options,
    );
  }
  const start = state.visibleStart ?? 0;
  const visible = choiceRange(
    state.options,
    state.visibleStart,
    state.visibleCount,
  );
  const body = visible.map((choice, offset) => {
    const index = start + offset;
    const active = index === state.highlightedIndex;
    const selected = choice.id === state.selectedId;
    const marker = selected ? (capabilities.unicode ? "●" : "*") : " ";
    return `${active ? ">" : " "} [${marker}] ${choice.label}${
      choice.disabled === true ? " (disabled)" : ""
    }`;
  }).join("\n") || "No options.";
  return renderFrameBox(state, body, capabilities, options);
}

/** Render one multi-select frame state. */
export function renderMultiselectFrame(
  state: MultiselectFrameState,
  capabilities: TerminalCapabilities,
  options: InteractiveFrameRenderOptions = {},
): string {
  if (state.lifecycle.status === "submitted") {
    const labels = state.options.filter((choice) =>
      state.selectedIds.includes(choice.id)
    ).map((choice) => choice.label);
    return renderFrameBox(
      state,
      labels.join("\n") || "None.",
      capabilities,
      options,
    );
  }
  const start = state.visibleStart ?? 0;
  const visible = choiceRange(
    state.options,
    state.visibleStart,
    state.visibleCount,
  );
  const body = visible.map((choice, offset) => {
    const index = start + offset;
    const active = index === state.highlightedIndex;
    const selected = state.selectedIds.includes(choice.id);
    const marker = selected ? "x" : " ";
    return `${active ? ">" : " "} [${marker}] ${choice.label}${
      choice.disabled === true ? " (disabled)" : ""
    }`;
  }).join("\n") || "No options.";
  return renderFrameBox(state, body, capabilities, options);
}

function searchResults(
  state: SearchFrameState,
): string {
  if (state.results.length === 0) return "No results.";
  return state.results.map((choice, index) =>
    `${index === state.highlightedIndex ? ">" : " "} ${choice.label}${
      choice.disabled === true ? " (disabled)" : ""
    }`
  ).join("\n");
}

/** Render one asynchronous-search frame state. */
export function renderSearchFrame(
  state: SearchFrameState,
  capabilities: TerminalCapabilities,
  options: InteractiveFrameRenderOptions = {},
): string {
  if (state.lifecycle.status === "submitted") {
    const selected = state.highlightedIndex === undefined
      ? undefined
      : state.results[state.highlightedIndex];
    return renderFrameBox(
      state,
      selected?.label ?? "",
      capabilities,
      options,
    );
  }
  const input = editableLine(
    state.query,
    state.cursor,
    state.placeholder,
    capabilities,
  );
  return renderFrameBox(
    state,
    `${input}\n${searchResults(state)}`,
    capabilities,
    options,
  );
}

/** Render one ghost-text autocomplete frame state. */
export function renderAutocompleteFrame(
  state: AutocompleteFrameState,
  capabilities: TerminalCapabilities,
  options: InteractiveFrameRenderOptions = {},
): string {
  if (state.lifecycle.status === "submitted") {
    return renderFrameBox(state, state.value, capabilities, options);
  }
  const suggestion = state.suggestions[state.highlightedIndex];
  const ghost = suggestion !== undefined &&
      suggestion.toLocaleLowerCase().startsWith(
        state.value.toLocaleLowerCase(),
      )
    ? suggestion.slice(state.value.length)
    : "";
  const input = editableLine(
    state.value,
    state.cursor,
    state.placeholder,
    capabilities,
  );
  return renderFrameBox(state, `${input}${ghost}`, capabilities, options);
}

function textareaBody(
  state: TextareaFrameState,
  capabilities: TerminalCapabilities,
): string {
  if (state.lifecycle.status === "submitted") return state.value;
  const graphemes = [...segmentGraphemes(state.value)];
  const cursor = Math.max(0, Math.min(graphemes.length, state.cursor));
  graphemes.splice(cursor, 0, cursorGlyph(capabilities));
  if (state.value === "" && state.placeholder !== undefined) {
    graphemes.push(` ${state.placeholder}`);
  }
  const lines = graphemes.join("").split("\n");
  const cursorLine = segmentGraphemes(state.value).slice(0, cursor).filter(
    (grapheme) => grapheme === "\n",
  ).length;
  const rows = Math.max(1, state.rows);
  const start = Math.max(
    0,
    Math.min(
      cursorLine - rows + 1,
      Math.max(0, lines.length - rows),
    ),
  );
  const visible = lines.slice(start, start + rows);
  while (visible.length < rows) visible.push("");
  return visible.join("\n");
}

/** Render one multiline textarea frame state. */
export function renderTextareaFrame(
  state: TextareaFrameState,
  capabilities: TerminalCapabilities,
  options: InteractiveFrameRenderOptions = {},
): string {
  return renderFrameBox(
    state,
    textareaBody(state, capabilities),
    capabilities,
    options,
  );
}

/** Render one spinner state through the canonical triangle spinner primitive. */
export function renderSpinnerFrame(
  state: SpinnerFrameState,
  capabilities: TerminalCapabilities,
  options: InteractiveFrameRenderOptions = {},
): string {
  const theme = themeFor(options);
  const gap = " ".repeat(theme.spacing["--discern-space-2"] ?? 1);
  const spinner = renderTriangleSpinnerFrame(
    state.phase,
    capabilities,
    options,
  );
  const labelWidth = Math.max(
    0,
    capabilities.columns - measureText(spinner) - measureText(gap),
  );
  const label = truncateText(
    state.label,
    labelWidth,
    capabilities.unicode ? "…" : ".",
  );
  const base = `${spinner}${gap}${label}`;
  const note = feedback(state);
  return note === undefined || note === "" ? base : `${base}\n${note}`;
}

/** Render determinate state through the canonical triangle progress primitive. */
export function renderDeterminateProgressFrame(
  state: DeterminateProgressFrameState,
  capabilities: TerminalCapabilities,
  options: InteractiveFrameRenderOptions = {},
): string {
  const label = truncateText(
    state.label,
    capabilities.columns,
    capabilities.unicode ? "…" : ".",
  );
  const progress = renderTriangleProgressFrame({
    completed: state.completed,
    total: state.total,
    width: Math.min(64, capabilities.columns),
    ...options,
  }, capabilities);
  const note = feedback(state);
  return [label, progress, note].filter((line) =>
    line !== undefined && line !== ""
  )
    .join("\n");
}

/** Render one complete sequential-form rail through foundation triangle motifs. */
export function renderSequentialFormFrame(
  state: SequentialFormFrameState,
  capabilities: TerminalCapabilities,
  options: InteractiveFrameRenderOptions = {},
): string {
  const theme = themeFor(options);
  const heading = styleText(state.label, {
    ...theme.typography.strong,
    color: terminalToneColor(theme, lifecycleTone(state.lifecycle)),
  }, capabilities);
  const stepper = state.sections.length === 0
    ? "No applicable steps."
    : renderTriangleWorkflowStepper(
      state.sections.map((section) => ({
        label: section.summary === undefined
          ? section.label
          : `${section.label}: ${section.summary}`,
        status: section.status,
        ...(section.status === "active" ? { phase: state.activePhase } : {}),
      })),
      capabilities,
      options,
    );
  const beacon = state.beaconPhase === undefined
    ? undefined
    : renderTriangleActivityBeacon({
      width: Math.min(16, capabilities.columns),
      phase: state.beaconPhase,
      ...options,
    }, capabilities);
  return [heading, stepper, beacon, feedback(state)].filter((line) =>
    line !== undefined && line !== ""
  ).join("\n");
}

function unreachableFrame(state: never): never {
  throw new TypeError(`Unknown interactive frame ${JSON.stringify(state)}`);
}

/** Render any wave-one interactive frame state through its one temporary seam. */
export function renderInteractiveFrame(
  state: InteractiveFrameState,
  capabilities: TerminalCapabilities,
  options: InteractiveFrameRenderOptions = {},
): string {
  switch (state.kind) {
    case "text-input":
      return renderTextInputFrame(state, capabilities, options);
    case "masked-input":
      return renderMaskedInputFrame(state, capabilities, options);
    case "confirm":
      return renderConfirmFrame(state, capabilities, options);
    case "select":
      return renderSelectFrame(state, capabilities, options);
    case "multiselect":
      return renderMultiselectFrame(state, capabilities, options);
    case "search":
      return renderSearchFrame(state, capabilities, options);
    case "autocomplete":
      return renderAutocompleteFrame(state, capabilities, options);
    case "textarea":
      return renderTextareaFrame(state, capabilities, options);
    case "spinner":
      return renderSpinnerFrame(state, capabilities, options);
    case "determinate-progress":
      return renderDeterminateProgressFrame(state, capabilities, options);
    case "sequential-form":
      return renderSequentialFormFrame(state, capabilities, options);
    default:
      return unreachableFrame(state);
  }
}
