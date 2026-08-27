/**
 * Pure terminal renderer and deterministic example states for Diffstat.
 *
 * @module
 */

import { renderStyledSpans, type StyledSpan } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { measureText } from "../../../cli/text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./diffstat.meta.ts";
import { allocateDiffstatBlocks } from "./diffstat.shared.ts";

/** Inputs accepted by the terminal Diffstat renderer. */
export interface DiffstatCliProps {
  readonly added: number;
  readonly removed: number;
  readonly blocks?: number;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

const cliExampleImplementations = [
  { name: "default", props: { added: 310, removed: 204 } },
  { name: "added", props: { added: 12, removed: 0 } },
  { name: "removed", props: { added: 0, removed: 86 } },
  { name: "empty", props: { added: 0, removed: 0 } },
] as const satisfies readonly CliExample<DiffstatCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Diffstat states rendered by `deno task catalogue:cli diffstat`. */
export const cliExamples: readonly CliExample<DiffstatCliProps>[] =
  cliExampleImplementations;

/** Render signed counts beside a proportional, sign-readable terminal bar. */
const renderDiffstatCli: CliRenderer<DiffstatCliProps> = (
  props,
  capabilities,
) => {
  for (
    const [name, value] of [["added", props.added], [
      "removed",
      props.removed,
    ]] as const
  ) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new TypeError(
        `diffstat ${name} must be a non-negative safe integer; received ${value}`,
      );
    }
  }
  const requestedBlocks = props.blocks ?? 5;
  if (!Number.isSafeInteger(requestedBlocks) || requestedBlocks < 1) {
    throw new TypeError(
      `diffstat blocks must be a positive safe integer; received ${requestedBlocks}`,
    );
  }
  const requestedWidth = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 7) {
    throw new TypeError(
      `diffstat width must be a safe integer of at least 7; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  const minus = capabilities.unicode ? "−" : "-";
  const added = `+${props.added}`;
  const removed = `${minus}${props.removed}`;
  const availableBlocks = width - measureText(added) - measureText(removed) - 2;
  if (availableBlocks < 1) {
    throw new TypeError(
      `diffstat width ${width} cannot hold its signed counts`,
    );
  }
  const blocks = Math.min(requestedBlocks, availableBlocks);
  const theme = terminalThemes[props.theme ?? "dark"];
  const bar = allocateDiffstatBlocks(props.added, props.removed, blocks);
  const spans: StyledSpan[] = [
    { text: added, style: { color: terminalToneColor(theme, "success") } },
    { text: " " },
    { text: removed, style: { color: terminalToneColor(theme, "danger") } },
    { text: " " },
  ];
  for (const share of bar) {
    if (share === "added") {
      spans.push({
        text: "+",
        style: { color: terminalToneColor(theme, "success") },
      });
    } else if (share === "removed") {
      spans.push({
        text: minus,
        style: { color: terminalToneColor(theme, "danger") },
      });
    } else {
      spans.push({
        text: capabilities.unicode ? "·" : ".",
        style: {
          ...theme.typography.muted,
          color: terminalThemeColor(theme, "--discern-color-ink-faint"),
        },
      });
    }
  }
  return renderStyledSpans(spans, capabilities);
};

export default renderDiffstatCli;
