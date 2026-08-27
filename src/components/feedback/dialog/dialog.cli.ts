/**
 * Pure terminal renderer and deterministic example states for Dialog.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import { renderBox } from "../../../cli/box.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./dialog.meta.ts";

/** Inputs accepted by the terminal Dialog renderer. */
export interface DialogCliProps {
  readonly title: string;
  readonly body: string;
  readonly kicker?: string;
  readonly actions?: readonly string[];
  readonly status?: "open" | "submitted" | "cancelled";
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      kicker: "Confirm",
      title: "Save changes?",
      body: "This action makes the update available.",
      actions: ["Cancel", "Save"],
    },
  },
  {
    name: "submitted",
    props: {
      title: "Changes saved",
      body: "The update is now available.",
      status: "submitted",
    },
  },
  {
    name: "cancelled",
    props: {
      title: "Save changes?",
      body: "No changes were made.",
      status: "cancelled",
    },
  },
] as const satisfies readonly CliExample<DialogCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Dialog states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<DialogCliProps>[] =
  cliExampleImplementations;

/** Render one framed terminal modal block without owning interaction. */
const renderDialogCli: CliRenderer<DialogCliProps> = (props, capabilities) => {
  if (props.title.trim() === "" || props.body.trim() === "") {
    throw new TypeError("dialog title and body must be non-empty");
  }
  const theme = terminalThemes[props.theme ?? "dark"];
  const marker = props.status === "submitted"
    ? capabilities.unicode ? "✓ Submitted" : "OK Submitted"
    : props.status === "cancelled"
    ? capabilities.unicode ? "× Cancelled" : "x Cancelled"
    : undefined;
  const statusTone = props.status === "submitted" ? "success" : "neutral";
  const actionLine = props.actions?.length
    ? props.actions.map((action) => `[${action}]`).join("  ")
    : undefined;
  const body = joinVertical([
    props.kicker === undefined
      ? ""
      : styleText(props.kicker, theme.typography.annotation, capabilities),
    props.body,
    actionLine === undefined
      ? ""
      : styleText(actionLine, theme.typography.strong, capabilities),
    marker === undefined ? "" : styleText(marker, {
      ...theme.typography.strong,
      color: terminalToneColor(theme, statusTone),
    }, capabilities),
  ], { spacing: 1 });
  return renderBox({
    body,
    title: props.title,
    width: props.width ?? Math.min(64, capabilities.columns),
    borderStyle: { color: terminalToneColor(theme, "accent") },
  }, capabilities);
};

export default renderDialogCli;
