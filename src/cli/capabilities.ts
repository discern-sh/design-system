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
  readonly colorDepth: TerminalColorDepth;
  readonly columns: number;
  readonly unicode: boolean;
}

/** Process facts consumed by {@linkcode detectTerminalCapabilities}. */
export interface TerminalDetectionInput {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly isTty: boolean;
  readonly columns?: number;
}

const DEFAULT_COLUMNS = 80;

/**
 * Infer rendering capabilities from caller-supplied process facts. The helper
 * performs no environment or terminal reads itself, so detection stays
 * independently testable and renderers remain pure.
 */
export function detectTerminalCapabilities(
  input: TerminalDetectionInput,
): TerminalCapabilities {
  const term = input.env.TERM?.toLocaleLowerCase() ?? "";
  const colorTerm = input.env.COLORTERM?.toLocaleLowerCase() ?? "";
  const noColor = Object.prototype.hasOwnProperty.call(input.env, "NO_COLOR");
  const colorDepth: TerminalColorDepth =
    !input.isTty || noColor || term === "dumb"
      ? "none"
      : /(?:truecolor|24bit)/u.test(colorTerm)
      ? "truecolor"
      : /(?:^|[-_])256color$/u.test(term)
      ? "ansi256"
      : "ansi16";

  const locale = input.env.LC_ALL ?? input.env.LC_CTYPE ?? input.env.LANG;
  const asciiLocale = locale !== undefined &&
    /^(?:C|POSIX)(?:\.|$)/iu.test(locale);
  const columns =
    Number.isSafeInteger(input.columns) && (input.columns ?? 0) > 0
      ? input.columns as number
      : DEFAULT_COLUMNS;

  return {
    colorDepth,
    columns,
    unicode: input.isTty && term !== "dumb" && !asciiLocale,
  };
}
