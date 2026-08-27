/**
 * Pure terminal renderer and deterministic example states for Kbd.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { truncateText } from "../../../cli/text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
} from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./kbd.meta.ts";

/** Inputs accepted by the terminal Kbd renderer. */
export interface KbdCliProps {
  readonly label: string;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Kbd states rendered by the CLI catalogue. */
export const cliExamples = defineCliExamples(
  meta,
  componentExampleVocabulary,
  [
    { name: "default", props: { label: "Enter" } },
    { name: "key-chord", props: { label: "Ctrl+Shift+P" } },
  ] as const satisfies readonly CliExample<KbdCliProps>[],
);

/** Render one compact terminal keycap chip. */
const renderKbdCli: CliRenderer<KbdCliProps> = (props, capabilities) => {
  if (props.label.trim() === "" || /[\p{Cc}\p{Cf}]/u.test(props.label)) {
    throw new TypeError("kbd label must be non-empty and control-free");
  }
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 5) {
    throw new TypeError(
      `kbd width must be a safe integer of at least 5; received ${requested}`,
    );
  }
  const width = Math.min(requested, capabilities.columns);
  const label = truncateText(
    props.label,
    width - 4,
    capabilities.unicode ? "…" : ".",
  );
  const theme = terminalThemes[props.theme ?? "dark"];
  return styleText(`[ ${label} ]`, {
    ...theme.typography.strong,
    color: terminalThemeColor(theme, "--discern-color-ink"),
  }, capabilities);
};

export default renderKbdCli;
