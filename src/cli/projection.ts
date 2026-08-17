/**
 * Terminal output projection: a pure decode of the package's emitted terminal
 * repertoire into typed spans, and a renderer from those spans to
 * self-contained HTML that a reviewer can read in a browser.
 *
 * The decode derives from the package's internal styled-sequence authority —
 * the same byte grammar the emitters compose with — so the supported input is
 * exactly what this package's CLI renderers emit: plain text with newlines
 * and tabs, the emitted SGR subset (bold, dim, italic, underline,
 * strikethrough, and 16-, 256-, and truecolour foregrounds and backgrounds), and complete
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
import { graphemeWidth, measureText } from "./text.ts";
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
  /** Background colour, resolved to sRGB through the reference palettes. */
  readonly background?: TerminalRgbColor;
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
  readonly backgroundColor?: string;
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

/** Fixed terminal geometry against which a static frame is inspected. */
export interface TerminalLayoutViewport {
  /** Available terminal character cells. */
  readonly columns: number;
  /** Visible terminal rows before content falls below the fold. */
  readonly rows: number;
}

/** One visible row measured from projected terminal output. */
export interface TerminalLayoutLine {
  /** One-based row number. */
  readonly row: number;
  /** ANSI-free visible text. */
  readonly text: string;
  /** Display width in terminal character cells. */
  readonly columns: number;
  /** Whether the row contains no visible text. */
  readonly blank: boolean;
  /** Whether the row exceeds the inspected viewport width. */
  readonly overflows: boolean;
  /** Whether the row begins below the inspected viewport fold. */
  readonly belowFold: boolean;
}

/** Advisory pattern worth reviewing in a static terminal layout. */
export interface TerminalLayoutReviewCue {
  readonly kind: "blank-run" | "repeated-line";
  /** One-based rows participating in the cue. */
  readonly rows: readonly number[];
  readonly message: string;
}

/** Pure geometry and advisory review data for one static terminal frame. */
export interface TerminalLayoutInspection extends TerminalLayoutViewport {
  readonly contentRows: number;
  readonly maximumColumns: number;
  readonly spareRows: number;
  readonly rowsBelowFold: number;
  readonly overflowRows: readonly number[];
  readonly lines: readonly TerminalLayoutLine[];
  /** Heuristics for human review, never conformance failures. */
  readonly reviewCues: readonly TerminalLayoutReviewCue[];
}

/** Options for {@linkcode projectTerminalInspectorHtml}. */
export interface TerminalInspectorHtmlOptions extends TerminalLayoutViewport {
  /** Package terminal theme colouring the inspector. Defaults to dark. */
  readonly theme?: TerminalThemeVariant;
  /** Inspector caption. Defaults to "Terminal layout inspection". */
  readonly title?: string;
  /** Draw one-character-cell guides over the terminal viewport. */
  readonly showGrid?: boolean;
}

