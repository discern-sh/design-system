/**
 * Narration verbs: semantic one-line terminal emitters for output too small
 * to deserve a Component — a success line, an informational note, a warning,
 * a failure, and a lead-in that opens a group of lines. Markers come from the
 * package's established terminal dialect (the disclosure arrow, bound motif
 * marker, and check/bang/cross marks), colours and spacing come from the token
 * bridge, and every form keeps its meaning without colour and without
 * Unicode. Each verb is a pure {@linkcode CliRenderer}, so a presenter binds
 * narration exactly as it binds a Component renderer.
 *
 * @module
 */

import {
  renderStyledSpans,
  type StyledSpan,
  styleText,
  type TerminalTextStyle,
} from "./ansi.ts";
import type { TerminalCapabilities } from "./capabilities.ts";
import type { CliPresentationOptions, CliRenderer } from "./contracts.ts";
import {
  terminalMotifRegisterRoles,
  terminalMotifRepertoire,
} from "./motif.ts";
import { measureText, wrapText } from "./text.ts";
import { TRIANGLES } from "./triangles.ts";
import {
  resolveTerminalTheme,
  type TerminalSemanticTone,
  type TerminalTextRole,
  terminalThemeColor,
  type TerminalThemeOptions,
  terminalToneColor,
} from "./theme.ts";
/** Inputs accepted by every narration line verb. */
export interface NarrationLineProps extends CliPresentationOptions {
  /** One trimmed, control-free line of narration. */
  readonly text: string;
  /** Upper bound on the rendered width; wrapped lines hang under the text. */
  readonly maxWidth?: number;
}

/** The narration line forms the package offers. */
export type NarrationLineKind =
  | "success"
  | "note"
  | "warning"
  | "failure"
  | "lead";

interface FixedNarrationLineSpec {
  readonly unicodeMarker: string;
  readonly asciiMarker: string;
  readonly tone: TerminalSemanticTone;
  /** Lead lines take the section-rule title treatment: uppercase strong ink. */
  readonly heading: boolean;
}

interface MotifNarrationLineSpec {
  readonly motifMarker: true;
  readonly tone: TerminalSemanticTone;
  readonly heading: boolean;
}

type NarrationLineSpec = FixedNarrationLineSpec | MotifNarrationLineSpec;

const NARRATION_LINE_SPECS: Readonly<
  Record<NarrationLineKind, NarrationLineSpec>
> = {
  success: {
    unicodeMarker: "✓",
    asciiMarker: "+",
    tone: "success",
    heading: false,
  },
  note: {
    unicodeMarker: TRIANGLES.filledSmall.right.unicode,
    asciiMarker: TRIANGLES.filledSmall.right.ascii,
    tone: "accent",
    heading: false,
  },
  warning: {
    unicodeMarker: "!",
    asciiMarker: "!",
    tone: "warning",
    heading: false,
  },
  failure: {
    unicodeMarker: "✕",
    asciiMarker: "x",
    tone: "danger",
    heading: false,
  },
  lead: {
    motifMarker: true,
    tone: "accent",
    heading: true,
  },
};

