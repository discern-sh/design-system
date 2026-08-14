/**
 * Pure terminal renderer and deterministic example states for Radio.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type {
  SearchFrameState,
  SelectFrameState,
} from "../../../cli/interactive-states.ts";
import {
  isInteractiveChoice,
  isInteractiveChoiceGroupHeading,
} from "../../../cli/interactive-choice.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import {
  formCliEmptyResultsRow,
  type FormCliPresentation,
  insertFormCliCursor,
  renderFormCliChoiceHeading,
  renderFormCliFrame,
  styleFormCliChoiceText,
  styleFormCliSelectedMark,
  visibleFormCliChoiceEntries,
} from "../form-frame.ts";

/** Inputs accepted by the terminal Radio renderer. */
interface RadioCliOptions {
  readonly presentation?: FormCliPresentation;
  readonly required?: boolean;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Inputs accepted by the terminal Radio renderer. */
export type RadioCliProps =
  & (SelectFrameState | SearchFrameState)
  & RadioCliOptions;

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
  {
    name: "grouped",
    props: {
      ...base,
      options: [
        { kind: "group-heading", id: "stable", label: "Stable" },
        { id: "alpha", label: "Alpha" },
        { id: "bravo", label: "Bravo" },
        { kind: "group-heading", id: "preview", label: "Preview" },
        { id: "charlie", label: "Charlie", disabled: true },
      ],
      highlightedIndex: 2,
      selectedId: "bravo",
      lifecycle: { status: "active" },
    },
  },
  {
    name: "searching",
    props: {
      kind: "search",
      label: "Channel",
      lifecycle: { status: "active" },
      query: "cha",
      cursor: 3,
      results: [],
      pending: true,
    },
  },
] as const;

/** Render a Wave 1 single-selection state as a terminal radio group. */
const renderRadioCli: CliRenderer<RadioCliProps> = (props, capabilities) => {
  const state = props;
  const options = state.kind === "search" ? state.results : state.options;
  const highlightedIndex = state.kind === "search"
    ? state.highlightedIndex
    : state.highlightedIndex;
  if (
    state.kind === "select" &&
    (!Number.isSafeInteger(state.highlightedIndex) ||
      (state.highlightedIndex === -1 &&
        options.some((entry) =>
          isInteractiveChoice(entry) && entry.disabled !== true
        )) ||
      (state.highlightedIndex !== -1 &&
        (options[state.highlightedIndex] === undefined ||
          !isInteractiveChoice(options[state.highlightedIndex]!) ||
          options[state.highlightedIndex]?.disabled === true)))
  ) {
    throw new TypeError(
      "radio state requires a selectable highlighted option, or -1 when none exist",
    );
  }
  if (
    state.kind === "search" && highlightedIndex !== undefined &&
    (highlightedIndex < 0 || highlightedIndex >= options.length ||
      !isInteractiveChoice(options[highlightedIndex]!) ||
      options[highlightedIndex]?.disabled === true)
  ) {
    throw new TypeError(
      "search state requires a selectable highlighted result",
    );
  }
  const expanded = props.presentation === undefined &&
    (state.lifecycle.status === "active" ||
      state.lifecycle.status === "validation-error");
  const entries = state.kind === "select"
    ? visibleFormCliChoiceEntries(state)
    : options.map((entry, sourceIndex) => ({ entry, sourceIndex }));
  const choices = entries.length === 0
    ? [formCliEmptyResultsRow(
      state.kind === "search" && state.pending === true,
      capabilities,
    )]
    : entries.map(({ entry, sourceIndex: index }) => {
      if (isInteractiveChoiceGroupHeading(entry)) {
        return renderFormCliChoiceHeading(
          entry,
          {
            ...(props.theme === undefined ? {} : { theme: props.theme }),
            ...(props.width === undefined ? {} : { width: props.width }),
          },
          capabilities,
        );
      }
      const option = entry;
      const selected = state.kind === "search"
        ? state.lifecycle.status === "submitted" && index === highlightedIndex
        : option.id === state.selectedId;
      const markerGlyph = capabilities.unicode
        ? selected ? "◉" : "○"
        : selected
        ? "*"
        : " ";
      const highlighted = expanded && index === highlightedIndex;
      const pointer = highlighted ? capabilities.unicode ? "› " : "> " : "  ";
      const styleOptions = {
        highlighted,
        disabled: option.disabled === true,
        ...(props.theme === undefined ? {} : { theme: props.theme }),
      };
      const marker = capabilities.unicode
        ? styleFormCliSelectedMark(
          markerGlyph,
          selected,
          styleOptions,
          capabilities,
        )
        : `(${
          styleFormCliSelectedMark(
            markerGlyph,
            selected,
            styleOptions,
            capabilities,
          )
        })`;
      const label = `${option.label}${
        option.disabled === true ? " (disabled)" : ""
      }`;
      return `${
        styleFormCliChoiceText(pointer, styleOptions, capabilities)
      }${marker} ${styleFormCliChoiceText(label, styleOptions, capabilities)}`;
    });
  const control = state.kind === "search"
    ? `${
      state.lifecycle.status === "submitted"
        ? state.query
        : insertFormCliCursor(
          state.query === "" ? state.placeholder ?? "" : state.query,
          state.cursor,
          capabilities,
        )
    }\n${choices.join("\n")}`
    : choices.join("\n");
  return renderFormCliFrame({
    label: state.label,
    control,
    lifecycle: state.lifecycle,
    ...(state.hint === undefined ? {} : { hint: state.hint }),
    ...(state.kind === "search" && state.pending === true
      ? { pending: true }
      : {}),
    ...(props.presentation === undefined
      ? {}
      : { presentation: props.presentation }),
    ...(props.required === undefined ? {} : { required: props.required }),
    ...(props.theme === undefined ? {} : { theme: props.theme }),
    ...(props.width === undefined ? {} : { width: props.width }),
  }, capabilities);
};

export default renderRadioCli;
