/**
 * Pure terminal renderer and deterministic example states for Field.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type { InteractiveFrameLifecycle } from "../../../cli/interactive-states.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import { type FormCliPresentation, renderFormCliFrame } from "../form-frame.ts";

/** Inputs accepted by the terminal Field renderer. */
export interface FieldCliProps {
  readonly label: string;
  readonly control: string;
  readonly lifecycle: InteractiveFrameLifecycle;
  readonly hint?: string;
  readonly presentation?: FormCliPresentation;
  readonly required?: boolean;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

const base = { label: "Environment", control: "staging" } as const;

/** Every static Field state rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<FieldCliProps>[] = [
  {
    name: "idle",
    props: {
      ...base,
      control: "Choose a value",
      lifecycle: { status: "active" },
      presentation: "idle",
    },
  },
  {
    name: "active",
    props: {
      ...base,
      lifecycle: { status: "active" },
      hint: "Use a configured environment",
    },
  },
  {
    name: "filled",
    props: { ...base, lifecycle: { status: "active" }, presentation: "filled" },
  },
  {
    name: "validation-error",
    props: {
      ...base,
      lifecycle: {
        status: "validation-error",
        message: "Environment is unavailable",
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
  { name: "submitted", props: { ...base, lifecycle: { status: "submitted" } } },
  {
    name: "cancelled",
    props: {
      ...base,
      lifecycle: { status: "cancelled", reason: "Selection cancelled" },
    },
  },
] as const;

/** Render a generic labeled form control with complete lifecycle messaging. */
const renderFieldCli: CliRenderer<FieldCliProps> = (props, capabilities) =>
  renderFormCliFrame({
    label: props.label,
    control: props.control,
    lifecycle: props.lifecycle,
    ...(props.hint === undefined ? {} : { hint: props.hint }),
    ...(props.presentation === undefined
      ? {}
      : { presentation: props.presentation }),
    ...(props.required === undefined ? {} : { required: props.required }),
    ...(props.theme === undefined ? {} : { theme: props.theme }),
    ...(props.width === undefined ? {} : { width: props.width }),
  }, capabilities);

export default renderFieldCli;
