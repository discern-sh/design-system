/**
 * Pure terminal renderer and deterministic example states for Checkbox.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type {
  ConfirmFrameState,
  MultiselectFrameState,
  SearchMultiselectFrameState,
} from "../../../cli/interactive-states.ts";
import {
  isInteractiveChoice,
  isInteractiveChoiceGroupHeading,
} from "../../../cli/interactive-choice.ts";
import {
  motifPassthrough,
  type TerminalMotifOptions,
} from "../../../cli/motif.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import {
  formCliChoiceFrameWidth,
  formCliEmptyResultsRow,
  type FormCliPresentation,
  insertFormCliCursor,
  renderFormCliChoiceEntry,
  renderFormCliFrame,
  renderFormCliQueryChoices,
  styleFormCliSelectedMark,
  visibleFormCliChoiceEntries,
  visibleFormCliChoiceOverflow,
} from "../form-frame.ts";

/** Inputs accepted by the terminal Checkbox renderer. */
interface CheckboxCliOptions extends TerminalMotifOptions {
  readonly presentation?: FormCliPresentation;
  readonly required?: boolean;
  readonly showStatus?: boolean;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Inputs accepted by the terminal Checkbox renderer. */
export type CheckboxCliProps =
  & (ConfirmFrameState | MultiselectFrameState | SearchMultiselectFrameState)
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
  {
    name: "grouped",
    props: {
      kind: "multiselect",
      label: "Capabilities",
      lifecycle: { status: "active" },
      options: [
        { kind: "group-heading", id: "core", label: "Core" },
        { id: "render", label: "Render frames" },
        { id: "inspect", label: "Inspect output", disabled: true },
        { kind: "group-heading", id: "optional", label: "Optional" },
        { id: "animate", label: "Animate progress" },
      ],
      highlightedIndex: 1,
      selectedIds: ["render"],
    },
  },
  {
    name: "search-filtered",
    props: {
      kind: "search-multiselect",
      label: "Roles",
      lifecycle: { status: "active" },
      query: "re",
      cursor: 2,
      results: [
        { id: "render", label: "Render frames" },
        { id: "inspect", label: "Inspect", disabled: true },
        { kind: "group-heading", id: "selected", label: "Selected" },
        { id: "animate", label: "Animate progress" },
      ],
      selectedIds: ["render", "animate"],
      highlightedIndex: 0,
    },
  },
  {
    name: "windowed",
    props: {
      kind: "multiselect",
      label: "Capabilities",
      lifecycle: { status: "active" },
      options: [
        { id: "render", label: "Render" },
        { id: "inspect", label: "Inspect" },
        { id: "animate", label: "Animate" },
        { id: "export", label: "Export" },
        { id: "publish", label: "Publish" },
      ],
      highlightedIndex: 0,
      selectedIds: [],
      visibleStart: 0,
      visibleCount: 2,
    },
  },
] as const;

/** Render a Wave 1 confirmation state with checkbox semantics. */
const renderCheckboxCli: CliRenderer<CheckboxCliProps> = (
  props,
  capabilities,
) => {
  const state = props;
  const active = (props.presentation === undefined ||
    props.presentation === "browsing") &&
    (state.lifecycle.status === "active" ||
      state.lifecycle.status === "validation-error");
  const choiceWidth = formCliChoiceFrameWidth(props.width, capabilities);
  const control = state.kind === "multiselect"
    ? renderMultiselectControl(state, active, choiceWidth, capabilities)
    : state.kind === "search-multiselect"
    ? renderSearchMultiselectControl(state, active, choiceWidth, capabilities)
    : renderConfirmControl(state, active, capabilities);
  return renderFormCliFrame({
    label: state.label,
    control,
    lifecycle: state.lifecycle,
    ...(state.hint === undefined ? {} : { hint: state.hint }),
    ...(state.kind === "search-multiselect" && state.pending === true
      ? { pending: true }
      : {}),
    ...(props.presentation === undefined
      ? {}
      : { presentation: props.presentation }),
    ...(props.required === undefined ? {} : { required: props.required }),
    ...(props.showStatus === undefined ? {} : { showStatus: props.showStatus }),
    ...(props.theme === undefined ? {} : { theme: props.theme }),
    ...(state.kind === "confirm"
      ? props.width === undefined ? {} : { width: props.width }
      : { width: choiceWidth }),
    ...(state.kind === "multiselect"
      ? { choiceOverflow: visibleFormCliChoiceOverflow(state) }
      : state.kind === "search-multiselect"
      ? { choiceOverflow: state }
      : {}),
  }, capabilities);
};

