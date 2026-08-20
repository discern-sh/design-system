/**
 * Pure terminal renderer and deterministic example states for Input.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type {
  AutocompleteFrameState,
  MaskedInputFrameState,
  TextInputFrameState,
} from "../../../cli/interactive-states.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import {
  type FormCliPresentation,
  insertFormCliCursor,
  renderFormCliFrame,
} from "../form-frame.ts";

/** Inputs accepted by the terminal Input renderer. */
export type InputCliProps =
  & (
    | TextInputFrameState
    | MaskedInputFrameState
    | AutocompleteFrameState
  )
  & {
    readonly presentation?: FormCliPresentation;
    readonly required?: boolean;
    readonly showStatus?: boolean;
    readonly theme?: TerminalThemeVariant;
    readonly width?: number;
  };

const base = {
  kind: "text-input" as const,
  label: "Project name",
  value: "",
  cursor: 0,
  placeholder: "my-project",
};

/** Every static Input state rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<InputCliProps>[] = [
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
      value: "atlas",
      cursor: 5,
      lifecycle: { status: "active" },
      presentation: "filled",
    },
  },
  {
    name: "validation-error",
    props: {
      ...base,
      value: "a",
      cursor: 1,
      lifecycle: {
        status: "validation-error",
        message: "Use at least three characters",
      },
    },
  },
  {
    name: "disabled",
    props: {
      ...base,
      value: "atlas",
      cursor: 5,
      lifecycle: { status: "active" },
      presentation: "disabled",
    },
  },
  {
    name: "submitted",
    props: {
      ...base,
      value: "atlas",
      cursor: 5,
      lifecycle: { status: "submitted" },
    },
  },
  {
    name: "cancelled",
    props: {
      ...base,
      lifecycle: { status: "cancelled", reason: "Input cancelled" },
    },
  },
  {
    name: "searching",
    props: {
      kind: "autocomplete",
      label: "Token reference",
      lifecycle: { status: "active" },
      value: "can",
      cursor: 3,
      suggestions: [],
      highlightedIndex: 0,
      pending: true,
    },
  },
] as const;

function rawValue(
  state: TextInputFrameState | MaskedInputFrameState | AutocompleteFrameState,
  capabilities: Parameters<CliRenderer<InputCliProps>>[1],
): string {
  if (state.kind === "masked-input") {
    if (!Number.isSafeInteger(state.valueLength) || state.valueLength < 0) {
      throw new TypeError(
        `masked input length must be a non-negative safe integer; received ${state.valueLength}`,
      );
    }
    const mask = (capabilities.unicode ? "•" : "*").repeat(state.valueLength);
    return mask === "" ? state.placeholder ?? "" : mask;
  }
  if (
    state.kind === "autocomplete" && state.lifecycle.status !== "submitted"
  ) {
    const suggestion = state.suggestions[state.highlightedIndex];
    if (
      suggestion !== undefined &&
      suggestion.toLocaleLowerCase().startsWith(state.value.toLocaleLowerCase())
    ) {
      return suggestion;
    }
  }
  return state.value === "" ? state.placeholder ?? "" : state.value;
}

/** Render a Wave 1 text or masked-input state as one complete terminal frame. */
const renderInputCli: CliRenderer<InputCliProps> = (props, capabilities) => {
  const state = props;
  const raw = rawValue(state, capabilities);
  const showCursor = props.presentation !== "idle" &&
    props.presentation !== "filled" && props.presentation !== "disabled" &&
    (state.lifecycle.status === "active" ||
      state.lifecycle.status === "validation-error");
  const value = showCursor
    ? insertFormCliCursor(raw, state.cursor, capabilities)
    : raw;
  return renderFormCliFrame({
    label: state.label,
    control: value,
    lifecycle: state.lifecycle,
    ...(state.hint === undefined ? {} : { hint: state.hint }),
    ...(state.kind === "autocomplete" && state.pending === true
      ? { pending: true }
      : {}),
    ...(props.presentation === undefined
      ? {}
      : { presentation: props.presentation }),
    ...(props.required === undefined ? {} : { required: props.required }),
    ...(props.showStatus === undefined ? {} : { showStatus: props.showStatus }),
    ...(props.theme === undefined ? {} : { theme: props.theme }),
    ...(props.width === undefined ? {} : { width: props.width }),
  }, capabilities);
};

export default renderInputCli;
