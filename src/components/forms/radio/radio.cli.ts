/**
 * Pure terminal renderer and deterministic example states for Radio.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type { SelectFrameState } from "../../../cli/interactive-states.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import { type FormCliPresentation, renderFormCliFrame } from "../form-frame.ts";

/** Inputs accepted by the terminal Radio renderer. */
export interface RadioCliProps extends SelectFrameState {
  readonly presentation?: FormCliPresentation;
  readonly required?: boolean;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

const options = [
  { id: "alpha", label: "Alpha" },
  { id: "bravo", label: "Bravo" },
  { id: "charlie", label: "Charlie", disabled: true },
] as const;
const base = {
  kind: "select" as const,
  label: "Channel",
  options,
  highlightedIndex: 0,
};

/** Every static Radio state rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<RadioCliProps>[] = [
  {
    name: "idle",
    props: { ...base, lifecycle: { status: "active" }, presentation: "idle" },
  },
  {
    name: "active",
    props: {
      ...base,
      highlightedIndex: 1,
      lifecycle: { status: "active" },
    },
  },
  {
    name: "filled",
    props: {
      ...base,
      selectedId: "bravo",
      lifecycle: { status: "active" },
      presentation: "filled",
    },
  },
  {
    name: "validation-error",
    props: {
      ...base,
      lifecycle: { status: "validation-error", message: "Choose a channel" },
    },
  },
  {
    name: "disabled",
    props: {
      ...base,
      selectedId: "alpha",
      lifecycle: { status: "active" },
      presentation: "disabled",
    },
  },
  {
    name: "submitted",
    props: {
      ...base,
      selectedId: "bravo",
      lifecycle: { status: "submitted" },
    },
  },
  {
    name: "cancelled",
    props: {
      ...base,
      lifecycle: { status: "cancelled", reason: "Selection cancelled" },
    },
  },
] as const;

/** Render a Wave 1 single-selection state as a terminal radio group. */
const renderRadioCli: CliRenderer<RadioCliProps> = (props, capabilities) => {
  const state = props;
  if (
    state.options.length === 0 || state.highlightedIndex < 0 ||
    state.highlightedIndex >= state.options.length
  ) {
    throw new TypeError("radio state requires an in-range highlighted option");
  }
  const expanded = props.presentation === undefined &&
    (state.lifecycle.status === "active" ||
      state.lifecycle.status === "validation-error");
  const control = state.options.map((option, index) => {
    const selected = option.id === state.selectedId;
    const marker = capabilities.unicode
      ? selected ? "◉" : "○"
      : selected
      ? "(*)"
      : "( )";
    const pointer = expanded && index === state.highlightedIndex
      ? capabilities.unicode ? "› " : "> "
      : "  ";
    return `${pointer}${marker} ${option.label}${
      option.disabled === true ? " (disabled)" : ""
    }`;
  }).join("\n");
  return renderFormCliFrame({
    label: state.label,
    control,
    lifecycle: state.lifecycle,
    ...(state.hint === undefined ? {} : { hint: state.hint }),
    ...(props.presentation === undefined
      ? {}
      : { presentation: props.presentation }),
    ...(props.required === undefined ? {} : { required: props.required }),
    ...(props.theme === undefined ? {} : { theme: props.theme }),
    ...(props.width === undefined ? {} : { width: props.width }),
  }, capabilities);
};

export default renderRadioCli;
