/**
 * Pure terminal renderer and deterministic example states for Select.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type { SelectFrameState } from "../../../cli/interactive-states.ts";
import {
  isInteractiveChoice,
  isInteractiveChoiceGroupHeading,
} from "../../../cli/interactive-choice.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import {
  formCliChoiceFrameWidth,
  type FormCliPresentation,
  renderFormCliChoiceHeading,
  renderFormCliChoiceRow,
  renderFormCliFrame,
  styleFormCliSelectedMark,
  visibleFormCliChoiceEntries,
  visibleFormCliChoiceOverflow,
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
const groupedOptions = [
  { kind: "group-heading", id: "recommended", label: "Recommended" },
  { id: "alpha", label: "Alpha" },
  { id: "bravo", label: "Bravo" },
  { kind: "group-heading", id: "other", label: "Other" },
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
  {
    name: "grouped",
    props: {
      ...base,
      options: groupedOptions,
      highlightedIndex: 2,
      selectedId: "bravo",
      lifecycle: { status: "active" },
    },
  },
  {
    name: "windowed",
    props: {
      ...base,
      options: [
        {
          id: "alpha",
          label:
            "A deliberately long navigation choice whose continuation stays aligned beneath its label",
        },
        { id: "bravo", label: "Bravo" },
        { id: "charlie", label: "Charlie" },
        { id: "delta", label: "Delta" },
        { id: "echo", label: "Echo" },
      ],
      visibleStart: 0,
      visibleCount: 2,
      lifecycle: { status: "active" },
    },
  },
] as const;

/** Render a Wave 1 single-selection state as a collapsed or expanded terminal Select. */
const renderSelectCli: CliRenderer<SelectCliProps> = (props, capabilities) => {
  const state = props;
  const width = formCliChoiceFrameWidth(props.width, capabilities);
  const highlighted = state.options[state.highlightedIndex];
  const selectable = state.options.some((entry) =>
    isInteractiveChoice(entry) && entry.disabled !== true
  );
  if (
    !Number.isSafeInteger(state.highlightedIndex) ||
    (state.highlightedIndex === -1 && selectable) ||
    (state.highlightedIndex !== -1 &&
      (highlighted === undefined ||
        !isInteractiveChoice(highlighted) ||
        highlighted.disabled === true))
  ) {
    throw new TypeError(
      "select state requires a selectable highlighted option, or -1 when none exist",
    );
  }
  const expanded = props.presentation === undefined &&
    (state.lifecycle.status === "active" ||
      state.lifecycle.status === "validation-error");
  const selected = state.options.find((entry) =>
    isInteractiveChoice(entry) && entry.id === state.selectedId
  );
  const control = expanded
    ? visibleFormCliChoiceEntries(state).map(({ entry, sourceIndex }) => {
      if (isInteractiveChoiceGroupHeading(entry)) {
        return renderFormCliChoiceHeading(
          entry,
          {
            ...(props.theme === undefined ? {} : { theme: props.theme }),
            width,
          },
          capabilities,
        );
      }
      const option = entry;
      const absoluteIndex = sourceIndex;
      const isHighlighted = absoluteIndex === state.highlightedIndex;
      const pointer = isHighlighted
        ? `${capabilities.unicode ? "›" : ">"} `
        : "  ";
      const selected = option.id === state.selectedId;
      const mark = selected ? capabilities.unicode ? "●" : "*" : " ";
      const styleOptions = {
        highlighted: isHighlighted,
        disabled: option.disabled === true,
        ...(props.theme === undefined ? {} : { theme: props.theme }),
      };
      const label = `${option.label}${
        option.disabled === true ? " (disabled)" : ""
      }`;
      const marker = `[${
        styleFormCliSelectedMark(
          mark,
          selected,
          styleOptions,
          capabilities,
        )
      }]`;
      return renderFormCliChoiceRow({
        pointer,
        marker,
        label,
        ...styleOptions,
        width,
      }, capabilities);
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
    width,
    ...(expanded
      ? { choiceOverflow: visibleFormCliChoiceOverflow(state) }
      : {}),
  }, capabilities);
};

export default renderSelectCli;
