/**
 * Shared React-free form frame treatment for component CLI renderers.
 *
 * @module
 */

import { styleText } from "../../cli/ansi.ts";
import { renderBox } from "../../cli/box.ts";
import type { TerminalCapabilities } from "../../cli/capabilities.ts";
import { defaultTerminalFrameWidth } from "../../cli/frame-measure.ts";
import type {
  InteractiveChoiceGroupHeadingState,
  InteractiveChoiceOverflowState,
  InteractiveFrameLifecycle,
  SelectFrameState,
} from "../../cli/interactive-states.ts";
import {
  interactiveChoiceOverflow,
  interactiveChoiceWindow,
  type InteractiveChoiceWindowEntry,
} from "../../cli/interactive-choice.ts";
import { measureText, truncateText, wrapStyledText } from "../../cli/text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../cli/theme.ts";
import { renderTriangleSectionRule } from "../../cli/triangles.ts";

/** Static presentation layered over an active Wave 1 frame. */
export type FormCliPresentation =
  | "idle"
  | "active"
  | "filled"
  | "disabled";

/** Shared options used to compose one coherent terminal form frame. */
export interface FormCliFrameOptions {
  readonly label: string;
  readonly control: string;
  readonly lifecycle: InteractiveFrameLifecycle;
  readonly hint?: string;
  readonly required?: boolean;
  /** Provider work is scheduled or in flight behind an active frame. */
  readonly pending?: boolean;
  readonly presentation?: FormCliPresentation;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
  /** Counts of choices beyond a scrolling control's current window. */
  readonly choiceOverflow?: InteractiveChoiceOverflowState;
}

function statusLabel(options: FormCliFrameOptions): string {
  if (options.lifecycle.status === "validation-error") return "error";
  if (options.lifecycle.status !== "active") return options.lifecycle.status;
  return options.presentation ??
    (options.pending === true ? "searching" : "active");
}

function statusTone(
  status: ReturnType<typeof statusLabel>,
): "accent" | "neutral" | "success" | "danger" {
  if (status === "error") return "danger";
  if (status === "submitted") return "success";
  if (status === "active" || status === "searching" || status === "filled") {
    return "accent";
  }
  return "neutral";
}

function footer(
  options: FormCliFrameOptions,
  capabilities: TerminalCapabilities,
): string {
  if (options.lifecycle.status === "validation-error") {
    return `! ${options.lifecycle.message}`;
  }
  if (options.lifecycle.status === "submitted") {
    return capabilities.unicode ? "✓ Submitted" : "OK Submitted";
  }
  if (options.lifecycle.status === "cancelled") {
    return `${capabilities.unicode ? "×" : "x"} ${options.lifecycle.reason}`;
  }
  if (options.presentation === "disabled") return "Disabled";
  return options.hint ?? "";
}

function formCliFrameWidth(
  requested: number | undefined,
  capabilities: TerminalCapabilities,
): number {
  const width = requested ?? defaultTerminalFrameWidth(capabilities);
  if (!Number.isSafeInteger(width) || width < 8) {
    throw new TypeError(
      `form frame width must be a safe integer of at least 8; received ${width}`,
    );
  }
  const boundedWidth = Math.min(width, capabilities.columns);
  if (boundedWidth < 8) {
    throw new TypeError(
      `terminal width ${capabilities.columns} cannot hold a form frame`,
    );
  }
  return boundedWidth;
}

/** Resolve the content width inside one shared form frame. */
export function formCliControlWidth(
  requested: number | undefined,
  capabilities: TerminalCapabilities,
): number {
  return formCliFrameWidth(requested, capabilities) - 2;
}

/**
 * Resolve a scrolling choice frame against all currently available columns.
 * An explicit width remains a caller-provided ceiling.
 */
export function formCliChoiceFrameWidth(
  requested: number | undefined,
  capabilities: TerminalCapabilities,
): number {
  return formCliFrameWidth(requested ?? capabilities.columns, capabilities);
}

function hiddenChoiceCount(value: number | undefined): number {
  const count = value ?? 0;
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new TypeError(
      `hidden choice count must be a non-negative safe integer; received ${count}`,
    );
  }
  return count;
}

