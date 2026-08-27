/**
 * Pure terminal renderer and deterministic example states for Switch.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type { ConfirmFrameState } from "../../../cli/interactive-states.ts";
import { measureText, truncateText } from "../../../cli/text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import {
  formCliControlWidth,
  type FormCliPresentation,
  renderFormCliFrame,
  styleFormCliChoiceText,
  styleFormCliSelectedMark,
} from "../form-frame.ts";
import meta, { componentExampleVocabulary } from "./switch.meta.ts";

/** Inputs accepted by the terminal Switch renderer. */
export interface SwitchCliProps
  extends Omit<ConfirmFrameState, "yesLabel" | "noLabel"> {
  /** Optional label shown on the off side of the track. */
  readonly noLabel?: string;
  /** Optional label shown on the on side of the track. */
  readonly yesLabel?: string;
  readonly presentation?: FormCliPresentation;
  readonly showStatus?: boolean;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

const base = {
  kind: "confirm" as const,
  label: "Automatic updates",
  value: false,
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
        message: "Setting is locked",
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
      lifecycle: { status: "cancelled", reason: "Change cancelled" },
    },
  },
] as const satisfies readonly CliExample<SwitchCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Every static Switch state rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<SwitchCliProps>[] =
  cliExampleImplementations;

/** Render a Wave 1 confirmation state with binary switch semantics. */
const renderSwitchCli: CliRenderer<SwitchCliProps> = (props, capabilities) => {
  const state = props;
  const active = props.presentation === undefined &&
    (state.lifecycle.status === "active" ||
      state.lifecycle.status === "validation-error");
  const controlWidth = formCliControlWidth(props.width, capabilities);
  const pointer = active && controlWidth >= 8
    ? `${capabilities.unicode ? "›" : ">"} `
    : "";
  const disabled = props.presentation === "disabled";
  const theme = terminalThemes[props.theme ?? "dark"];
  const styleOptions = {
    disabled,
    ...(props.theme === undefined ? {} : { theme: props.theme }),
  };
  const availableWidth = controlWidth - measureText(pointer);
  const rawNoLabel = state.noLabel ?? "";
  const rawYesLabel = state.yesLabel ?? "";
  const rawNoWidth = measureText(rawNoLabel);
  const rawYesWidth = measureText(rawYesLabel);
  const labelled = rawNoWidth > 0 || rawYesWidth > 0;
  const bareStructureWidth = 8;
  const fullStructureWidth = 10;
  const compactStructureWidth = 9;
  let visibleNoLabel = rawNoLabel;
  let visibleYesLabel = rawYesLabel;
  const compact = labelled && availableWidth <
      rawNoWidth + rawYesWidth + fullStructureWidth;
  if (compact && availableWidth >= compactStructureWidth) {
    const labelBudget = availableWidth - compactStructureWidth;
    let noWidth = Math.min(rawNoWidth, Math.ceil(labelBudget / 2));
    let yesWidth = Math.min(rawYesWidth, labelBudget - noWidth);
    noWidth += Math.min(rawNoWidth - noWidth, labelBudget - noWidth - yesWidth);
    yesWidth += Math.min(
      rawYesWidth - yesWidth,
      labelBudget - noWidth - yesWidth,
    );
    visibleNoLabel = noWidth === 0
      ? ""
      : truncateText(rawNoLabel, noWidth, capabilities.unicode ? "…" : ".");
    visibleYesLabel = yesWidth === 0 ? "" : truncateText(
      rawYesLabel,
      yesWidth,
      capabilities.unicode ? "…" : ".",
    );
  }
  const noLabel = styleFormCliChoiceText(visibleNoLabel, {
    ...styleOptions,
    highlighted: !disabled && !state.value,
  }, capabilities);
  const yesLabel = styleFormCliChoiceText(visibleYesLabel, {
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
  const indicatorStyle = disabled
    ? {
      ...theme.typography.muted,
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
    }
    : {
      color: terminalToneColor(theme, state.value ? "success" : "danger"),
    };
  const activeIndicator = styleText(
    capabilities.unicode
      ? (state.value ? "✓" : "×")
      : (state.value ? "+" : "x"),
    indicatorStyle,
    capabilities,
  );
  const leftIndicator = state.value ? " " : activeIndicator;
  const rightIndicator = state.value ? activeIndicator : " ";
  const control = !labelled
    ? availableWidth < bareStructureWidth
      ? state.value ? `${track} ${rightIndicator}` : `${leftIndicator} ${track}`
      : state.value
      ? `  ${track} ${rightIndicator}`
      : `${leftIndicator} ${track}  `
    : availableWidth < compactStructureWidth
    ? state.value ? `${track} ${rightIndicator}` : `${leftIndicator} ${track}`
    : compact
    ? `${noLabel} ${leftIndicator} ${track} ${rightIndicator}${yesLabel}`
    : `${noLabel} ${leftIndicator} ${track} ${rightIndicator} ${yesLabel}`;
  return renderFormCliFrame({
    label: state.label,
    control: `${pointer}${control}`,
    lifecycle: state.lifecycle,
    ...(state.hint === undefined ? {} : { hint: state.hint }),
    ...(props.presentation === undefined
      ? {}
      : { presentation: props.presentation }),
    ...(props.showStatus === undefined ? {} : { showStatus: props.showStatus }),
    ...(props.theme === undefined ? {} : { theme: props.theme }),
    ...(props.width === undefined ? {} : { width: props.width }),
  }, capabilities);
};

export default renderSwitchCli;
