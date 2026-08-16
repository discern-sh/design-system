/**
 * Pure terminal renderer and deterministic example states for Switch.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type { ConfirmFrameState } from "../../../cli/interactive-states.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import {
  type FormCliPresentation,
  renderFormCliFrame,
  styleFormCliChoiceText,
  styleFormCliSelectedMark,
} from "../form-frame.ts";

/** Inputs accepted by the terminal Switch renderer. */
export interface SwitchCliProps extends ConfirmFrameState {
  readonly presentation?: FormCliPresentation;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

const base = {
  kind: "confirm" as const,
  label: "Automatic updates",
  value: false,
  yesLabel: "On",
  noLabel: "Off",
};

/** Every static Switch state rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<SwitchCliProps>[] = [
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
      lifecycle: { status: "validation-error", message: "Setting is locked" },
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
      lifecycle: { status: "cancelled", reason: "Change cancelled" },
    },
  },
] as const;

/** Render a Wave 1 confirmation state with binary switch semantics. */
const renderSwitchCli: CliRenderer<SwitchCliProps> = (props, capabilities) => {
  const state = props;
  const active = props.presentation === undefined &&
    (state.lifecycle.status === "active" ||
      state.lifecycle.status === "validation-error");
  const pointer = active ? `${capabilities.unicode ? "›" : ">"} ` : "";
  const disabled = props.presentation === "disabled";
  const styleOptions = {
    disabled,
    ...(props.theme === undefined ? {} : { theme: props.theme }),
  };
  const noLabel = styleFormCliChoiceText(state.noLabel, {
    ...styleOptions,
    highlighted: !disabled && !state.value,
  }, capabilities);
  const yesLabel = styleFormCliChoiceText(state.yesLabel, {
    ...styleOptions,
    highlighted: !disabled && state.value,
  }, capabilities);
  const selected = capabilities.unicode ? "●" : "*";
  const unselected = capabilities.unicode ? "○" : "o";
  const left = styleFormCliSelectedMark(
    state.value ? unselected : selected,
    !state.value,
    styleOptions,
    capabilities,
  );
  const right = styleFormCliSelectedMark(
    state.value ? selected : unselected,
    state.value,
    styleOptions,
    capabilities,
  );
  const track = `${left}${capabilities.unicode ? "──" : "--"}${right}`;
  return renderFormCliFrame({
    label: state.label,
    control: `${pointer}${noLabel} ${track} ${yesLabel}`,
    lifecycle: state.lifecycle,
    ...(state.hint === undefined ? {} : { hint: state.hint }),
    ...(props.presentation === undefined
      ? {}
      : { presentation: props.presentation }),
    ...(props.theme === undefined ? {} : { theme: props.theme }),
    ...(props.width === undefined ? {} : { width: props.width }),
  }, capabilities);
};

export default renderSwitchCli;