interface MutableSpanStyle {
  bold?: true;
  dim?: true;
  italic?: true;
  underline?: true;
  strikethrough?: true;
  color?: TerminalRgbColor;
  background?: TerminalRgbColor;
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
    } else if (code !== undefined && code >= 40 && code <= 47) {
      style.background = paletteColor(ANSI_16_RGB, code - 40);
    } else if (code !== undefined && code >= 100 && code <= 107) {
      style.background = paletteColor(ANSI_16_RGB, code - 100 + 8);
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
    } else if (code === 48 && codes[index + 1] === 5) {
      style.background = paletteColor(ANSI_256_RGB, codes[index + 2] ?? -1);
      index += 2;
    } else if (code === 48 && codes[index + 1] === 2) {
      const red = codes[index + 2];
      const green = codes[index + 3];
      const blue = codes[index + 4];
      if (red === undefined || green === undefined || blue === undefined) {
        throw new TerminalProjectionError(
          "Terminal projection received an incomplete truecolour background code",
        );
      }
      style.background = { red, green, blue };
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
 * produced by {@linkcode projectTerminalHtml}: truecolour foregrounds and backgrounds become
 * `rgb()` values, bold maps to weight 700, dim to reduced opacity, and
 * underline and strikethrough to text decorations.
 */
export function terminalSpanCss(style: TerminalSpanStyle): TerminalSpanCss {
  const decoration = [
    style.underline === true ? "underline" : undefined,
    style.strikethrough === true ? "line-through" : undefined,
  ].filter((value) => value !== undefined).join(" ");
  return {
    ...(style.background === undefined ? {} : {
      backgroundColor:
        `rgb(${style.background.red} ${style.background.green} ${style.background.blue})`,
    }),
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

const terminalCellSegmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});

function terminalTextHtml(value: string): string {
  let html = "";
  let ascii = "";
  const flushAscii = (): void => {
    html += escapeHtml(ascii);
    ascii = "";
  };
  for (const { segment } of terminalCellSegmenter.segment(value)) {
    if ([...segment].every((character) => character.codePointAt(0)! <= 0x7F)) {
      ascii += segment;
      continue;
    }
    flushAscii();
    const columns = graphemeWidth(segment);
    const style = [
      "display:inline-block",
      `width:${columns}ch`,
      "text-align:center",
      "vertical-align:baseline",
    ].join(";");
    html += `<span data-discern-terminal-cell="${columns}" style="${style}">${
      escapeHtml(segment)
    }</span>`;
  }
  flushAscii();
  return html;
}

const CSS_PROPERTY_NAMES = {
  backgroundColor: "background-color",
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
  const text = terminalTextHtml(span.text);
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
 * Project package-emitted terminal output into one safe inline HTML fragment.
 *
 * Text is escaped, safe links retain their anchors, and every non-ASCII
 * grapheme occupies an explicit terminal-cell box so proportional fallback
 * glyphs cannot shift following cells in a browser.
 */
export function projectTerminalInlineHtml(output: string): string {
  return projectTerminalSpans(output).map(spanHtml).join("");
}

function assertTerminalLayoutViewport(
  viewport: TerminalLayoutViewport,
): void {
  for (
    const [name, value] of [
      ["columns", viewport.columns],
      ["rows", viewport.rows],
    ] as const
  ) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new TypeError(
        `terminal inspector ${name} must be a positive safe integer; received ${value}`,
      );
    }
  }
}

interface ProjectedTerminalLine {
  readonly spans: readonly TerminalSpan[];
  readonly text: string;
}

function projectedTerminalLines(
  spans: readonly TerminalSpan[],
): readonly ProjectedTerminalLine[] {
  if (spans.length === 0) return [];
  const rows: TerminalSpan[][] = [[]];
  for (const span of spans) {
    const parts = span.text.split("\n");
    for (const [index, part] of parts.entries()) {
      if (part !== "") {
        rows.at(-1)?.push({ ...span, text: part });
      }
      if (index < parts.length - 1) rows.push([]);
    }
  }
  if (spans.at(-1)?.text.endsWith("\n") === true) rows.pop();
  return rows.map((row) => ({
    spans: row,
    text: row.map((span) => span.text).join(""),
  }));
}

function terminalLineColumns(value: string): number {
  const tabParts = value.split("\t");
  let expanded = "";
  for (const [index, part] of tabParts.entries()) {
    expanded += part;
    if (index < tabParts.length - 1) {
      const width = measureText(expanded);
      expanded += " ".repeat(8 - width % 8);
    }
  }
  return measureText(expanded);
}

function cueRows(rows: readonly number[]): string {
  if (rows.length === 0) return "";
  if (rows.length === 1) return `row ${rows[0]}`;
  if (rows.length === 2) return `rows ${rows[0]} and ${rows[1]}`;
  const contiguous = rows.every((row, index) =>
    index === 0 || row === (rows[index - 1] ?? 0) + 1
  );
  return contiguous
    ? `rows ${rows[0]}–${rows.at(-1)}`
    : `rows ${rows.slice(0, -1).join(", ")}, and ${rows.at(-1)}`;
}

/**
 * Inspect one static package-emitted frame against explicit terminal geometry.
 *
 * Width and fold readings are facts. Repeated visible lines and consecutive
 * blank rows are returned separately as review cues: they can reveal layout
 * mistakes, but are never treated as conformance failures because either may
 * be intentional in a terminal design.
 */
