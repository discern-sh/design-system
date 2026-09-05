/** Pure terminal task-completion and waiting frames. @module */
import { styleText } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import {
  type CliExample,
  type CliPresentationOptions,
  cliPresentationPassthrough,
  type CliRenderer,
} from "../../../cli/contracts.ts";
import { defaultTerminalFrameWidth } from "../../../cli/frame-measure.ts";
import { renderMotifProgressFrame } from "../../../cli/motifs.ts";
import {
  resolveTerminalTheme,
  terminalThemeColor,
} from "../../../cli/theme.ts";
import { wrapText } from "../../../cli/text.ts";
import { resolveProgress } from "./progress.types.ts";
import type { ProgressValue } from "./progress.types.ts";
import meta, { componentExampleVocabulary } from "./progress.meta.ts";

/** Supplied task values and optional context for a deterministic terminal frame. */
export interface ProgressCliProps
  extends CliPresentationOptions, ProgressValue {
  readonly label: string;
  readonly context?: string;
  readonly width?: number;
}
const cliExampleImplementations = [
  {
    name: "default",
    props: {
      label: "Process files",
      value: 0,
      max: 8,
      context: "Files completed",
    },
  },
  {
    name: "intermediate",
    props: {
      label: "Process files",
      value: 3,
      max: 8,
      context: "Files completed",
    },
  },
  {
    name: "complete",
    props: {
      label: "Process files",
      value: 8,
      max: 8,
      context: "All files processed",
    },
  },
  {
    name: "waiting",
    props: { label: "Process files", context: "Waiting for the file list" },
  },
] as const satisfies readonly CliExample<ProgressCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);
/** Canonical terminal completion and waiting examples. */
export const cliExamples: readonly CliExample<ProgressCliProps>[] =
  cliExampleImplementations;
const renderProgressCli: CliRenderer<ProgressCliProps> = (
  props,
  capabilities,
) => {
  if (!props.label.trim()) {
    throw new TypeError("Progress needs a non-empty label");
  }
  const width = Math.min(
    props.width ?? defaultTerminalFrameWidth(capabilities),
    capabilities.columns,
  );
  if (!Number.isSafeInteger(width) || width < 8) {
    throw new TypeError("Progress width must be a safe integer of at least 8");
  }
  const state = resolveProgress(props);
  const theme = resolveTerminalTheme(props);
  const line = (text: string) => wrapText(text, width).join("\n");
  return [
    styleText(line(props.label), {
      ...theme.typography.strong,
      color: terminalThemeColor(theme, "--discern-color-ink"),
    }, capabilities),
    ...(state.value === undefined ? [] : [
      renderMotifProgressFrame({
        ...cliPresentationPassthrough(props),
        completed: state.value,
        total: state.max,
        width,
      }, capabilities),
    ]),
    styleText(
      line(state.reading.replace(" · ", " - ")),
      {
        ...theme.typography.annotation,
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      },
      capabilities,
    ),
    ...(props.context === undefined ? [] : [
      styleText(line(props.context), {
        ...theme.typography.muted,
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      }, capabilities),
    ]),
  ].join("\n");
};
export default renderProgressCli;
