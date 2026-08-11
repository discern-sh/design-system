/**
 * Pure terminal renderer and deterministic example states for Checkbox.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type { ConfirmFrameState } from "../../../cli/interactive-states.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import { type FormCliPresentation, renderFormCliFrame } from "../form-frame.ts";

/** Inputs accepted by the terminal Checkbox renderer. */
export interface CheckboxCliProps extends ConfirmFrameState {
  readonly presentation?: FormCliPresentation;
  readonly required?: boolean;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

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
  const checked = state.value ? capabilities.unicode ? "[✓]" : "[x]" : "[ ]";
  const active = props.presentation === undefined &&
    (state.lifecycle.status === "active" ||
      state.lifecycle.status === "validation-error");
  const pointer = active ? `${capabilities.unicode ? "›" : ">"} ` : "";
  return renderFormCliFrame({
    label: state.label,
    control: `${pointer}${checked} ${
      state.value ? state.yesLabel : state.noLabel
    }`,
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

export default renderCheckboxCli;
