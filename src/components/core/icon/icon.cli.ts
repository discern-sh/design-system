/**
 * Pure terminal renderer and deterministic example states for Icon.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { measureText, truncateText } from "../../../cli/text.ts";
import {
  type TerminalSemanticTone,
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";

/** Package glyph names available to the terminal Icon renderer. */
export type IconCliGlyph =
  | "spark"
  | "arrow"
  | "check"
  | "info"
  | "moon"
  | "close";

/** Inputs accepted by the terminal Icon renderer. */
export interface IconCliProps {
  readonly glyph: IconCliGlyph;
  readonly label?: string;
  readonly tone?: TerminalSemanticTone;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

const GLYPHS = {
  spark: { unicode: "✦", ascii: "*" },
  arrow: { unicode: "→", ascii: ">" },
  check: { unicode: "✓", ascii: "v" },
  info: { unicode: "ⓘ", ascii: "i" },
  moon: { unicode: "☾", ascii: "c" },
  close: { unicode: "×", ascii: "x" },
} as const satisfies Readonly<
  Record<IconCliGlyph, { readonly unicode: string; readonly ascii: string }>
>;

/** Deterministic Icon states rendered by `deno task catalogue:cli icon`. */
export const cliExamples: readonly CliExample<IconCliProps>[] = [
  {
    name: "spark",
    props: { glyph: "spark", label: "Generate", tone: "warning" },
  },
  { name: "arrow", props: { glyph: "arrow", label: "Continue" } },
  {
    name: "check",
    props: { glyph: "check", label: "Complete", tone: "success" },
  },
  { name: "information", props: { glyph: "info", label: "Information" } },
  { name: "moon", props: { glyph: "moon", label: "Dark theme" } },
  { name: "close", props: { glyph: "close", label: "Close", tone: "danger" } },
] as const;

/** Render one named, capability-aware terminal glyph with an optional label. */
const renderIconCli: CliRenderer<IconCliProps> = (props, capabilities) => {
  if (props.label !== undefined && /[\p{Cc}\p{Cf}]/u.test(props.label)) {
    throw new TypeError("icon label must be control-free");
  }
  const requestedWidth = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 1) {
    throw new TypeError(
      `icon width must be a positive safe integer; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  const glyphs = GLYPHS[props.glyph];
  const glyph = capabilities.unicode ? glyphs.unicode : glyphs.ascii;
  const suffix = props.label === undefined || props.label === ""
    ? ""
    : ` ${
      truncateText(
        props.label,
        Math.max(0, width - measureText(glyph) - 1),
        capabilities.unicode ? "…" : ".",
      )
    }`;
  const theme = terminalThemes[props.theme ?? "dark"];
  return styleText(
    truncateText(`${glyph}${suffix}`, width, capabilities.unicode ? "…" : "."),
    {
      ...theme.typography.strong,
      color: terminalToneColor(theme, props.tone ?? "accent"),
    },
    capabilities,
  );
};

export default renderIconCli;
