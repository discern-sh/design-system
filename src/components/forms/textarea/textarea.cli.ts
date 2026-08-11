/**
 * Pure terminal renderer and deterministic example states for Textarea.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type { TextareaFrameState } from "../../../cli/interactive-states.ts";
import { wrapText } from "../../../cli/text.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import {
  type FormCliPresentation,
  insertFormCliCursor,
  renderFormCliFrame,
} from "../form-frame.ts";

/** Inputs accepted by the terminal Textarea renderer. */
export interface TextareaCliProps extends TextareaFrameState {
  readonly presentation?: FormCliPresentation;
  readonly required?: boolean;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

const base = {
  kind: "textarea" as const,
  label: "Release notes",
  value: "",
  cursor: 0,
  rows: 3,
  placeholder: "Describe the change",
};

/** Every static Textarea state rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<TextareaCliProps>[] = [
  {
    name: "idle",
    props: { ...base, lifecycle: { status: "active" }, presentation: "idle" },
  },
  {
    name: "active",
    props: { ...base, lifecycle: { status: "active" } },
  },
  {
    name: "filled",
    props: {
      ...base,
      value: "Adds CLI frames.",
      cursor: 16,
      lifecycle: { status: "active" },
      presentation: "filled",
    },
  },
  {
    name: "validation-error",
    props: {
      ...base,
      value: "Short",
      cursor: 5,
      lifecycle: { status: "validation-error", message: "Add more detail" },
    },
  },
  {
    name: "disabled",
    props: {
      ...base,
      value: "Managed by policy",
      cursor: 17,
      lifecycle: { status: "active" },
      presentation: "disabled",
    },
  },
  {
    name: "submitted",
    props: {
      ...base,
      value: "Adds CLI frames.",
      cursor: 16,
      lifecycle: { status: "submitted" },
    },
  },
  {
    name: "cancelled",
    props: {
      ...base,
      lifecycle: { status: "cancelled", reason: "Draft discarded" },
    },
  },
] as const;

/** Render a Wave 1 textarea state as a fixed-row terminal frame. */
const renderTextareaCli: CliRenderer<TextareaCliProps> = (
  props,
  capabilities,
) => {
  const state = props;
  if (!Number.isSafeInteger(state.rows) || state.rows < 1) {
    throw new TypeError(
      `textarea rows must be a positive safe integer; received ${state.rows}`,
    );
  }
  const raw = state.value === "" ? state.placeholder ?? "" : state.value;
  const showCursor = props.presentation !== "idle" &&
    props.presentation !== "filled" && props.presentation !== "disabled" &&
    (state.lifecycle.status === "active" ||
      state.lifecycle.status === "validation-error");
  const withCursor = showCursor
    ? insertFormCliCursor(raw, state.cursor, capabilities)
    : raw;
  const width = Math.min(props.width ?? 48, capabilities.columns);
  const lines = wrapText(withCursor, Math.max(1, width - 2)).slice(
    0,
    state.rows,
  );
  while (lines.length < state.rows) lines.push("");
  return renderFormCliFrame({
    label: state.label,
    control: lines.join("\n"),
    lifecycle: state.lifecycle,
    ...(state.hint === undefined ? {} : { hint: state.hint }),
    ...(props.presentation === undefined
      ? {}
      : { presentation: props.presentation }),
    ...(props.required === undefined ? {} : { required: props.required }),
    ...(props.theme === undefined ? {} : { theme: props.theme }),
    width,
  }, capabilities);
};

export default renderTextareaCli;
