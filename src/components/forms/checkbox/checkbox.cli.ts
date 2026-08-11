/**
 * Pure terminal renderer and deterministic example states for Checkbox.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type {
  ConfirmFrameState,
  MultiselectFrameState,
} from "../../../cli/interactive-states.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import { type FormCliPresentation, renderFormCliFrame } from "../form-frame.ts";

/** Inputs accepted by the terminal Checkbox renderer. */
interface CheckboxCliOptions {
  readonly presentation?: FormCliPresentation;
  readonly required?: boolean;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Inputs accepted by the terminal Checkbox renderer. */
export type CheckboxCliProps =
  & (ConfirmFrameState | MultiselectFrameState)
  & CheckboxCliOptions;

const base = {
  kind: "confirm" as const,
  label: "Include examples",
  value: false,
  yesLabel: "Included",
  noLabel: "Not included",
};

/** Every static Checkbox state rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<CheckboxCliProps>[] = [
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
      value: true,
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
        message: "Choose before continuing",
      },
    },
  },
  {
    name: "disabled",
    props: {
      ...base,
      lifecycle: { status: "active" },
      presentation: "disabled",
    },
  },
  {
    name: "submitted",
    props: { ...base, value: true, lifecycle: { status: "submitted" } },
  },
  {
    name: "cancelled",
    props: {
      ...base,
      lifecycle: { status: "cancelled", reason: "Choice cancelled" },
    },
  },
] as const;

/** Render a Wave 1 confirmation state with checkbox semantics. */
const renderCheckboxCli: CliRenderer<CheckboxCliProps> = (
  props,
  capabilities,
) => {
  const state = props;
  const active = props.presentation === undefined &&
    (state.lifecycle.status === "active" ||
      state.lifecycle.status === "validation-error");
  const control = state.kind === "multiselect"
    ? renderMultiselectControl(state, active, capabilities)
    : renderConfirmControl(state, active, capabilities);
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

function checkboxMark(
  checked: boolean,
  capabilities: Parameters<CliRenderer<CheckboxCliProps>>[1],
): string {
  return checked ? capabilities.unicode ? "[✓]" : "[x]" : "[ ]";
}

function renderConfirmControl(
  state: ConfirmFrameState,
  active: boolean,
  capabilities: Parameters<CliRenderer<CheckboxCliProps>>[1],
): string {
  const pointer = active ? `${capabilities.unicode ? "›" : ">"} ` : "";
  return `${pointer}${checkboxMark(state.value, capabilities)} ${
    state.value ? state.yesLabel : state.noLabel
  }`;
}

function renderMultiselectControl(
  state: MultiselectFrameState,
  active: boolean,
  capabilities: Parameters<CliRenderer<CheckboxCliProps>>[1],
): string {
  if (
    state.options.length > 0 &&
    (state.highlightedIndex < 0 ||
      state.highlightedIndex >= state.options.length)
  ) {
    throw new TypeError(
      "multiselect state requires an in-range highlighted option",
    );
  }
  const start = state.visibleStart ?? 0;
  const count = state.visibleCount ?? state.options.length;
  if (
    !Number.isSafeInteger(start) || start < 0 || start > state.options.length
  ) {
    throw new TypeError(
      `multiselect visible start must be between 0 and ${state.options.length}; received ${start}`,
    );
  }
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new TypeError(
      `multiselect visible count must be a non-negative safe integer; received ${count}`,
    );
  }
  const choices = state.options.slice(start, start + count);
  if (choices.length === 0) return "No options.";
  return choices.map((option, offset) => {
    const index = start + offset;
    const pointer = active && index === state.highlightedIndex
      ? capabilities.unicode ? "› " : "> "
      : "  ";
    return `${pointer}${
      checkboxMark(state.selectedIds.includes(option.id), capabilities)
    } ${option.label}${option.disabled === true ? " (disabled)" : ""}`;
  }).join("\n");
}

export default renderCheckboxCli;
