/**
 * Pure terminal renderer and deterministic example states for Select.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type { SelectFrameState } from "../../../cli/interactive-states.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import {
  type FormCliPresentation,
  renderFormCliFrame,
  visibleFormCliChoices,
} from "../form-frame.ts";

/** Inputs accepted by the terminal Select renderer. */
export interface SelectCliProps extends SelectFrameState {
  readonly presentation?: FormCliPresentation;
  readonly placeholder?: string;
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
  label: "Environment",
  options,
  highlightedIndex: 0,
};

/** Every static Select state rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<SelectCliProps>[] = [
  {
    name: "idle",
    props: {
      ...base,
      lifecycle: { status: "active" },
      presentation: "idle",
      placeholder: "Choose an environment",
    },
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
      lifecycle: {
        status: "validation-error",
        message: "Choose an environment",
      },
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

/** Render a Wave 1 single-selection state as a collapsed or expanded terminal Select. */
const renderSelectCli: CliRenderer<SelectCliProps> = (props, capabilities) => {
  const state = props;
  if (
    state.options.length === 0 || state.highlightedIndex < 0 ||
    state.highlightedIndex >= state.options.length
  ) {
    throw new TypeError("select state requires an in-range highlighted option");
  }
  const expanded = props.presentation === undefined &&
    (state.lifecycle.status === "active" ||
      state.lifecycle.status === "validation-error");
  const selected = state.options.find((option) =>
    option.id === state.selectedId
  );
  const control = expanded
    ? visibleFormCliChoices(state).map((option) => {
      const absoluteIndex = state.options.indexOf(option);
      const pointer = absoluteIndex === state.highlightedIndex
        ? capabilities.unicode ? "›" : ">"
        : " ";
      const mark = option.id === state.selectedId
        ? capabilities.unicode ? "●" : "*"
        : " ";
      return `${pointer} [${mark}] ${option.label}${
        option.disabled === true ? " (disabled)" : ""
      }`;
    }).join("\n")
    : `${selected?.label ?? props.placeholder ?? "Choose an option"} ${
      capabilities.unicode ? "⌄" : "v"
    }`;
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

export default renderSelectCli;
