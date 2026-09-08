/**
 * Pure terminal renderer and deterministic example states for Select.
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
import type { SelectFrameState } from "../../../cli/interactive-states.ts";
import { isInteractiveChoice } from "../../../cli/interactive-choice.ts";
import {
  formCliChoiceFrameWidth,
  type FormCliSelectionPresentation,
  renderFormCliChoiceEntry,
  renderFormCliChoiceSummary,
  renderFormCliFrame,
  renderFormCliMenuDetail,
  styleFormCliSelectedMark,
  visibleFormCliChoiceEntries,
  visibleFormCliChoiceOverflow,
} from "../form-frame.ts";
import meta, { componentExampleVocabulary } from "./select.meta.ts";

/** Inputs accepted by the terminal Select renderer. */
export interface SelectCliProps
  extends SelectFrameState, CliPresentationOptions {
  readonly presentation?: FormCliSelectionPresentation;
  /** Omit surrounding label, border, hint, and overflow footer inside an owned region. */
  readonly chrome?: "frame" | "none";
  /** Whether to draw keyboard focus; selection and status retain their own styling. */
  readonly focused?: boolean;
  /** Optional bounded label height when a parent owns scrolling; the final line is ellipsized. */
  readonly maximumLabelLines?: number;
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly showStatus?: boolean;
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

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      ...base,
      lifecycle: { status: "active" },
      presentation: "idle",
      placeholder: "Choose an environment",
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
    name: "active",
    props: {
      ...base,
      highlightedIndex: 1,
      lifecycle: { status: "active" },
    },
  },
  {
    name: "menu",
    props: {
      ...base,
      label: "Next step",
      lifecycle: { status: "active" },
      presentation: "menu",
      options: [
        {
          id: "read",
          label: "Read the guide",
          description: "Open a bounded reading region.",
        },
        {
          id: "sample",
          label: "Run sample",
          indicator: { content: "+", tone: "success" },
          status: { content: "Ready", tone: "success" },
          description: "Borrow the terminal and return to the same place.",
        },
        {
          id: "export",
          label: "Export sample",
          disabled: true,
          description: "Unavailable in this demonstration.",
        },
      ],
      highlightedIndex: 1,
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
      placeholder: "Choose an environment",
    },
  },
] as const satisfies readonly CliExample<SelectCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deliberate human Select postures shared with the browser Catalogue. */
export const cliExamples: readonly CliExample<SelectCliProps>[] =
  cliExampleImplementations;

/** Render a Wave 1 single-selection state as a collapsed or expanded terminal Select. */
const renderSelectCli: CliRenderer<SelectCliProps> = (props, capabilities) => {
  const state = props;
  const width = formCliChoiceFrameWidth(
    props.width ?? (props.chrome === "none" ? capabilities.columns : undefined),
    capabilities,
    props.presentation,
  );
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
        (highlighted.disabled === true && props.presentation !== "menu")))
  ) {
    throw new TypeError(
      "select state requires a focusable highlighted option, or -1 when none exist",
    );
  }
  const expanded = (props.presentation === undefined ||
    props.presentation === "browsing" || props.presentation === "menu") &&
    (state.lifecycle.status === "active" ||
      state.lifecycle.status === "validation-error");
  const selectedEntry = state.options.find((entry) =>
    isInteractiveChoice(entry) && entry.id === state.selectedId
  );
  const selected = selectedEntry !== undefined &&
      isInteractiveChoice(selectedEntry)
    ? selectedEntry
    : undefined;
  const control = expanded
    ? (() => {
      const rows = visibleFormCliChoiceEntries(state).map(
        ({ entry, sourceIndex }) => {
          const absoluteIndex = sourceIndex;
          const isHighlighted = props.focused !== false &&
            absoluteIndex === state.highlightedIndex;
          const pointer = isHighlighted
            ? `${capabilities.unicode ? "›" : ">"} `
            : "  ";
          const selected = isInteractiveChoice(entry) &&
            entry.id === state.selectedId;
          const mark = props.presentation === "menu" &&
              isInteractiveChoice(entry) && entry.disabled === true
            ? capabilities.unicode ? "×" : "x"
            : selected
            ? capabilities.unicode ? "●" : "*"
            : " ";
          const styleOptions = {
            ...cliPresentationPassthrough(props),
            highlighted: isHighlighted,
            disabled: isInteractiveChoice(entry) && entry.disabled === true,
          };
          const marker = props.presentation === "menu"
            ? mark
            : `[${
              styleFormCliSelectedMark(
                mark,
                selected,
                styleOptions,
                capabilities,
              )
            }]`;
          return renderFormCliChoiceEntry({
            ...cliPresentationPassthrough(props),
            entry,
            ...(props.maximumLabelLines === undefined
              ? {}
              : { maximumLabelLines: props.maximumLabelLines }),
            ...(props.chrome === "none" ? { contentWidth: width } : {}),
            pointer,
            marker,
            highlighted: isHighlighted,
            ...(props.presentation === undefined
              ? {}
              : { presentation: props.presentation }),
            ...(props.presentation === "menu" && sourceIndex > 0
              ? { separateHeading: true }
              : {}),
            width,
          }, capabilities);
        },
      );
      const choices = rows.join("\n");
      if (
        props.presentation !== "menu" || state.menuDetailLineLimit === 0
      ) return choices;
      const detail = renderFormCliMenuDetail({
        ...cliPresentationPassthrough(props),
        entries: state.options,
        ...(props.chrome === "none" ? { contentWidth: width } : {}),
        highlightedIndex: state.highlightedIndex,
        ...(state.menuDetailLineLimit === undefined
          ? {}
          : { maximumLines: state.menuDetailLineLimit }),
        width,
      }, capabilities);
      return detail === "" ? choices : `${choices}\n${detail}`;
    })()
    : selected === undefined
    ? `${props.placeholder ?? "Choose an option"} ${
      capabilities.unicode ? "⌄" : "v"
    }`
    : renderFormCliChoiceSummary(
      selected,
      capabilities.unicode ? "⌄" : "v",
      {
        ...cliPresentationPassthrough(props),
        width,
      },
      capabilities,
    );
  if (props.chrome === "none") return control;
  return renderFormCliFrame({
    ...cliPresentationPassthrough(props),
    label: state.label,
    control,
    lifecycle: state.lifecycle,
    ...(state.hint === undefined ? {} : { hint: state.hint }),
    ...(props.presentation === undefined
      ? {}
      : { presentation: props.presentation }),
    ...(props.required === undefined ? {} : { required: props.required }),
    ...(props.showStatus === undefined ? {} : { showStatus: props.showStatus }),
    width,
    ...(expanded
      ? { choiceOverflow: visibleFormCliChoiceOverflow(state) }
      : {}),
  }, capabilities);
};

export default renderSelectCli;