function renderNarrationLine(
  kind: NarrationLineKind,
  props: Readonly<NarrationLineProps>,
  capabilities: TerminalCapabilities,
): string {
  const spec = NARRATION_LINE_SPECS[kind];
  if (
    props.text === "" || props.text.trim() !== props.text ||
    /[\p{Cc}\p{Cf}]/u.test(props.text)
  ) {
    throw new TypeError(
      "narration text must be non-empty, trimmed, and control-free",
    );
  }
  const requestedWidth = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 3) {
    throw new TypeError(
      `narration width must be a safe integer of at least 3; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  const theme = resolveTerminalTheme(props);
  const marker = "motifMarker" in spec
    ? terminalMotifRegisterRoles(
      terminalMotifRepertoire(props.motif, capabilities.unicode),
      props.register,
    ).marker
    : capabilities.unicode
    ? spec.unicodeMarker
    : spec.asciiMarker;
  const gap = " ".repeat(theme.spacing["--discern-space-2"] ?? 1);
  const indent = " ".repeat(measureText(marker) + gap.length);
  const textWidth = width - indent.length;
  if (textWidth < 1) {
    throw new TypeError(
      `terminal width ${capabilities.columns} cannot hold a narration line`,
    );
  }
  const markerStyle: TerminalTextStyle = {
    color: terminalToneColor(theme, spec.tone),
  };
  const textStyle: TerminalTextStyle | undefined = spec.heading
    ? {
      ...theme.typography.strong,
      color: terminalThemeColor(theme, "--discern-color-ink"),
    }
    : undefined;
  const textSpan = (line: string): StyledSpan =>
    textStyle === undefined ? { text: line } : { text: line, style: textStyle };
  const body = spec.heading ? props.text.toUpperCase() : props.text;
  return wrapText(body, textWidth).map((line, index) =>
    renderStyledSpans(
      index === 0
        ? [{ text: marker, style: markerStyle }, { text: gap }, textSpan(line)]
        : [{ text: indent }, textSpan(line)],
      capabilities,
    )
  ).join("\n");
}

/** Render one success line: a Token-toned check mark before the fact. */
export const renderSuccessLine: CliRenderer<NarrationLineProps> = (
  props,
  capabilities,
) => renderNarrationLine("success", props, capabilities);

/** Render one informational note behind an accent-toned disclosure arrow. */
export const renderNoteLine: CliRenderer<NarrationLineProps> = (
  props,
  capabilities,
) => renderNarrationLine("note", props, capabilities);

/** Render one warning line: a warning-toned bang before the fact. */
export const renderWarningLine: CliRenderer<NarrationLineProps> = (
  props,
  capabilities,
) => renderNarrationLine("warning", props, capabilities);

/** Render one failure line: a danger-toned cross before the fact. */
export const renderFailureLine: CliRenderer<NarrationLineProps> = (
  props,
  capabilities,
) => renderNarrationLine("failure", props, capabilities);

/**
 * Render one lead-in that opens a group of lines: the motif marker before
 * an uppercase strong title, the embedded section-rule treatment without its
 * rule. Lighter than the Heading Component — it owns no blank lines.
 */
export const renderLeadLine: CliRenderer<NarrationLineProps> = (
  props,
  capabilities,
) => renderNarrationLine("lead", props, capabilities);

/** Every narration verb by kind, for callers that map severities to lines. */
export const narrationLineRenderers: Readonly<
  Record<NarrationLineKind, CliRenderer<NarrationLineProps>>
> = {
  success: renderSuccessLine,
  note: renderNoteLine,
  warning: renderWarningLine,
  failure: renderFailureLine,
  lead: renderLeadLine,
};

/** Semantic inline styling resolved through one derived terminal theme. */
export interface SemanticTextOptions extends TerminalThemeOptions {
  readonly role?: TerminalTextRole;
  readonly tone?: TerminalSemanticTone;
}

/**
 * Style inline text by semantic type role and colour tone. Resolves the
 * requested theme's Token-derived attributes and emits through
 * {@linkcode styleText}, so callers name meanings — muted, emphasis,
 * success — rather than carrying colours or threading a theme by hand.
 */
export function styleSemanticText(
  text: string,
  options: SemanticTextOptions,
  capabilities: TerminalCapabilities,
): string {
  const theme = resolveTerminalTheme(options);
  const role = options.role === undefined
    ? undefined
    : theme.typography[options.role];
  if (options.role !== undefined && role === undefined) {
    throw new TypeError(`unknown terminal text role ${options.role}`);
  }
  return styleText(text, {
    ...role,
    ...(options.tone === undefined
      ? {}
      : { color: terminalToneColor(theme, options.tone) }),
  }, capabilities);
}
