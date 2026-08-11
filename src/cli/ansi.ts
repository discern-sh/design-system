/**
 * Pure styled-span composition and ANSI Select Graphic Rendition emission.
 *
 * @module
 */

import type { TerminalCapabilities } from "./capabilities.ts";
import type { TerminalColor, TerminalTypeStyle } from "./theme.ts";

/** Visual attributes carried by one terminal text span. */
export interface TerminalTextStyle extends TerminalTypeStyle {
  readonly color?: TerminalColor;
  readonly underline?: true;
  readonly strikethrough?: true;
}

/** One unescaped text fragment and the style applied to that fragment. */
export interface StyledSpan {
  readonly text: string;
  readonly style?: TerminalTextStyle;
}

const ESCAPE = String.fromCharCode(27);
const ANSI_SEQUENCE = new RegExp(`${ESCAPE}\\[[0-?]*[ -/]*[@-~]`, "gu");

function ansi16Foreground(index: number): number {
  return index < 8 ? 30 + index : 90 + index - 8;
}

function styleCodes(
  style: TerminalTextStyle,
  capabilities: TerminalCapabilities,
): readonly number[] {
  if (capabilities.colorDepth === "none") return [];
  const codes: number[] = [];
  if (style.bold === true) codes.push(1);
  if (style.dim === true) codes.push(2);
  if (style.italic === true) codes.push(3);
  if (style.underline === true) codes.push(4);
  if (style.strikethrough === true) codes.push(9);
  if (style.color !== undefined) {
    if (capabilities.colorDepth === "truecolor") {
      codes.push(38, 2, style.color.red, style.color.green, style.color.blue);
    } else if (capabilities.colorDepth === "ansi256") {
      codes.push(38, 5, style.color.ansi256);
    } else codes.push(ansi16Foreground(style.color.ansi16));
  }
  return codes;
}

/** Remove ANSI control sequences before measuring or comparing terminal text. */
export function stripAnsi(value: string): string {
  return value.replace(ANSI_SEQUENCE, "");
}

/** Emit one styled string for the supplied capabilities. */
export function styleText(
  text: string,
  style: TerminalTextStyle,
  capabilities: TerminalCapabilities,
): string {
  const codes = styleCodes(style, capabilities);
  return text === "" || codes.length === 0
    ? text
    : `${ESCAPE}[${codes.join(";")}m${text}${ESCAPE}[0m`;
}

/** Compose styled spans into one independently reset ANSI string. */
export function renderStyledSpans(
  spans: readonly StyledSpan[],
  capabilities: TerminalCapabilities,
): string {
  return spans.map((span) =>
    span.style === undefined
      ? span.text
      : styleText(span.text, span.style, capabilities)
  ).join("");
}