export function inspectTerminalLayout(
  output: string,
  viewport: TerminalLayoutViewport,
): TerminalLayoutInspection {
  assertTerminalLayoutViewport(viewport);
  const projected = projectedTerminalLines(projectTerminalSpans(output));
  return inspectProjectedTerminalLayout(projected, viewport);
}

function inspectProjectedTerminalLayout(
  projected: readonly ProjectedTerminalLine[],
  viewport: TerminalLayoutViewport,
): TerminalLayoutInspection {
  const lines = projected.map(({ text }, index): TerminalLayoutLine => {
    const columns = terminalLineColumns(text);
    return {
      row: index + 1,
      text,
      columns,
      blank: text.trim() === "",
      overflows: columns > viewport.columns,
      belowFold: index >= viewport.rows,
    };
  });
  const reviewCues: TerminalLayoutReviewCue[] = [];
  for (let index = 0; index < lines.length;) {
    if (lines[index]?.blank !== true) {
      index += 1;
      continue;
    }
    const start = index;
    while (lines[index]?.blank === true) index += 1;
    if (index - start > 1) {
      const rows = lines.slice(start, index).map((line) => line.row);
      reviewCues.push({
        kind: "blank-run",
        rows,
        message: `${cueRows(rows)} contain consecutive blank lines.`,
      });
    }
  }
  const repeated = new Map<string, number[]>();
  for (const line of lines) {
    if (line.blank) continue;
    const key = line.text;
    const rows = repeated.get(key) ?? [];
    rows.push(line.row);
    repeated.set(key, rows);
  }
  for (const rows of repeated.values()) {
    if (rows.length < 2) continue;
    reviewCues.push({
      kind: "repeated-line",
      rows,
      message: `${cueRows(rows)} repeat the same visible line.`,
    });
  }
  reviewCues.sort((left, right) =>
    (left.rows[0] ?? 0) - (right.rows[0] ?? 0) ||
    left.kind.localeCompare(right.kind)
  );
  const contentRows = lines.length;
  return {
    ...viewport,
    contentRows,
    maximumColumns: Math.max(0, ...lines.map((line) => line.columns)),
    spareRows: Math.max(0, viewport.rows - contentRows),
    rowsBelowFold: Math.max(0, contentRows - viewport.rows),
    overflowRows: lines.filter((line) => line.overflows).map((line) =>
      line.row
    ),
    lines,
    reviewCues,
  };
}

function rgb(color: TerminalRgbColor): string {
  return `rgb(${color.red} ${color.green} ${color.blue})`;
}

function rgbAlpha(color: TerminalRgbColor, alpha: number): string {
  return `rgb(${color.red} ${color.green} ${color.blue} / ${alpha})`;
}

function terminalRuler(columns: number): readonly [string, string] {
  const labels = Array<string>(columns).fill(" ");
  for (let column = 10; column <= columns; column += 10) {
    const label = String(column);
    const start = column - label.length;
    for (const [offset, character] of [...label].entries()) {
      labels[start + offset] = character;
    }
  }
  return [
    labels.join(""),
    Array.from({ length: columns }, (_, index) => String((index + 1) % 10))
      .join(""),
  ];
}

function metricHtml(
  label: string,
  color: TerminalRgbColor,
  border: TerminalRgbColor,
): string {
  const style = [
    "display:inline-flex",
    "align-items:center",
    "min-height:1.75rem",
    "padding:0 0.55rem",
    `border:1px solid ${rgb(border)}`,
    "border-radius:999px",
    `color:${rgb(color)}`,
    "font:600 0.75rem/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
  ].join(";");
  return `<span style="${escapeHtml(style)}">${escapeHtml(label)}</span>`;
}

/**
 * Project a static terminal frame into a self-contained browser inspector.
 *
 * The inspector renders the real projected styles inside explicit columns and
 * rows, supplies rulers and a fold boundary, and reports geometry separately
 * from advisory review cues. It contains no script or global stylesheet, so a
 * consumer can check the returned fragment into a screenshot-review artifact.
 */