function choiceOverflowLabel(
  overflow: InteractiveChoiceOverflowState | undefined,
  capabilities: TerminalCapabilities,
): string {
  const before = hiddenChoiceCount(overflow?.hiddenChoicesBefore);
  const after = hiddenChoiceCount(overflow?.hiddenChoicesAfter);
  const above = before === 0
    ? ""
    : `${capabilities.unicode ? "↑" : "^"} ${before} more`;
  const below = after === 0
    ? ""
    : `${capabilities.unicode ? "↓" : "v"} ${after} more`;
  return [above, below].filter((label) => label !== "").join(
    capabilities.unicode ? " · " : " | ",
  );
}

/**
 * Render label, state, control, and lifecycle message as one form frame.
 *
 * The message row below the box is always reserved: it carries the hint,
 * the lifecycle message, or stays blank, so a frame's height never changes
 * when a message appears or clears.
 */
export function renderFormCliFrame(
  options: FormCliFrameOptions,
  capabilities: TerminalCapabilities,
): string {
  if (options.label.trim() === "") {
    throw new TypeError("form frame label must be non-empty");
  }
  const boundedWidth = formCliFrameWidth(options.width, capabilities);
  const theme = terminalThemes[options.theme ?? "dark"];
  const status = statusLabel(options);
  const tone = statusTone(status);
  const required = options.required === true ? " *" : "";
  const heading = truncateText(
    `${options.label}${required} [${status}]`,
    boundedWidth,
    capabilities.unicode ? "…" : ".",
  );
  const message = truncateText(
    footer(options, capabilities),
    boundedWidth,
    capabilities.unicode ? "…" : ".",
  );
  const overflowLabel = choiceOverflowLabel(
    options.choiceOverflow,
    capabilities,
  );
  return [
    styleText(heading, {
      ...theme.typography.strong,
      color: terminalToneColor(theme, tone),
    }, capabilities),
    renderBox({
      body: options.control === "" ? " " : options.control,
      width: boundedWidth,
      padding: 0,
      borderStyle: { color: terminalToneColor(theme, tone) },
      ...(overflowLabel === "" ? {} : {
        bottomLabel: overflowLabel,
        bottomLabelStyle: {
          ...theme.typography.annotation,
          color: terminalThemeColor(
            theme,
            "--discern-color-ink-muted",
          ),
        },
      }),
    }, capabilities),
    message === "" ? "" : styleText(message, {
      ...theme.typography.annotation,
      color: terminalToneColor(theme, tone),
    }, capabilities),
  ].join("\n");
}

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** Insert the capability-specific form cursor at one grapheme index. */
export function insertFormCliCursor(
  value: string,
  cursor: number,
  capabilities: TerminalCapabilities,
): string {
  return insertFormCliMarker(
    value,
    cursor,
    capabilities.unicode ? "▌" : "|",
  );
}

/** Insert one visual marker at a grapheme index without splitting content. */
export function insertFormCliMarker(
  value: string,
  cursor: number,
  marker: string,
): string {
  const graphemes = [...segmenter.segment(value)].map((part) => part.segment);
  if (
    !Number.isSafeInteger(cursor) || cursor < 0 || cursor > graphemes.length
  ) {
    throw new TypeError(
      `form cursor must be between 0 and ${graphemes.length}; received ${cursor}`,
    );
  }
  graphemes.splice(cursor, 0, marker);
  return graphemes.join("");
}

/** The one truthful empty-results row: in-flight work is not an empty answer. */
export function formCliEmptyResultsRow(
  pending: boolean,
  capabilities: TerminalCapabilities,
): string {
  if (pending) return capabilities.unicode ? "Searching…" : "Searching...";
  return "No results.";
}

/** Resolve a heading-aware visible window from a selection-like frame. */
export function visibleFormCliChoiceEntries(
  state: Pick<SelectFrameState, "options" | "visibleStart" | "visibleCount">,
): readonly InteractiveChoiceWindowEntry[] {
  const start = state.visibleStart ?? 0;
  const count = state.visibleCount ?? state.options.length;
  return interactiveChoiceWindow(state.options, start, count);
}

/** Count choices hidden outside one complete selection frame's viewport. */
export function visibleFormCliChoiceOverflow(
  state: Pick<
    SelectFrameState,
    | "options"
    | "visibleStart"
    | "visibleCount"
    | "hiddenChoicesBefore"
    | "hiddenChoicesAfter"
  >,
): Required<InteractiveChoiceOverflowState> {
  const start = state.visibleStart ?? 0;
  const count = state.visibleCount ?? state.options.length;
  const derived = interactiveChoiceOverflow(state.options, start, count);
  return {
    hiddenChoicesBefore: state.hiddenChoicesBefore ??
      derived.hiddenChoicesBefore,
    hiddenChoicesAfter: state.hiddenChoicesAfter ?? derived.hiddenChoicesAfter,
  };
}

