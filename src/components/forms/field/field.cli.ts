/**
 * Pure terminal renderer and deterministic example states for Field.
 *
 * @module
 */

import { defineCliExamples } from "../../../cli/component-examples.ts";
import {
  type CliExample,
  type CliPresentationOptions,
  cliPresentationPassthrough,
  type CliRenderer,
} from "../../../cli/contracts.ts";
import type {
  CompactAcknowledgementFrameState,
  FramedAcknowledgementFrameState,
  InteractiveFrameLifecycle,
} from "../../../cli/interactive-states.ts";
import {
  type FormCliPresentation,
  renderFormCliContinuation,
  renderFormCliFrame,
} from "../form-frame.ts";
import meta, { componentExampleVocabulary } from "./field.meta.ts";

/** Static presentation options shared by every Field rendering. */
interface FieldCliOptions extends CliPresentationOptions {
  readonly presentation?: FormCliPresentation;
  readonly required?: boolean;
  readonly showStatus?: boolean;
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
  | (FramedAcknowledgementFrameState & FieldCliOptions)
  | (
    & CompactAcknowledgementFrameState
    & CliPresentationOptions
    & Pick<FieldCliOptions, "width">
  );

const base = { label: "Environment", control: "staging" } as const;

const cliExampleImplementations = [
  {
    name: "default",
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
    props: {
      ...base,
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
  {
    name: "submitted",
    props: { ...base, lifecycle: { status: "submitted" } },
  },
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
] as const satisfies readonly CliExample<FieldCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Every static Field state rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<FieldCliProps>[] =
  cliExampleImplementations;

function isCompactAcknowledgement(
  props: Readonly<FieldCliProps>,
): props is Readonly<
  & CompactAcknowledgementFrameState
  & CliPresentationOptions
  & Pick<FieldCliOptions, "width">
> {
  return "kind" in props && props.kind === "acknowledgement" &&
    "presentation" in props && props.presentation === "compact";
}

/** Render a generic field, framed acknowledgement, or compact continuation. */
const renderFieldCli: CliRenderer<FieldCliProps> = (props, capabilities) => {
  if (isCompactAcknowledgement(props)) {
    return renderFormCliContinuation({
      ...cliPresentationPassthrough(props),
      lifecycle: props.lifecycle,
      hint: props.hint,
      ...(props.width === undefined ? {} : { width: props.width }),
    }, capabilities);
  }
  const framed = props as Readonly<
    FieldControlCliProps | (FramedAcknowledgementFrameState & FieldCliOptions)
  >;
  return renderFormCliFrame({
    ...cliPresentationPassthrough(framed),
    label: framed.label,
    control: "kind" in framed ? framed.message : framed.control,
    lifecycle: framed.lifecycle,
    ...(framed.hint === undefined ? {} : { hint: framed.hint }),
    ...(framed.presentation === undefined
      ? {}
      : { presentation: framed.presentation }),
    ...(framed.required === undefined ? {} : { required: framed.required }),
    ...(framed.showStatus === undefined
      ? {}
      : { showStatus: framed.showStatus }),
    ...(framed.width === undefined ? {} : { width: framed.width }),
  }, capabilities);
};

export default renderFieldCli;
