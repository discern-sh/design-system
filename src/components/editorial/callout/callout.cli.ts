/**
 * Pure terminal renderer and deterministic example states for Callout.
 *
 * @module
 */

import { renderBox } from "../../../cli/box.ts";
import {
  type CliBlock,
  renderCliBlocks,
} from "../../../cli/block-composition.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./callout.meta.ts";
import type { CalloutTone } from "./callout.types.ts";

interface CalloutCliOptions {
  readonly eyebrow?: string;
  readonly title: string;
  readonly tone?: CalloutTone;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Inputs accepted by the terminal Callout renderer. */
export type CalloutCliProps =
  & CalloutCliOptions
  & (
    | {
      /** Legacy plain-text body retained byte-for-byte. */
      readonly body: string;
      readonly children?: never;
    }
    | {
      readonly body?: never;
      /** Rich child Components re-rendered at the Callout's inner measure. */
      readonly children: readonly CliBlock[];
    }
  );

/** Deterministic Callout states rendered by the CLI catalogue. */
export const cliExamples = defineCliExamples(
  meta,
  componentExampleVocabulary,
  [
    {
      name: "default",
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
  ] as const satisfies readonly CliExample<CalloutCliProps>[],
);

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
  const hasBody = typeof props.body === "string";
  const hasChildren = Array.isArray(props.children);
  if (hasBody === hasChildren) {
    throw new TypeError(
      "callout requires exactly one of a plain body or rich children",
    );
  }
  if (props.title.trim() === "" || (hasBody && props.body.trim() === "")) {
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
  const body = hasBody
    ? props.body
    : props.children.length === 0
    ? ""
    : renderCliBlocks(props.children, capabilities, {
      maxWidth: Math.min(width, capabilities.columns) - 4,
    });
  return renderBox({
    body,
    title,
    width,
    borderStyle: {
      ...theme.typography.strong,
      color: terminalToneColor(theme, TONE_MAP[tone]),
    },
  }, capabilities);
};

export default renderCalloutCli;
