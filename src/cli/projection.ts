/**
 * Terminal output projection: a pure decode of the package's emitted terminal
 * repertoire into typed spans, and a renderer from those spans to
 * self-contained HTML that a reviewer can read in a browser.
 *
 * The decode derives from the package's internal styled-sequence authority —
 * the same byte grammar the emitters compose with — so the supported input is
 * exactly what this package's CLI renderers emit: plain text with newlines
 * and tabs, the emitted SGR subset (bold, dim, italic, underline,
 * strikethrough, and 16-, 256-, and truecolour foregrounds), and complete
 * ST-ended OSC 8 hyperlink envelopes. The projection is not a terminal
 * emulator: cursor movement, erasure, and every other control sequence found
 * in captured interactive sessions are rejected with
 * {@linkcode TerminalProjectionError} rather than silently passed through, so
 * foreign byte streams surface as defects instead of leaking raw controls
 * into a review artifact.
 *
 * @module
 */

import {
  ANSI_16_RGB,
  ANSI_256_RGB,
  type TerminalRgbColor,
} from "./ansi-palette.ts";
import { parseStyledSource, type StyledSegment } from "./styled-sequences.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
} from "./theme.ts";

/** Raised when projection input leaves the package's emitted repertoire. */
export class TerminalProjectionError extends TypeError {
  override readonly name = "TerminalProjectionError";
}

/** Visual attributes decoded from the styling active over one span. */
export interface TerminalSpanStyle {
  readonly bold?: true;
  readonly dim?: true;
  readonly italic?: true;
  readonly underline?: true;
  readonly strikethrough?: true;
  /** Foreground colour, resolved to sRGB through the reference palettes. */
  readonly color?: TerminalRgbColor;
}

/** One projected run of text with its decoded style and hyperlink target. */
export interface TerminalSpan {
  readonly text: string;
  readonly style?: TerminalSpanStyle;
  /** Hyperlink target of the OSC 8 envelope containing this span. */
  readonly link?: string;
}

/** Browser style declarations for one decoded span style. */
export interface TerminalSpanCss {
  readonly color?: string;
  readonly fontStyle?: string;
  readonly fontWeight?: number;
  readonly opacity?: number;
  readonly textDecorationLine?: string;
}

/** Options for {@linkcode projectTerminalHtml}. */
export interface TerminalHtmlOptions {
  /** Package terminal theme colouring the rendered shell. Defaults to dark. */
  readonly theme?: TerminalThemeVariant;
}

interface MutableSpanStyle {
  bold?: true;
  dim?: true;
  italic?: true;
  underline?: true;
  strikethrough?: true;
  color?: TerminalRgbColor;
}

function assertProjectableText(value: string): void {
  for (const character of value) {
    const code = character.codePointAt(0);
    if (
      code !== undefined &&
      (code <= 8 || (code >= 11 && code <= 31) || code === 127)
    ) {
      throw new TerminalProjectionError(
        "Terminal projection input contains an unsupported control character",
      );
    }
  }
}

function paletteColor(
  palette: readonly TerminalRgbColor[],
  index: number,
): TerminalRgbColor {
  const color = Number.isInteger(index) ? palette[index] : undefined;
  if (color === undefined) {
    throw new TerminalProjectionError(
      `Terminal projection received palette index ${index} outside the reference palette`,
    );
  }
  return color;
}

function styleFromCodes(
  codes: readonly number[],
): TerminalSpanStyle | undefined {
  if (codes.length === 0) return undefined;
  const style: MutableSpanStyle = {};
  for (let index = 0; index < codes.length; index += 1) {
    const code = codes[index];
    if (code === 1) style.bold = true;
    else if (code === 2) style.dim = true;
    else if (code === 3) style.italic = true;
    else if (code === 4) style.underline = true;
    else if (code === 9) style.strikethrough = true;
    else if (code !== undefined && code >= 30 && code <= 37) {
      style.color = paletteColor(ANSI_16_RGB, code - 30);
    } else if (code !== undefined && code >= 90 && code <= 97) {
      style.color = paletteColor(ANSI_16_RGB, code - 90 + 8);
    } else if (code === 38 && codes[index + 1] === 5) {
      style.color = paletteColor(ANSI_256_RGB, codes[index + 2] ?? -1);
      index += 2;
    } else if (code === 38 && codes[index + 1] === 2) {
      const red = codes[index + 2];
      const green = codes[index + 3];
      const blue = codes[index + 4];
      if (red === undefined || green === undefined || blue === undefined) {
        throw new TerminalProjectionError(
          "Terminal projection received an incomplete truecolour code",
        );
      }
      style.color = { red, green, blue };
      index += 4;
    } else {
      throw new TerminalProjectionError(
        `Terminal projection does not support SGR code ${code}`,
      );
    }
  }
  return style;
}

