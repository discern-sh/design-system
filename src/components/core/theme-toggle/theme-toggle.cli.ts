/**
 * Pure terminal renderer and deterministic example states for Theme toggle.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import {
  type CliExample,
  type CliPresentationOptions,
  cliPresentationPassthrough,
  type CliRenderer,
} from "../../../cli/contracts.ts";
import { measureText, truncateText } from "../../../cli/text.ts";
import {
  resolveTerminalTheme,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./theme-toggle.meta.ts";
import type {
  ThemeToggleTheme,
  ThemeToggleVariant,
} from "./theme-toggle.types.ts";

/** Inputs accepted by the terminal Theme toggle renderer. */
export interface ThemeToggleCliProps
  extends Omit<CliPresentationOptions, "theme"> {
  readonly theme: ThemeToggleTheme;
  readonly toLightLabel?: string;
  readonly toDarkLabel?: string;
  readonly variant?: ThemeToggleVariant;
  readonly palette?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

const cliExampleImplementations = [
  { name: "default", props: { theme: "light" } },
  { name: "quiet", props: { theme: "dark", variant: "quiet" } },
  { name: "from-dark", props: { theme: "dark" } },
] as const satisfies readonly CliExample<ThemeToggleCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Theme toggle states rendered by `deno task catalogue:cli theme-toggle`. */
export const cliExamples: readonly CliExample<ThemeToggleCliProps>[] =
  cliExampleImplementations;

/** Render the Theme toggle's destination action without owning terminal input. */
const renderThemeToggleCli: CliRenderer<ThemeToggleCliProps> = (
  props,
  capabilities,
) => {
  const label = props.theme === "dark"
    ? props.toLightLabel ?? "Switch to the light theme"
    : props.toDarkLabel ?? "Switch to the dark theme";
  if (label === "" || /[\p{Cc}\p{Cf}]/u.test(label)) {
    throw new TypeError(
      "theme toggle label must be non-empty and control-free",
    );
  }
  const requestedWidth = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 3) {
    throw new TypeError(
      `theme toggle width must be a safe integer of at least 3; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  const glyph = props.theme === "dark"
    ? capabilities.unicode ? "☀" : "*"
    : capabilities.unicode
    ? "☾"
    : "o";
  const outlined = (props.variant ?? "outlined") === "outlined";
  const fixedWidth = measureText(glyph) + 1 + (outlined ? 4 : 0);
  const text = truncateText(
    label,
    Math.max(1, width - fixedWidth),
    capabilities.unicode ? "…" : ".",
  );
  const frame = outlined ? `[ ${glyph} ${text} ]` : `${glyph} ${text}`;
  const theme = resolveTerminalTheme({
    ...cliPresentationPassthrough(props),
    theme: props.palette ?? props.theme,
  });
  return styleText(
    frame,
    {
      ...theme.typography.strong,
      color: terminalToneColor(theme, "accent"),
    },
    capabilities,
  );
};

export default renderThemeToggleCli;