/** Render a semantic choice heading through the package section-rule authority. */
export function renderFormCliChoiceHeading(
  heading: InteractiveChoiceGroupHeadingState,
  options: {
    readonly theme?: TerminalThemeVariant;
    readonly width?: number;
  },
  capabilities: TerminalCapabilities,
): string {
  const width = formCliChoiceFrameWidth(options.width, capabilities) - 2;
  const theme = terminalThemes[options.theme ?? "dark"];
  const gap = theme.spacing["--discern-space-2"] ?? 1;
  const labelWidth = Math.max(1, width - 2 * gap - 2);
  const label = truncateText(
    heading.label,
    labelWidth,
    capabilities.unicode ? "…" : ".",
  );
  return `\n${
    renderTriangleSectionRule(
      label,
      {
        width,
        ...(options.theme === undefined ? {} : { theme: options.theme }),
      },
      { ...capabilities, columns: width },
    )
  }`;
}

/** Inputs for one prefix-stable, hanging-indent choice row. */
export interface FormCliChoiceRowOptions {
  /** Fixed-width pointer slot, including its following space. */
  readonly pointer: string;
  /** Component-specific selection marker, already semantically styled. */
  readonly marker: string;
  readonly label: string;
  readonly highlighted?: boolean;
  readonly disabled?: boolean;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/**
 * Render one choice row with every continuation aligned under its label.
 * Pointer movement can therefore change styling and glyphs, but never the
 * row's wrapping or indentation.
 */
export function renderFormCliChoiceRow(
  options: FormCliChoiceRowOptions,
  capabilities: TerminalCapabilities,
): string {
  const styleOptions = {
    ...(options.highlighted === undefined
      ? {}
      : { highlighted: options.highlighted }),
    ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
    ...(options.theme === undefined ? {} : { theme: options.theme }),
  };
  const prefix = `${
    styleFormCliChoiceText(options.pointer, styleOptions, capabilities)
  }${options.marker} `;
  const prefixWidth = measureText(prefix);
  const controlWidth = formCliChoiceFrameWidth(options.width, capabilities) - 2;
  if (prefixWidth >= controlWidth) {
    throw new TypeError(
      `choice row prefix requires ${prefixWidth} of ${controlWidth} control columns`,
    );
  }
  const lines = wrapStyledText(
    styleFormCliChoiceText(options.label, styleOptions, capabilities),
    controlWidth - prefixWidth,
  );
  return lines.map((line, index) =>
    index === 0 ? `${prefix}${line}` : `${" ".repeat(prefixWidth)}${line}`
  ).join("\n");
}

/** Join a query row to choice rows without doubling an existing group spacer. */
export function renderFormCliQueryChoices(
  query: string,
  choices: string,
): string {
  return query === "" && choices.startsWith("\n")
    ? choices
    : `${query}\n${choices}`;
}

/** Style one choice-row fragment without replacing its non-colour signal. */
export function styleFormCliChoiceText(
  value: string,
  options: {
    readonly highlighted?: boolean;
    readonly disabled?: boolean;
    readonly theme?: TerminalThemeVariant;
  },
  capabilities: TerminalCapabilities,
): string {
  const theme = terminalThemes[options.theme ?? "dark"];
  if (options.disabled === true) {
    return styleText(value, {
      ...theme.typography.muted,
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
    }, capabilities);
  }
  if (options.highlighted === true) {
    return styleText(value, {
      ...theme.typography.strong,
      color: terminalToneColor(theme, "accent"),
    }, capabilities);
  }
  return value;
}

/** Colour a selected choice mark with the active form-border accent role. */
export function styleFormCliSelectedMark(
  value: string,
  selected: boolean,
  options: {
    readonly disabled?: boolean;
    readonly theme?: TerminalThemeVariant;
  },
  capabilities: TerminalCapabilities,
): string {
  if (!selected) return value;
  const theme = terminalThemes[options.theme ?? "dark"];
  return styleText(value, {
    color: options.disabled === true
      ? terminalThemeColor(theme, "--discern-color-ink-muted")
      : terminalToneColor(theme, "accent"),
  }, capabilities);
}
