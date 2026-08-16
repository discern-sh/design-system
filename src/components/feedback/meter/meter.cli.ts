/**
 * Pure terminal renderer and deterministic example states for Meter.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { defaultTerminalFrameWidth } from "../../../cli/frame-measure.ts";
import type { DeterminateProgressFrameState } from "../../../cli/interactive-states.ts";
import { joinVertical } from "../../../cli/layout.ts";
import {
  motifPassthrough,
  type TerminalMotifOptions,
} from "../../../cli/motif.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import { renderMotifProgressFrame } from "../../../cli/motifs.ts";
import type { MeterTone } from "./meter.types.ts";

/** Inputs accepted by the terminal Meter renderer. */
export interface MeterCliProps
  extends DeterminateProgressFrameState, TerminalMotifOptions {
  readonly reading?: string;
  readonly tone?: MeterTone;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Deterministic Meter states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<MeterCliProps>[] = [
  {
    name: "zero",
    props: {
      kind: "determinate-progress",
      label: "Upload",
      lifecycle: { status: "active" },
      completed: 0,
      total: 100,
    },
  },
  {
    name: "quarter",
    props: {
      kind: "determinate-progress",
      label: "Upload",
      lifecycle: { status: "active" },
      completed: 25,
      total: 100,
      reading: "25 / 100 files",
    },
  },
  {
    name: "complete",
    props: {
      kind: "determinate-progress",
      label: "Upload",
      lifecycle: { status: "submitted" },
      completed: 100,
      total: 100,
    },
  },
] as const;

/** Render a labeled determinate frame on the package motif track. */
const renderMeterCli: CliRenderer<MeterCliProps> = (props, capabilities) => {
  const theme = terminalThemes[props.theme ?? "dark"];
  const tone = props.tone ?? "neutral";
  const state = props;
  const width = props.width ?? defaultTerminalFrameWidth(capabilities);
  const toneLabel = tone === "neutral" ? "" : ` [${tone}]`;
  const heading = styleText(`${state.label}${toneLabel}`, {
    ...theme.typography.strong,
    color: terminalToneColor(theme, tone),
  }, capabilities);
  const progress = renderMotifProgressFrame({
    completed: state.completed,
    total: state.total,
    width,
    ...(props.theme === undefined ? {} : { theme: props.theme }),
    ...motifPassthrough(props),
  }, capabilities);
  const lifecycle = state.lifecycle.status === "validation-error"
    ? styleText(`! ${state.lifecycle.message}`, {
      color: terminalToneColor(theme, "danger"),
    }, capabilities)
    : state.lifecycle.status === "submitted"
    ? styleText(capabilities.unicode ? "✓ Complete" : "OK Complete", {
      color: terminalToneColor(theme, "success"),
      bold: true,
    }, capabilities)
    : state.lifecycle.status === "cancelled"
    ? styleText(
      `${capabilities.unicode ? "×" : "x"} ${state.lifecycle.reason}`,
      { color: terminalToneColor(theme, "neutral"), dim: true },
      capabilities,
    )
    : state.hint === undefined
    ? ""
    : styleText(state.hint, theme.typography.muted, capabilities);
  return joinVertical([
    props.reading === undefined ? heading : `${heading}  ${props.reading}`,
    progress,
    lifecycle,
  ]);
};

export default renderMeterCli;
