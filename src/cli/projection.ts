/**
 * Terminal output projection: a pure decode of the package's emitted terminal
 * repertoire into typed spans, and a renderer from those spans to
 * self-contained HTML that a reviewer can read in a browser.
 *
 * The supported input is exactly what this package's CLI renderers emit: plain
 * text with newlines and tabs, the emitted SGR subset (bold, dim, italic,
 * underline, strikethrough, and 16-, 256-, and truecolour foregrounds), and
 * OSC 8 hyperlink envelopes. The projection is not a terminal emulator: cursor
 * movement, erasure, and every other control sequence found in captured
 * interactive sessions are rejected with {@linkcode TerminalProjectionError}
 * rather than silently passed through, so foreign byte streams surface as
 * defects instead of leaking raw controls into a review artifact.
 *
 * @module
 */

import {
  ANSI_16_RGB,
  ANSI_256_RGB,
  type TerminalRgbColor,
} from "./ansi-palette.ts";
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

const ESCAPE = "\u001b";
const BELL = "\u0007";
const SGR_PREFIX = `${ESCAPE}[`;
const HYPERLINK_PREFIX = `${ESCAPE}]8;`;
const HYPERLINK_TERMINATORS = [BELL, `${ESCAPE}\\`] as const;

function printableSequence(value: string): string {
  return value.replaceAll(ESCAPE, "\\u001b").replaceAll(BELL, "\\u0007");
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

function truecolorChannel(value: number | undefined): number {
  if (
    value === undefined || !Number.isInteger(value) || value < 0 || value > 255
  ) {
    throw new TerminalProjectionError(
      "Terminal projection received an invalid truecolour channel",
    );
  }
  return value;
}

function applySgr(parameters: string, style: MutableSpanStyle): void {
  const segments = parameters.split(";");
  const codes = segments.map((segment) => {
    if (!/^[0-9]+$/u.test(segment)) {
      throw new TerminalProjectionError(
        `Terminal projection received a malformed SGR sequence “${
          printableSequence(`${SGR_PREFIX}${parameters}m`)
        }”`,
      );
    }
    return Number(segment);
  });
  for (let index = 0; index < codes.length; index += 1) {
    const code = codes[index];
    if (code === 0) {
      delete style.bold;
      delete style.dim;
      delete style.italic;
      delete style.underline;
      delete style.strikethrough;
      delete style.color;
    } else if (code === 1) {
      style.bold = true;
    } else if (code === 2) {
      style.dim = true;
    } else if (code === 3) {
      style.italic = true;
    } else if (code === 4) {
      style.underline = true;
    } else if (code === 9) {
      style.strikethrough = true;
    } else if (code === 38 && codes[index + 1] === 2) {
      style.color = {
        red: truecolorChannel(codes[index + 2]),
        green: truecolorChannel(codes[index + 3]),
        blue: truecolorChannel(codes[index + 4]),
      };
      index += 4;
    } else if (code === 38 && codes[index + 1] === 5) {
      style.color = paletteColor(ANSI_256_RGB, codes[index + 2] ?? -1);
      index += 2;
    } else if (code !== undefined && code >= 30 && code <= 37) {
      style.color = paletteColor(ANSI_16_RGB, code - 30);
    } else if (code !== undefined && code >= 90 && code <= 97) {
      style.color = paletteColor(ANSI_16_RGB, code - 90 + 8);
    } else {
      throw new TerminalProjectionError(
        `Terminal projection does not support SGR code ${code}`,
      );
    }
  }
}

function snapshotStyle(style: MutableSpanStyle): TerminalSpanStyle | undefined {
  return Object.keys(style).length === 0 ? undefined : { ...style };
}

interface HyperlinkEnvelope {
  readonly target: string;
  readonly end: number;
}

function parseHyperlink(output: string, start: number): HyperlinkEnvelope {
  const fieldsStart = start + HYPERLINK_PREFIX.length;
  const terminated = HYPERLINK_TERMINATORS
    .map((terminator) => ({
      terminator,
      at: output.indexOf(terminator, fieldsStart),
    }))
    .filter(({ at }) => at !== -1)
    .sort((left, right) => left.at - right.at)[0];
  if (terminated === undefined) {
    throw new TerminalProjectionError(
      "Terminal projection received an unterminated hyperlink envelope",
    );
  }
  const fields = output.slice(fieldsStart, terminated.at);
  const separator = fields.indexOf(";");
  if (separator === -1) {
    throw new TerminalProjectionError(
      "Terminal projection received a hyperlink envelope without a target field",
    );
  }
  const target = fields.slice(separator + 1);
  for (const character of target) {
    const code = character.codePointAt(0);
    if (code !== undefined && (code <= 31 || code === 127)) {
      throw new TerminalProjectionError(
        "Terminal projection received a control character inside a hyperlink target",
      );
    }
  }
  return { target, end: terminated.at + terminated.terminator.length };
}

/**
 * Decode one string of package-emitted terminal output into projected spans.
 *
 * Spans carry the decoded text run, the SGR styling active over it, and the
 * target of the OSC 8 hyperlink envelope containing it. Input outside the
 * documented repertoire — foreign escape sequences, unsupported SGR codes,
 * bare control characters, or a hyperlink envelope left open at end of
 * input — throws {@linkcode TerminalProjectionError}.
 */
export function projectTerminalSpans(output: string): readonly TerminalSpan[] {
  const spans: TerminalSpan[] = [];
  const style: MutableSpanStyle = {};
  let link: string | undefined;
  let index = 0;
  let runStart = 0;

  const flush = (end: number): void => {
    const text = output.slice(runStart, end);
    if (text === "") return;
    assertProjectableText(text);
    const snapshot = snapshotStyle(style);
    spans.push({
      text,
      ...(snapshot === undefined ? {} : { style: snapshot }),
      ...(link === undefined ? {} : { link }),
    });
  };

  while (index < output.length) {
    if (output[index] !== ESCAPE) {
      index += 1;
      continue;
    }
    flush(index);
    if (output.startsWith(HYPERLINK_PREFIX, index)) {
      const envelope = parseHyperlink(output, index);
      link = envelope.target === "" ? undefined : envelope.target;
      index = envelope.end;
    } else if (output.startsWith(SGR_PREFIX, index)) {
      const sgr = /^\[([0-9;]*)m/u.exec(output.slice(index));
      if (sgr === null) {
        throw new TerminalProjectionError(
          `Terminal projection does not support the terminal sequence “${
            printableSequence(output.slice(index, index + 12))
          }”`,
        );
      }
      applySgr(sgr[1] ?? "", style);
      index += sgr[0].length;
    } else {
      throw new TerminalProjectionError(
        `Terminal projection does not support the terminal sequence “${
          printableSequence(output.slice(index, index + 12))
        }”`,
      );
    }
    runStart = index;
  }
  flush(output.length);
  if (link !== undefined) {
    throw new TerminalProjectionError(
      "Terminal projection input ended inside an open hyperlink envelope",
    );
  }
  return spans;
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
