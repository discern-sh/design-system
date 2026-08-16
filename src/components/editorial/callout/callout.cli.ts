/**
 * Pure terminal renderer and deterministic example states for Callout.
 *
 * @module
 */

import { renderBox } from "../../../cli/box.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import type { CalloutTone } from "./callout.types.ts";

/** Inputs accepted by the terminal Callout renderer. */
export interface CalloutCliProps {
  readonly eyebrow?: string;
  readonly title: string;
  readonly body: string;
  readonly tone?: CalloutTone;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Callout states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<CalloutCliProps>[] = [
  {
    name: "insight",
    props: {
      eyebrow: "Insight",
      title: "Keep the evidence close",
      body:
        "A terminal note should interrupt the eye without interrupting the argument.",
      tone: "insight",
    },
  },
  {
    name: "warning",
    props: {
      title: "Check the boundary",
      body: "This action changes public output.",
      tone: "warning",
    },
  },
] as const;

const TONE_MAP = {
  note: "neutral",
  insight: "accent",
  warning: "warning",
  success: "success",
} as const;

/** Render one semantically toned terminal note frame. */
const renderCalloutCli: CliRenderer<CalloutCliProps> = (
  props,
  capabilities,
) => {
  if (props.title.trim() === "" || props.body.trim() === "") {
    throw new TypeError("callout title and body must be non-empty");
  }
  const width = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(width) || width < 5) {
    throw new TypeError(
      `callout width must be a safe integer of at least 5; received ${width}`,
    );
  }
  const tone = props.tone ?? "note";
  const theme = terminalThemes[props.theme ?? "dark"];
  const title = props.eyebrow === undefined
    ? props.title
    : `${props.eyebrow.toLocaleUpperCase()}: ${props.title}`;
  return renderBox({
    body: props.body,
    title,
    width,
    borderStyle: {
      ...theme.typography.strong,
      color: terminalToneColor(theme, TONE_MAP[tone]),
    },
  }, capabilities);
};

export default renderCalloutCli;
