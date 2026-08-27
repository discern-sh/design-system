/**
 * Pure terminal renderer and deterministic example states for Activity log.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import { defaultTerminalFrameWidth } from "../../../cli/frame-measure.ts";
import type {
  ActivityLogFrameState,
  ActivityLogLineTone,
} from "../../../cli/interactive-states.ts";
import {
  motifPassthrough,
  type TerminalMotifOptions,
  terminalMotifRegisterRoles,
  terminalMotifRepertoire,
} from "../../../cli/motif.ts";
import {
  type NarrationLineKind,
  narrationLineRenderers,
} from "../../../cli/narration.ts";
import {
  measureText,
  truncateText,
  wrapTextPreservingIndent,
} from "../../../cli/text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import { renderMotifSpinnerFrame } from "../../../cli/motifs.ts";
import { workflowCliWidth } from "../workflow-cli.ts";
import meta, { componentExampleVocabulary } from "./activity-log.meta.ts";

/** Inputs accepted by the terminal Activity log renderer. */
export interface ActivityLogCliProps
  extends ActivityLogFrameState, TerminalMotifOptions {
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** The pinned stable severities map one-to-one onto the narration verbs. */
const stableLineKinds: Readonly<
  Record<ActivityLogLineTone, NarrationLineKind>
> = {
  success: "success",
  note: "note",
  warning: "warning",
  failure: "failure",
};

function assertStreamedLine(value: string, name: string): void {
  if (/[\p{Cc}\p{Cf}]/u.test(value)) {
    throw new TypeError(
      `${name} must be free of control and format characters`,
    );
  }
}

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      kind: "activity-log",
      label: "Running the checks",
      lifecycle: { status: "active" },
      phase: 2,
      stable: [
        { text: "Format held every file in place", tone: "success" },
        { text: "Generated surfaces are current", tone: "success" },
        { text: "One suite retried before passing", tone: "warning" },
      ],
      tail: [
        "compile step 41 of 58",
        "compile step 42 of 58",
        "    cache miss: layout graph rebuilt",
        "compile step 43 of 58",
      ],
      partial: "compile step 44 of 58 · linking",
      tailRows: 4,
      hint: "Press Ctrl+C to interrupt.",
    },
  },
  {
    name: "complete",
    props: {
      kind: "activity-log",
      label: "Running the checks",
      lifecycle: { status: "submitted" },
      phase: 0,
      stable: [
        { text: "Format held every file in place", tone: "success" },
        { text: "58 modules compiled", tone: "success" },
        { text: "Preview publishing was skipped", tone: "note" },
      ],
      tail: [],
      tailRows: 0,
    },
  },
  {
    name: "cancelled",
    props: {
      kind: "activity-log",
      label: "Running the checks",
      lifecycle: { status: "cancelled", reason: "Cancelled." },
      phase: 0,
      stable: [
        { text: "Format held every file in place", tone: "success" },
        { text: "Compilation stopped at step 44", tone: "failure" },
      ],
      tail: [],
      tailRows: 0,
    },
  },
] as const satisfies readonly CliExample<ActivityLogCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Activity log states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<ActivityLogCliProps>[] =
  cliExampleImplementations;

/**
 * Render one activity log frame: a headline naming the work, pinned
 * narration lines, a fixed-height streamed tail behind an indented muted rail
 * whose first row has an angled connector, its in-progress partial line, and
 * the unconditionally reserved footer row.
 */
const renderActivityLogCli: CliRenderer<ActivityLogCliProps> = (
  props,
  capabilities,
) => {
  if (props.label === "" || /[\p{Cc}\p{Cf}]/u.test(props.label)) {
    throw new TypeError(
      "activity log label must be non-empty and control-free",
    );
  }
  if (!Number.isSafeInteger(props.tailRows) || props.tailRows < 0) {
    throw new TypeError(
      `activity log tail rows must be a non-negative safe integer; received ${props.tailRows}`,
    );
  }
  for (const [index, line] of props.tail.entries()) {
    assertStreamedLine(line, `activity log tail line ${index + 1}`);
  }
  if (props.partial !== undefined) {
    assertStreamedLine(props.partial, "activity log partial line");
  }
  const width = workflowCliWidth(
    props.width ?? defaultTerminalFrameWidth(capabilities),
    capabilities,
  );
  const theme = terminalThemes[props.theme ?? "dark"];
  const presentation = {
    ...(props.theme === undefined ? {} : { theme: props.theme }),
    ...motifPassthrough(props),
  };
  const gap = " ".repeat(theme.spacing["--discern-space-2"] ?? 1);
  const ellipsis = capabilities.unicode ? "…" : ".";

  const marker = props.lifecycle.status === "active"
    ? renderMotifSpinnerFrame(props.phase, capabilities, presentation)
    : props.lifecycle.status === "submitted"
    ? styleText(
      terminalMotifRegisterRoles(
        terminalMotifRepertoire(props.motif, capabilities.unicode),
        props.register,
      ).marker,
      { color: terminalToneColor(theme, "accent") },
      capabilities,
    )
    : props.lifecycle.status === "cancelled"
    ? styleText(capabilities.unicode ? "×" : "x", {
      color: terminalToneColor(theme, "neutral"),
      dim: true,
    }, capabilities)
    : styleText("!", {
      color: terminalToneColor(theme, "warning"),
    }, capabilities);
  const labelWidth = Math.max(
    1,
    width - measureText(marker) - gap.length,
  );
  const headline = `${marker}${gap}${
    styleText(truncateText(props.label, labelWidth, ellipsis), {
      ...theme.typography.strong,
      color: terminalThemeColor(theme, "--discern-color-ink"),
    }, capabilities)
  }`;

  const stableRows = props.stable.map((line) =>
    narrationLineRenderers[stableLineKinds[line.tone]]({
      text: line.text,
      maxWidth: width,
      ...presentation,
    }, capabilities)
  );

  const tailRegion: string[] = [];
  if (props.tailRows > 0) {
    const connector = styleText(
      capabilities.unicode ? "└─│" : "`-|",
      theme.typography.muted,
      capabilities,
    );
    const continuation = styleText(
      capabilities.unicode ? "  │" : "  |",
      theme.typography.muted,
      capabilities,
    );
    const contentWidth = Math.max(1, width - 4);
    const contentStyle = {
      ...theme.typography.muted,
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
    } as const;
    const committed = props.tail.flatMap((line) =>
      wrapTextPreservingIndent(line, contentWidth)
    );
    const rows = props.partial === undefined
      ? committed
      : [...committed, truncateText(props.partial, contentWidth, ellipsis)];
    const visible = rows.slice(-props.tailRows);
    while (visible.length < props.tailRows) visible.push("");
    tailRegion.push(
      ...visible.map((row, index) => {
        const prefix = index === 0 ? connector : continuation;
        return row === ""
          ? prefix
          : `${prefix} ${styleText(row, contentStyle, capabilities)}`;
      }),
    );
  }

  const footer = props.lifecycle.status === "validation-error"
    ? styleText(props.lifecycle.message, {
      color: terminalToneColor(theme, "danger"),
    }, capabilities)
    : props.lifecycle.status === "cancelled"
    ? styleText(props.lifecycle.reason, {
      color: terminalToneColor(theme, "neutral"),
      dim: true,
    }, capabilities)
    : props.lifecycle.status === "active" && props.hint !== undefined &&
        props.hint !== ""
    ? styleText(
      truncateText(props.hint, width, ellipsis),
      theme.typography.muted,
      capabilities,
    )
    : "";

  return [headline, ...stableRows, ...tailRegion, footer].join("\n");
};

export default renderActivityLogCli;