export function projectTerminalInspectorHtml(
  output: string,
  options: TerminalInspectorHtmlOptions,
): string {
  assertTerminalLayoutViewport(options);
  const spans = projectTerminalSpans(output);
  const projected = projectedTerminalLines(spans);
  const inspection = inspectProjectedTerminalLayout(projected, options);
  const theme = terminalThemes[options.theme ?? "dark"];
  const canvas = terminalThemeColor(theme, "--discern-color-canvas");
  const surface = terminalThemeColor(theme, "--discern-color-surface");
  const sunken = terminalThemeColor(theme, "--discern-color-surface-sunken");
  const ink = terminalThemeColor(theme, "--discern-color-ink");
  const muted = terminalThemeColor(theme, "--discern-color-ink-muted");
  const border = terminalThemeColor(theme, "--discern-color-border");
  const strongBorder = terminalThemeColor(
    theme,
    "--discern-color-border-strong",
  );
  const accent = terminalThemeColor(theme, "--discern-color-accent-700");
  const warning = terminalThemeColor(theme, "--discern-color-warning-deep");
  const danger = terminalThemeColor(theme, "--discern-color-danger");
  const title = options.title ?? "Terminal layout inspection";
  const [rulerLabels, rulerTicks] = terminalRuler(options.columns);
  const reviewRows = new Map<number, TerminalLayoutReviewCue[]>();
  for (const cue of inspection.reviewCues) {
    for (const row of cue.rows) {
      reviewRows.set(row, [...(reviewRows.get(row) ?? []), cue]);
    }
  }
  const renderedRows = Math.max(options.rows, inspection.contentRows);
  const gridBackground = options.showGrid === true
    ? `repeating-linear-gradient(to right,transparent 0 calc(1ch - 1px),${
      rgbAlpha(strongBorder, 0.22)
    } calc(1ch - 1px) 1ch)`
    : "none";
  const rowHtml = Array.from({ length: renderedRows }, (_, index) => {
    const row = index + 1;
    const line = inspection.lines[index];
    const projectedLine = projected[index];
    const cues = reviewRows.get(row) ?? [];
    const belowFold = row > options.rows;
    const overflows = line?.overflows === true;
    const cueMarker = cues.length === 0 ? "" : "•";
    const cueTitle = cues.map((cue) => cue.message).join(" ");
    const background = overflows
      ? rgbAlpha(danger, 0.12)
      : belowFold
      ? rgbAlpha(warning, 0.08)
      : cues.length > 0
      ? rgbAlpha(accent, 0.07)
      : "transparent";
    const foldBorder = row === options.rows
      ? `border-bottom:2px solid ${rgb(accent)}`
      : "border-bottom:2px solid transparent";
    const shared = [
      "box-sizing:border-box",
      "min-height:1.45em",
      foldBorder,
      `background-color:${background}`,
    ].join(";");
    const numberStyle = [
      shared,
      "padding-right:0.6rem",
      "text-align:right",
      `color:${
        rgbAlpha(overflows ? danger : belowFold ? warning : muted, 0.68)
      }`,
      "user-select:none",
    ].join(";");
    const cueStyle = [
      shared,
      `color:${rgb(overflows ? danger : accent)}`,
      "text-align:center",
      "user-select:none",
    ].join(";");
    const contentStyle = [
      shared,
      `min-width:${options.columns}ch`,
      `background-image:${gridBackground}`,
      "white-space:pre",
      "tab-size:8",
    ].join(";");
    const content = projectedLine?.spans.map(spanHtml).join("") ?? "";
    return `<span data-discern-terminal-row-number="${row}" aria-hidden="true" style="${
      escapeHtml(numberStyle)
    }">${row}</span><span aria-hidden="true" title="${
      escapeHtml(cueTitle)
    }" style="${
      escapeHtml(cueStyle)
    }">${cueMarker}</span><span data-discern-terminal-row="${row}" data-discern-terminal-row-columns="${
      line?.columns ?? 0
    }" data-discern-terminal-row-overflow="${
      overflows ? "true" : "false"
    }" style="${escapeHtml(contentStyle)}">${content}</span>`;
  }).join("");
  const viewportGrid = [
    "display:grid",
    `grid-template-columns:max-content 1rem ${options.columns}ch`,
    "grid-auto-rows:minmax(1.45em,auto)",
    "width:max-content",
    "font:0.8125rem/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
    "font-variant-ligatures:none",
    `color:${rgb(ink)}`,
  ].join(";");
  const rulerLabelStyle = [
    "white-space:pre",
    "user-select:none",
    `color:${rgbAlpha(muted, 0.7)}`,
    `background:${rgb(sunken)}`,
  ].join(";");
  const rulerTickStyle = [
    "white-space:pre",
    "user-select:none",
    `color:${rgbAlpha(muted, 0.34)}`,
    `background:${rgb(sunken)}`,
  ].join(";");
  const metricParts = [
    metricHtml(`${options.columns} × ${options.rows} viewport`, accent, border),
    metricHtml(
      `${inspection.contentRows} content row${
        inspection.contentRows === 1 ? "" : "s"
      }`,
      ink,
      border,
    ),
    metricHtml(
      `${inspection.maximumColumns} max columns`,
      inspection.overflowRows.length === 0 ? ink : danger,
      inspection.overflowRows.length === 0 ? border : danger,
    ),
    inspection.rowsBelowFold === 0
      ? metricHtml(`${inspection.spareRows} rows spare`, muted, border)
      : metricHtml(
        `${inspection.rowsBelowFold} below fold`,
        warning,
        warning,
      ),
  ];
  if (inspection.overflowRows.length > 0) {
    metricParts.push(metricHtml(
      `${inspection.overflowRows.length} overflow row${
        inspection.overflowRows.length === 1 ? "" : "s"
      }`,
      danger,
      danger,
    ));
  }
  const cueItems = inspection.reviewCues.map((cue) =>
    `<li><strong>${
      cue.kind === "blank-run" ? "Blank run" : "Repeated line"
    }:</strong> ${escapeHtml(cue.message)}</li>`
  ).join("");
  const cuePanel = inspection.reviewCues.length === 0
    ? `<p style="margin:0;color:${rgb(muted)}">No advisory review cues.</p>`
    : `<div style="display:flex;gap:0.65rem;align-items:flex-start"><span aria-hidden="true" style="color:${
      rgb(accent)
    }">•</span><div><strong>Review cues</strong><ul style="margin:0.3rem 0 0;padding-left:1.1rem">${cueItems}</ul></div></div>`;
  const figureStyle = [
    "margin:0",
    `border:1px solid ${rgb(border)}`,
    "border-radius:0.75rem",
    "overflow:hidden",
    `background:${rgb(surface)}`,
    `color:${rgb(ink)}`,
    "font-family:ui-sans-serif,system-ui,sans-serif",
  ].join(";");
  const captionStyle = [
    "display:grid",
    "gap:0.75rem",
    "padding:0.9rem 1rem",
    `border-bottom:1px solid ${rgb(border)}`,
    `background:${rgb(surface)}`,
  ].join(";");
  return `<figure data-discern-terminal-inspector data-discern-terminal-theme="${theme.variant}" data-discern-terminal-columns="${options.columns}" data-discern-terminal-rows="${options.rows}" style="${
    escapeHtml(figureStyle)
  }"><figcaption style="${escapeHtml(captionStyle)}"><strong>${
    escapeHtml(title)
  }</strong><span style="display:flex;flex-wrap:wrap;gap:0.4rem">${
    metricParts.join("")
  }</span></figcaption><div data-discern-terminal-viewport style="overflow:auto;background:${
    rgb(canvas)
  };padding:0.75rem 1rem 1rem"><div role="group" aria-label="${
    escapeHtml(`${title}, ${options.columns} columns by ${options.rows} rows`)
  }" style="${
    escapeHtml(viewportGrid)
  }"><span></span><span></span><span data-discern-terminal-ruler="labels" aria-hidden="true" style="${
    escapeHtml(rulerLabelStyle)
  }">${
    escapeHtml(rulerLabels)
  }</span><span></span><span></span><span data-discern-terminal-ruler="ticks" aria-hidden="true" style="${
    escapeHtml(rulerTickStyle)
  }">${
    escapeHtml(rulerTicks)
  }</span>${rowHtml}</div></div><div style="padding:0.75rem 1rem;border-top:1px solid ${
    rgb(border)
  };font-size:0.8rem;line-height:1.45">${cuePanel}</div></figure>`;
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
    projectTerminalInlineHtml(output)
  }</pre>`;
}