function checkboxMark(
  checked: boolean,
  capabilities: Parameters<CliRenderer<CheckboxCliProps>>[1],
  options: {
    readonly disabled?: boolean;
    readonly theme?: TerminalThemeVariant;
  } = {},
): string {
  const mark = checked ? capabilities.unicode ? "✓" : "x" : " ";
  return `[${styleFormCliSelectedMark(mark, checked, options, capabilities)}]`;
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
  state: MultiselectFrameState & CheckboxCliOptions,
  active: boolean,
  width: number,
  capabilities: Parameters<CliRenderer<CheckboxCliProps>>[1],
): string {
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
      "multiselect state requires a selectable highlighted option, or -1 when none exist",
    );
  }
  const headingIds = new Set(
    state.options.filter(isInteractiveChoiceGroupHeading).map(({ id }) => id),
  );
  if (state.selectedIds.some((id) => headingIds.has(id))) {
    throw new TypeError(
      "multiselect selected ids cannot include a choice group heading",
    );
  }
  const entries = visibleFormCliChoiceEntries(state);
  if (entries.length === 0) return "No options.";
  return entries.map(({ entry, sourceIndex }) => {
    const index = sourceIndex;
    const highlighted = active && index === state.highlightedIndex;
    const pointer = highlighted ? capabilities.unicode ? "› " : "> " : "  ";
    const styleOptions = {
      highlighted,
      disabled: isInteractiveChoice(entry) && entry.disabled === true,
      ...(state.theme === undefined ? {} : { theme: state.theme }),
    };
    return renderFormCliChoiceEntry({
      entry,
      pointer,
      marker: checkboxMark(
        state.selectedIds.includes(entry.id),
        capabilities,
        styleOptions,
      ),
      highlighted,
      ...(state.theme === undefined ? {} : { theme: state.theme }),
      ...motifPassthrough(state),
      width,
    }, capabilities);
  }).join("\n");
}

function renderSearchMultiselectControl(
  state: SearchMultiselectFrameState & CheckboxCliOptions,
  active: boolean,
  width: number,
  capabilities: Parameters<CliRenderer<CheckboxCliProps>>[1],
): string {
  const entries = state.results;
  if (
    state.highlightedIndex !== undefined &&
    (!Number.isSafeInteger(state.highlightedIndex) ||
      state.highlightedIndex < 0 ||
      state.highlightedIndex >= entries.length ||
      !isInteractiveChoice(entries[state.highlightedIndex]!) ||
      entries[state.highlightedIndex]?.disabled === true)
  ) {
    throw new TypeError(
      "search multiselect state requires a selectable highlighted result",
    );
  }
  const headingIds = new Set(
    entries.filter(isInteractiveChoiceGroupHeading).map(({ id }) => id),
  );
  if (state.selectedIds.some((id) => headingIds.has(id))) {
    throw new TypeError(
      "multiselect selected ids cannot include a choice group heading",
    );
  }
  const rows = entries.length === 0
    ? [formCliEmptyResultsRow(state.pending === true, capabilities)]
    : entries.map((entry, index) => {
      const highlighted = active && index === state.highlightedIndex;
      const pointer = highlighted ? capabilities.unicode ? "› " : "> " : "  ";
      const styleOptions = {
        highlighted,
        disabled: entry.disabled === true,
        ...(state.theme === undefined ? {} : { theme: state.theme }),
      };
      return renderFormCliChoiceEntry({
        entry,
        pointer,
        marker: checkboxMark(
          state.selectedIds.includes(entry.id),
          capabilities,
          styleOptions,
        ),
        highlighted,
        ...(state.theme === undefined ? {} : { theme: state.theme }),
        ...motifPassthrough(state),
        width,
      }, capabilities);
    });
  const query = state.lifecycle.status === "submitted"
    ? state.query
    : insertFormCliCursor(
      state.query === "" ? state.placeholder ?? "" : state.query,
      state.cursor,
      capabilities,
    );
  return renderFormCliQueryChoices(query, rows.join("\n"));
}

export default renderCheckboxCli;
