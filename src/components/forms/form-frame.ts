/**
 * Shared React-free form frame treatment for component CLI renderers.
 *
 * @module
 */

import { styleText } from "../../cli/ansi.ts";
import { renderBox } from "../../cli/box.ts";
import type { TerminalCapabilities } from "../../cli/capabilities.ts";
import type {
  InteractiveFrameLifecycle,
  SelectFrameState,
} from "../../cli/interactive-states.ts";
import { joinVertical } from "../../cli/layout.ts";
import { truncateText } from "../../cli/text.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../cli/theme.ts";

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
  readonly presentation?: FormCliPresentation;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

function statusLabel(options: FormCliFrameOptions): string {
  if (options.lifecycle.status === "validation-error") return "error";
  if (options.lifecycle.status !== "active") return options.lifecycle.status;
  return options.presentation ?? "active";
}

function statusTone(
  status: ReturnType<typeof statusLabel>,
): "accent" | "neutral" | "success" | "danger" {
  if (status === "error") return "danger";
  if (status === "submitted") return "success";
  if (status === "active" || status === "filled") return "accent";
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

/** Render label, state, control, and lifecycle message as one form frame. */
export function renderFormCliFrame(
  options: FormCliFrameOptions,
  capabilities: TerminalCapabilities,
): string {
  if (options.label.trim() === "") {
    throw new TypeError("form frame label must be non-empty");
  }
  const width = options.width ?? Math.min(48, capabilities.columns);
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
  return joinVertical([
    styleText(heading, {
      ...theme.typography.strong,
      color: terminalToneColor(theme, tone),
    }, capabilities),
    renderBox({
      body: options.control === "" ? " " : options.control,
      width: boundedWidth,
      padding: 0,
      borderStyle: { color: terminalToneColor(theme, tone) },
    }, capabilities),
    message === "" ? "" : styleText(message, {
      ...theme.typography.annotation,
      color: terminalToneColor(theme, tone),
    }, capabilities),
  ]);
}

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** Insert the capability-specific form cursor at one grapheme index. */
export function insertFormCliCursor(
  value: string,
  cursor: number,
  capabilities: TerminalCapabilities,
): string {
  const graphemes = [...segmenter.segment(value)].map((part) => part.segment);
  if (
    !Number.isSafeInteger(cursor) || cursor < 0 || cursor > graphemes.length
  ) {
    throw new TypeError(
      `form cursor must be between 0 and ${graphemes.length}; received ${cursor}`,
    );
  }
  graphemes.splice(cursor, 0, capabilities.unicode ? "▌" : "|");
  return graphemes.join("");
}

/** Resolve the explicit visible window from a Wave 1 Select frame. */
export function visibleFormCliChoices(
  state: SelectFrameState,
): readonly SelectFrameState["options"][number][] {
  const start = state.visibleStart ?? 0;
  const count = state.visibleCount ?? state.options.length;
  if (
    !Number.isSafeInteger(start) || start < 0 || start > state.options.length
  ) {
    throw new TypeError(
      `select visible start must be between 0 and ${state.options.length}; received ${start}`,
    );
  }
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new TypeError(
      `select visible count must be a non-negative safe integer; received ${count}`,
    );
  }
  return state.options.slice(start, start + count);
}
