/**
 * Pure styled-span composition and ANSI Select Graphic Rendition emission.
 *
 * @module
 */

import type { TerminalCapabilities } from "./capabilities.ts";
import {
  CSI_PATTERN,
  hyperlinkSequence,
  OSC_PATTERN,
  sgrSequence,
  styleCodes,
  validHyperlinkTarget,
} from "./styled-sequences.ts";
import type {
  TerminalColor,
  TerminalFill,
  TerminalTypeStyle,
} from "./theme.ts";

/** Visual attributes carried by one terminal text span. */
export interface TerminalTextStyle extends TerminalTypeStyle {
  readonly color?: TerminalColor;
  /**
   * A semantic colour or a surface fill. A surface fill carries no
   * 16-colour index, so at that depth the background is omitted and the
   * renderer's structural fallback stands in for it.
   */
  readonly background?: TerminalColor | TerminalFill;
  readonly underline?: true;
  readonly strikethrough?: true;
}

/** One unescaped text fragment and the style applied to that fragment. */
export interface StyledSpan {
  readonly text: string;
  readonly style?: TerminalTextStyle;
}

const ANSI_SEQUENCE = new RegExp(
  `(?:${CSI_PATTERN})|(?:${OSC_PATTERN})`,
  "gu",
);

/**
 * Whether surface fills reach the terminal at these capabilities. Truecolor
 * and ANSI 256 paint them; the 16-colour palette and colourless output
 * cannot, so renderers draw a pointer, brackets, or a box instead.
 */
export function terminalPaintsSurfaces(
  capabilities: TerminalCapabilities,
): boolean {
  return capabilities.colorDepth === "truecolor" ||
    capabilities.colorDepth === "ansi256";
}

/**
 * Remove ANSI control sequences before measuring or comparing terminal text.
 * CSI styling and complete OSC envelopes — including OSC 8 hyperlink
 * boundaries — are zero-width; a hyperlink keeps only its visible label.
 */
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
    : `${sgrSequence(codes)}${text}${sgrSequence([0])}`;
}

/**
 * Compose one terminal hyperlink from a label and URL. This is the only
 * public authority for OSC 8 hyperlinks; consumers never write the envelope
 * bytes themselves. A label can be one plain string or package-owned styled
 * spans when nested semantic text must retain more than one style.
 *
 * Emission is gated by the `hyperlinks` capability fact. When the caller
 * omits that fact, support derives from colour depth, so a stream that
 * receives SGR styling also receives ST-ended OSC 8 envelopes while an
 * unstyled stream receives the textual fallback. The fallback never loses
 * the label: it renders `label (url)`, or the label alone when the label
 * already is the URL. The optional style dresses the label through
 * {@linkcode styleText} in both modes, inside the envelope when one is
 * emitted.
 *
 * Labels must project to non-empty text free of control and format
 * characters; URLs must satisfy the package's safe non-empty ASCII URL
 * reference policy, so anything wider is percent-encoded by the caller before
 * composition. Invalid input throws a `TypeError`.
 */
export function styleHyperlink(
  label: string,
  url: string,
  capabilities: TerminalCapabilities,
  style?: TerminalTextStyle,
): string;
/** Compose a hyperlink whose label preserves multiple package-owned styles. */
export function styleHyperlink(
  label: readonly StyledSpan[],
  url: string,
  capabilities: TerminalCapabilities,
): string;
export function styleHyperlink(
  label: string | readonly StyledSpan[],
  url: string,
  capabilities: TerminalCapabilities,
  style?: TerminalTextStyle,
): string {
  const plainLabel = typeof label === "string"
    ? label
    : label.map((span) => span.text).join("");
  if (plainLabel === "" || /[\p{Cc}\p{Cf}]/u.test(plainLabel)) {
    throw new TypeError("hyperlink label must be non-empty and control-free");
  }
  if (!validHyperlinkTarget(url)) {
    throw new TypeError(
      `hyperlink url must be a safe non-empty ASCII URL reference; received ${
        JSON.stringify(url)
      }`,
    );
  }
  if (typeof label !== "string" && style !== undefined) {
    throw new TypeError(
      "a styled hyperlink label cannot also receive one aggregate style",
    );
  }
  const text = typeof label === "string"
    ? style === undefined ? label : styleText(label, style, capabilities)
    : renderStyledSpans(label, capabilities);
  if (!(capabilities.hyperlinks ?? capabilities.colorDepth !== "none")) {
    return plainLabel === url ? text : `${text} (${url})`;
  }
  return `${hyperlinkSequence(url)}${text}${hyperlinkSequence("")}`;
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