/**
 * Decode one string of package-emitted terminal output into projected spans.
 *
 * Spans carry the decoded text run, the SGR styling active over it, and the
 * target of the ST-ended OSC 8 hyperlink envelope containing it, exactly as
 * the package's styled-sequence authority parses them: adjacent runs with
 * identical style and link merge into one span, and styling or a hyperlink
 * left open at end of input simply ends with the final span, mirroring how a
 * terminal displays it. Input outside the documented repertoire — foreign
 * escape sequences, unsupported SGR codes, BEL-ended or parameterised
 * hyperlink envelopes, or bare control characters other than newline and
 * tab — throws {@linkcode TerminalProjectionError}.
 */
export function projectTerminalSpans(output: string): readonly TerminalSpan[] {
  let segments: readonly StyledSegment[];
  try {
    segments = parseStyledSource(output);
  } catch (error) {
    throw new TerminalProjectionError(
      error instanceof Error ? error.message : String(error),
    );
  }
  return segments.map((segment) => {
    assertProjectableText(segment.text);
    const style = styleFromCodes(segment.codes);
    return {
      text: segment.text,
      ...(style === undefined ? {} : { style }),
      ...(segment.link === undefined ? {} : { link: segment.link }),
    };
  });
}

/**
 * Map one decoded span style to browser style declarations.
 *
 * The same mapping colours the package's browser Catalogue and the HTML
 * produced by {@linkcode projectTerminalHtml}: truecolour foregrounds become
 * `rgb()` values, bold maps to weight 700, dim to reduced opacity, and
 * underline and strikethrough to text decorations.
 */
export function terminalSpanCss(style: TerminalSpanStyle): TerminalSpanCss {
  const decoration = [
    style.underline === true ? "underline" : undefined,
    style.strikethrough === true ? "line-through" : undefined,
  ].filter((value) => value !== undefined).join(" ");
  return {
    ...(style.color === undefined ? {} : {
      color: `rgb(${style.color.red} ${style.color.green} ${style.color.blue})`,
    }),
    ...(style.italic === true ? { fontStyle: "italic" } : {}),
    ...(style.bold === true ? { fontWeight: 700 } : {}),
    ...(style.dim === true ? { opacity: 0.68 } : {}),
    ...(decoration === "" ? {} : { textDecorationLine: decoration }),
  };
}

const LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:", "file:"]);

/**
 * Resolve a decoded hyperlink target to a safe `href`, or `undefined` when
 * the target must render as plain text. Only absolute `http:`, `https:`,
 * `mailto:`, and `file:` targets become live anchors in projected HTML.
 */
export function terminalLinkHref(target: string): string | undefined {
  try {
    return LINK_PROTOCOLS.has(new URL(target).protocol) ? target : undefined;
  } catch {
    return undefined;
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const CSS_PROPERTY_NAMES = {
  color: "color",
  fontStyle: "font-style",
  fontWeight: "font-weight",
  opacity: "opacity",
  textDecorationLine: "text-decoration-line",
} as const satisfies Readonly<Record<keyof TerminalSpanCss, string>>;

function inlineCss(css: TerminalSpanCss): string {
  return (Object.keys(CSS_PROPERTY_NAMES) as readonly (keyof TerminalSpanCss)[])
    .filter((property) => css[property] !== undefined)
    .map((property) => `${CSS_PROPERTY_NAMES[property]}:${css[property]}`)
    .join(";");
}

function spanHtml(span: TerminalSpan): string {
  const text = escapeHtml(span.text);
  const css = span.style === undefined
    ? undefined
    : inlineCss(terminalSpanCss(span.style));
  const styleAttribute = css === undefined || css === ""
    ? ""
    : ` style="${escapeHtml(css)}"`;
  const href = span.link === undefined
    ? undefined
    : terminalLinkHref(span.link);
  if (href !== undefined) {
    return `<a href="${
      escapeHtml(href)
    }" target="_blank" rel="noopener noreferrer"${styleAttribute}>${text}</a>`;
  }
  return styleAttribute === "" ? text : `<span${styleAttribute}>${text}</span>`;
}

/**
 * Project package-emitted terminal output into one self-contained HTML `pre`
 * element, coloured by the package's own derived terminal theme.
 *
 * Every style is inlined, so the returned fragment renders faithfully with no
 * stylesheet. Hyperlink targets outside the safe protocol set render as
 * styled text rather than live anchors. Input outside the documented
 * repertoire throws {@linkcode TerminalProjectionError}, exactly as
 * {@linkcode projectTerminalSpans} does.
 */
export function projectTerminalHtml(
  output: string,
  options: TerminalHtmlOptions = {},
): string {
  const spans = projectTerminalSpans(output);
  const theme = terminalThemes[options.theme ?? "dark"];
  const canvas = terminalThemeColor(theme, "--discern-color-canvas");
  const ink = terminalThemeColor(theme, "--discern-color-ink");
  const shell = [
    "margin:0",
    "padding:1em",
    `background-color:rgb(${canvas.red} ${canvas.green} ${canvas.blue})`,
    `color:rgb(${ink.red} ${ink.green} ${ink.blue})`,
    "font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
    "font-size:0.875em",
    "line-height:1.45",
    "overflow-x:auto",
  ].join(";");
  return `<pre style="${escapeHtml(shell)}">${
    spans.map(spanHtml).join("")
  }</pre>`;
}
