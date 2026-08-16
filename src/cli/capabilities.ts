/**
 * Terminal feature detection kept outside the pure rendering graph.
 *
 * @module
 */

/** Colour precision available to a terminal renderer. */
export type TerminalColorDepth =
  | "none"
  | "ansi16"
  | "ansi256"
  | "truecolor";

/** Rendering facts every pure CLI renderer receives from its caller. */
export interface TerminalCapabilities {
  /**
   * Whether ANSI cursor movement and erase controls are safe to emit.
   * Omission preserves the pre-field assumption that controls are available.
   */
  readonly ansiControl?: boolean;
  readonly colorDepth: TerminalColorDepth;
  readonly columns: number;
  /**
   * Whether OSC 8 hyperlink envelopes are worth emitting. Omission derives
   * the fact from colour depth, so a stream styled with SGR colour also
   * receives hyperlinks while an unstyled stream receives a textual
   * fallback instead.
   */
  readonly hyperlinks?: boolean;
  /**
   * Whether SGR mouse tracking may be enabled. `false` is an explicit
   * refusal; omission means portable detection is unavailable and a
   * request-level opt-in is the caller's terminal-specific assertion.
   * This fact is independent of OSC 8 hyperlinks and colour styling.
   */
  readonly mouseTracking?: boolean;
  readonly unicode: boolean;
}

/** Process facts consumed by {@linkcode detectTerminalCapabilities}. */
export interface TerminalDetectionInput {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly isTty: boolean;
  readonly columns?: number;
}

const DEFAULT_COLUMNS = 80;

function effectiveLocale(
  env: TerminalDetectionInput["env"],
): string | undefined {
  return [env.LC_ALL, env.LC_CTYPE, env.LANG].find((value) =>
    value !== undefined && value.trim() !== ""
  );
}

function supportsUnicode(
  locale: string | undefined,
  isTty: boolean,
): boolean {
  if (locale === undefined) return isTty;
  const normalized = locale.trim();
  if (/^(?:C|POSIX)$/iu.test(normalized)) return false;
  if (/(?:^|\.)UTF-?8(?:@|$)/iu.test(normalized)) return true;
  return isTty;
}

/**
 * Infer rendering capabilities from caller-supplied process facts. The helper
 * performs no environment or terminal reads itself, so detection stays
 * independently testable and renderers remain pure. No portable environment
 * fact announces OSC 8 hyperlink support, so detection aligns hyperlinks with
 * styled output. Mouse tracking has no portable positive detector and remains
 * omitted; callers holding terminal-specific knowledge state it directly.
 */
export function detectTerminalCapabilities(
  input: TerminalDetectionInput,
): TerminalCapabilities {
  const term = input.env.TERM?.toLocaleLowerCase() ?? "";
  const colorTerm = input.env.COLORTERM?.toLocaleLowerCase() ?? "";
  const noColor = input.env.NO_COLOR !== undefined;
  const ansiControl = input.isTty && term !== "dumb";
  const colorDepth: TerminalColorDepth =
    !input.isTty || noColor || term === "dumb"
      ? "none"
      : /(?:truecolor|24bit)/u.test(colorTerm)
      ? "truecolor"
      : /(?:^|[-_])256color$/u.test(term)
      ? "ansi256"
      : "ansi16";

  const locale = effectiveLocale(input.env);
  const columns =
    Number.isSafeInteger(input.columns) && (input.columns ?? 0) > 0
      ? input.columns as number
      : DEFAULT_COLUMNS;

  return {
    ansiControl,
    colorDepth,
    columns,
    hyperlinks: colorDepth !== "none",
    unicode: supportsUnicode(locale, input.isTty),
  };
}
