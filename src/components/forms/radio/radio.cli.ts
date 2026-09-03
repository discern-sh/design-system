/**
 * Pure terminal renderer and deterministic example states for Radio.
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
  SearchFrameState,
  SelectFrameState,
} from "../../../cli/interactive-states.ts";
import { isInteractiveChoice } from "../../../cli/interactive-choice.ts";
import {
  formCliChoiceFrameWidth,
  formCliEmptyResultsRow,
  type FormCliSelectionPresentation,
  insertFormCliCursor,
  renderFormCliChoiceEntry,
  renderFormCliFrame,
  renderFormCliMenuDetail,
  renderFormCliQueryChoices,
  styleFormCliSelectedMark,
  visibleFormCliChoiceEntries,
  visibleFormCliChoiceOverflow,
} from "../form-frame.ts";
import meta, { componentExampleVocabulary } from "./radio.meta.ts";

/** Inputs accepted by the terminal Radio renderer. */
interface RadioCliOptions extends CliPresentationOptions {
  readonly presentation?: FormCliSelectionPresentation;
  readonly required?: boolean;
  readonly showStatus?: boolean;
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

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      ...base,
      lifecycle: { status: "active" },
      presentation: "idle",
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
        message: "Choose a channel",
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
] as const satisfies readonly CliExample<RadioCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deliberate human Radio postures shared with the browser Catalogue. */
export const cliExamples: readonly CliExample<RadioCliProps>[] =
  cliExampleImplementations;

/** Render a Wave 1 single-selection state as a terminal radio group. */
const renderRadioCli: CliRenderer<RadioCliProps> = (props, capabilities) => {
  const state = props;
  const width = formCliChoiceFrameWidth(
    props.width,
    capabilities,
    props.presentation,
  );
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
          (options[state.highlightedIndex]?.disabled === true &&
            props.presentation !== "menu"))))
  ) {
    throw new TypeError(
      "radio state requires a selectable highlighted option, or -1 when none exist",
    );
  }
  if (
    state.kind === "search" && highlightedIndex !== undefined &&
    (highlightedIndex < 0 || highlightedIndex >= options.length ||
      !isInteractiveChoice(options[highlightedIndex]!) ||
      (options[highlightedIndex]?.disabled === true &&
        props.presentation !== "menu"))
  ) {
    throw new TypeError(
      "search state requires a selectable highlighted result",
    );
  }
  const expanded = (props.presentation === undefined ||
    props.presentation === "browsing" || props.presentation === "menu") &&
    (state.lifecycle.status === "active" ||
      state.lifecycle.status === "validation-error");
  const entries = state.kind === "select"
    ? visibleFormCliChoiceEntries(state)
    : options.map((entry, sourceIndex) => ({ entry, sourceIndex }));
  const choiceRows = entries.length === 0
    ? [formCliEmptyResultsRow(
      state.kind === "search" && state.pending === true,
      capabilities,
    )]
    : entries.map(({ entry, sourceIndex: index }) => {
      const selected = state.kind === "search"
        ? state.lifecycle.status === "submitted" &&
          index === highlightedIndex &&
          isInteractiveChoice(entry)
        : isInteractiveChoice(entry) && entry.id === state.selectedId;
      const markerGlyph = props.presentation === "menu" &&
          isInteractiveChoice(entry) && entry.disabled === true
        ? capabilities.unicode ? "×" : "x"
        : props.presentation === "menu"
        ? " "
        : capabilities.unicode
        ? selected ? "◉" : "○"
        : selected
        ? "*"
        : " ";
      const highlighted = expanded && index === highlightedIndex;
      const pointer = highlighted ? capabilities.unicode ? "› " : "> " : "  ";
      const styleOptions = {
        ...cliPresentationPassthrough(props),
        highlighted,
        disabled: isInteractiveChoice(entry) && entry.disabled === true,
      };
      const marker = props.presentation === "menu"
        ? markerGlyph
        : capabilities.unicode
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
      return renderFormCliChoiceEntry({
        ...cliPresentationPassthrough(props),
        entry,
        pointer,
        marker,
        highlighted,
        ...(props.presentation === undefined
          ? {}
          : { presentation: props.presentation }),
        ...(props.presentation === "menu" && index > 0
          ? { separateHeading: true }
          : {}),
        width,
      }, capabilities);
    });
  const menuDetail = props.presentation === "menu" && expanded &&
      choiceRows.length > 0
    ? renderFormCliMenuDetail({
      ...cliPresentationPassthrough(props),
      entries: options,
      highlightedIndex,
      ...(state.menuDetailLineLimit === undefined
        ? {}
        : { maximumLines: state.menuDetailLineLimit }),
      ...(state.kind === "search" && state.menuDetailEntries !== undefined
        ? { reserveEntries: state.menuDetailEntries }
        : {}),
      width,
    }, capabilities)
    : "";
  const choices = menuDetail === "" ? choiceRows : [...choiceRows, menuDetail];
  const control = state.kind === "search"
    ? renderFormCliQueryChoices(
      state.lifecycle.status === "submitted"
        ? state.query
        : insertFormCliCursor(
          state.query === "" ? state.placeholder ?? "" : state.query,
          state.cursor,
          capabilities,
        ),
      choices.join("\n"),
    )
    : choices.join("\n");
  return renderFormCliFrame({
    ...cliPresentationPassthrough(props),
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
    ...(props.showStatus === undefined ? {} : { showStatus: props.showStatus }),
    width,
    choiceOverflow: state.kind === "select"
      ? visibleFormCliChoiceOverflow(state)
      : state,
  }, capabilities);
};

export default renderRadioCli;
