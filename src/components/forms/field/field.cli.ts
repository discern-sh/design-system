/**
 * Pure terminal renderer and deterministic example states for Field.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type {
  AcknowledgementFrameState,
  InteractiveFrameLifecycle,
} from "../../../cli/interactive-states.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import { type FormCliPresentation, renderFormCliFrame } from "../form-frame.ts";

/** Static presentation options shared by every Field rendering. */
interface FieldCliOptions {
  readonly presentation?: FormCliPresentation;
  readonly required?: boolean;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Direct labeled-control inputs rendered by the terminal Field shell. */
export interface FieldControlCliProps extends FieldCliOptions {
  readonly label: string;
  readonly control: string;
  readonly lifecycle: InteractiveFrameLifecycle;
  readonly hint?: string;
}

/** Inputs accepted by the terminal Field renderer. */
export type FieldCliProps =
  | FieldControlCliProps
  | (AcknowledgementFrameState & FieldCliOptions);

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
  {
    name: "acknowledgement",
    props: {
      kind: "acknowledgement",
      label: "Heads up",
      lifecycle: { status: "active" },
      message: "Review the summary above.",
      hint: "Press Enter to continue.",
    },
  },
] as const;

/** Render a generic labeled control or acknowledgement with full lifecycle messaging. */
const renderFieldCli: CliRenderer<FieldCliProps> = (props, capabilities) =>
  renderFormCliFrame({
    label: props.label,
    control: "kind" in props ? props.message : props.control,
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
