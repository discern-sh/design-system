/**
 * Language-agnostic lexical emphasis for browser source display.
 *
 * One hue cannot encode category, only salience, so this scanner does not
 * recognise keywords or parse grammar. It recognises the four classes that
 * are decidable from delimiters alone — comments, strings, numbers, and
 * punctuation — and leaves everything else at base ink. Recognising the
 * scaffolding is language-agnostic; recognising the interesting tokens is
 * not.
 *
 * Every construct the scanner cannot confidently close reverts to base text,
 * so a mis-closed string never takes the rest of the source with it.
 *
 * @module
 */

import { projectTerminalTextRuns } from "../cli/projection.ts";

/**
 * A family of comment and string delimiter conventions.
 *
 * These are deliberately not language names. A dialect selects the delimiter
 * table the scanner reads with; it makes no claim to understand a language's
 * grammar or keywords. Use `plain` for text that is not source at all.
 */
export type CodeDialect =
  | "c-family"
  | "css"
  | "generic"
  | "hash"
  | "plain"
  | "sgml"
  | "sql";

/** The salience tier one run of source text belongs to. */
export type CodeEmphasis = "comment" | "literal" | "punctuation";

/** One run of source text and the tier it carries, if any. */
export interface CodeEmphasisRun {
  /** Literal source text. Concatenating every run reproduces the input. */
  readonly text: string;
  /** Tier for this run; absent runs render at base ink. */
  readonly emphasis?: CodeEmphasis;
}

/** One run of source text carrying both terminal cell width and tier. */
export interface CodeTextRun {
  /** Literal source text. Concatenating every run reproduces the input. */
  readonly text: string;
  /** Measured terminal columns for a non-ASCII grapheme, when applicable. */
  readonly columns?: number;
  /** Tier for this run; absent runs render at base ink. */
  readonly emphasis?: CodeEmphasis;
}

interface DialectProfile {
  readonly lineComments: readonly string[];
  readonly blockComment?: readonly [string, string];
  readonly quotes: readonly string[];
  readonly multilineQuotes: readonly string[];
  readonly tripleQuotes: boolean;
  readonly backslashEscapes: boolean;
  readonly doubledQuoteEscapes: boolean;
  readonly leadingDashIdentifiers: boolean;
}

const BASE: Omit<DialectProfile, "lineComments" | "quotes"> = {
  multilineQuotes: [],
  tripleQuotes: false,
  backslashEscapes: true,
  doubledQuoteEscapes: false,
  leadingDashIdentifiers: false,
};

/**
 * Delimiter tables, one per dialect.
 *
 * Comment and string delimiters are the stable lexical facts: they have not
 * moved in decades, while keyword lists churn with every language release.
 * `generic` deliberately omits `#`, which is a comment in some families but a
 * colour, an identifier, a preprocessor directive, or a fragment in others.
 */
const PROFILES: Readonly<Record<Exclude<CodeDialect, "plain">, DialectProfile>> =
  {
    "c-family": {
      ...BASE,
      lineComments: ["//"],
      blockComment: ["/*", "*/"],
      quotes: ['"', "'", "`"],
      multilineQuotes: ["`"],
    },
    css: {
      ...BASE,
      lineComments: [],
      blockComment: ["/*", "*/"],
      quotes: ['"', "'"],
      leadingDashIdentifiers: true,
    },
    generic: {
      ...BASE,
      lineComments: ["//"],
      blockComment: ["/*", "*/"],
      quotes: ['"', "'"],
    },
    hash: {
      ...BASE,
      lineComments: ["#"],
      quotes: ['"', "'"],
      tripleQuotes: true,
    },
    sgml: {
      ...BASE,
      lineComments: [],
      blockComment: ["<!--", "-->"],
      quotes: ['"', "'"],
      backslashEscapes: false,
    },
    sql: {
      ...BASE,
      lineComments: ["--"],
      blockComment: ["/*", "*/"],
      quotes: ["'"],
      backslashEscapes: false,
      doubledQuoteEscapes: true,
    },
  };

/**
 * Free-form language labels mapped onto the delimiter family they belong to.
 *
 * This table exists so a caption like `language="python"` selects a sensible
 * scanner without the author naming a dialect. It is a convenience, not a
 * claim of language support; an unlisted label falls back to `generic`.
 */
const DIALECT_BY_LANGUAGE: Readonly<Record<string, CodeDialect>> = {
  bash: "hash",
  c: "c-family",
  "c#": "c-family",
  "c++": "c-family",
  cs: "c-family",
  cpp: "c-family",
  css: "css",
  dart: "c-family",
  dockerfile: "hash",
  fish: "hash",
  go: "c-family",
  golang: "c-family",
  html: "sgml",
  ini: "hash",
  java: "c-family",
  javascript: "c-family",
  js: "c-family",
  json: "c-family",
  jsonc: "c-family",
  jsx: "c-family",
  kotlin: "c-family",
  kt: "c-family",
  less: "css",
  log: "plain",
  makefile: "hash",
  output: "plain",
  perl: "hash",
  php: "c-family",
  plain: "plain",
  proto: "c-family",
  psql: "sql",
  py: "hash",
  python: "hash",
  r: "hash",
  rb: "hash",
  rs: "c-family",
  ruby: "hash",
  rust: "c-family",
  scala: "c-family",
  scss: "css",
  sh: "hash",
  shell: "hash",
  sql: "sql",
  svg: "sgml",
  swift: "c-family",
  text: "plain",
  toml: "hash",
  ts: "c-family",
  tsx: "c-family",
  txt: "plain",
  typescript: "c-family",
  vue: "sgml",
  xml: "sgml",
  yaml: "hash",
  yml: "hash",
  zig: "c-family",
  zsh: "hash",
};

const IDENTIFIER_START = /[A-Za-z_$]/;
const IDENTIFIER_CHARACTER = /[A-Za-z0-9_$]/;
const DIGIT = /[0-9]/;
const WHITESPACE = /\s/;
const NUMBER =
  /^(?:0[xXbBoO][0-9a-fA-F_]+|[0-9][0-9_]*(?:\.[0-9_]+)?(?:[eE][+-]?[0-9]+)?)/;

/**
 * Resolve a free-form language label to the dialect that reads it.
 *
 * Matching is case-insensitive and trims surrounding whitespace. An unknown
 * or absent label resolves to `generic`, which recognises only the most
 * portable delimiters.
 */
export function resolveCodeDialect(language: string | undefined): CodeDialect {
  if (language === undefined) return "generic";
  const key = language.trim().toLowerCase();
  return DIALECT_BY_LANGUAGE[key] ?? "generic";
}

/**
 * Scan one quoted string.
 *
 * Returns the index just past the closing quote, or -1 when the string cannot
 * be closed — an unterminated literal, or a single-line literal running past
 * its own line. Both revert to base text rather than swallowing what follows.
 */
function scanQuoted(
  source: string,
  start: number,
  quote: string,
  profile: DialectProfile,
): number {
  const multiline = profile.multilineQuotes.includes(quote);
  let index = start + 1;
  while (index < source.length) {
    const character = source.charAt(index);
    if (character === "\\" && profile.backslashEscapes) {
      index += 2;
      continue;
    }
    if (character === quote) {
      if (profile.doubledQuoteEscapes && source.charAt(index + 1) === quote) {
        index += 2;
        continue;
      }
      return index + 1;
    }
    if (character === "\n" && !multiline) return -1;
    index += 1;
  }
  return -1;
}

/** Scan a triple-quoted string, returning -1 when it never closes. */
function scanTripleQuoted(
  source: string,
  start: number,
  quote: string,
): number {
  const mark = quote.repeat(3);
  const end = source.indexOf(mark, start + 3);
  return end === -1 ? -1 : end + 3;
}

/**
 * Scan one identifier.
 *
 * Hyphens and underscores belong to the name, so kebab-case and snake_case
 * never shatter into recessive fragments. Returns `start` when no identifier
 * begins here.
 */
function scanIdentifier(
  source: string,
  start: number,
  profile: DialectProfile,
): number {
  let index = start;
  if (profile.leadingDashIdentifiers) {
    while (source.charAt(index) === "-") index += 1;
  }
  if (!IDENTIFIER_START.test(source.charAt(index))) return start;
  index += 1;
  while (index < source.length) {
    const character = source.charAt(index);
    if (IDENTIFIER_CHARACTER.test(character)) {
      index += 1;
      continue;
    }
    if (
      character === "-" && IDENTIFIER_CHARACTER.test(source.charAt(index + 1))
    ) {
      index += 2;
      continue;
    }
    break;
  }
  return index;
}

/**
 * Partition source text into emphasis runs.
 *
 * Adjacent runs sharing a tier are merged, so punctuation-heavy source does
 * not emit one run per character. Concatenating every run's text reproduces
 * the input exactly, including whitespace and line endings.
 */
export function emphasiseCode(
  source: string,
  dialect: CodeDialect,
): readonly CodeEmphasisRun[] {
  if (dialect === "plain" || source === "") {
    return source === "" ? [] : [{ text: source }];
  }
  const profile = PROFILES[dialect];
  const runs: CodeEmphasisRun[] = [];

  const push = (emphasis: CodeEmphasis | undefined, text: string): void => {
    if (text === "") return;
    const last = runs[runs.length - 1];
    if (last !== undefined && last.emphasis === emphasis) {
      runs[runs.length - 1] = emphasis === undefined
        ? { text: last.text + text }
        : { text: last.text + text, emphasis };
      return;
    }
    runs.push(emphasis === undefined ? { text } : { text, emphasis });
  };

  let index = 0;
  scan: while (index < source.length) {
    const character = source.charAt(index);

    if (WHITESPACE.test(character)) {
      push(undefined, character);
      index += 1;
      continue;
    }

    for (const marker of profile.lineComments) {
      if (source.startsWith(marker, index)) {
        const newline = source.indexOf("\n", index);
        const end = newline === -1 ? source.length : newline;
        push("comment", source.slice(index, end));
        index = end;
        continue scan;
      }
    }

    if (
      profile.blockComment !== undefined &&
      source.startsWith(profile.blockComment[0], index)
    ) {
      const [open, close] = profile.blockComment;
      const end = source.indexOf(close, index + open.length);
      if (end === -1) {
        push(undefined, source.slice(index));
        index = source.length;
      } else {
        push("comment", source.slice(index, end + close.length));
        index = end + close.length;
      }
      continue;
    }

    if (profile.quotes.includes(character)) {
      const triple = profile.tripleQuotes &&
        source.startsWith(character.repeat(3), index);
      const end = triple
        ? scanTripleQuoted(source, index, character)
        : scanQuoted(source, index, character, profile);
      if (end === -1) {
        // Consume the whole opening marker, so the tail of an unclosed triple
        // quote cannot re-read as an empty string literal.
        const opening = triple ? 3 : 1;
        push(undefined, source.slice(index, index + opening));
        index += opening;
      } else {
        push("literal", source.slice(index, end));
        index = end;
      }
      continue;
    }

    if (
      DIGIT.test(character) &&
      !IDENTIFIER_CHARACTER.test(source.charAt(index - 1))
    ) {
      const matched = NUMBER.exec(source.slice(index));
      if (matched !== null) {
        push("literal", matched[0]);
        index += matched[0].length;
        continue;
      }
    }

    if (
      IDENTIFIER_START.test(character) ||
      (profile.leadingDashIdentifiers && character === "-")
    ) {
      const end = scanIdentifier(source, index, profile);
      if (end > index) {
        push(undefined, source.slice(index, end));
        index = end;
        continue;
      }
    }

    push("punctuation", character);
    index += 1;
  }

  return runs;
}

/**
 * Project source text into runs carrying terminal cell width and emphasis.
 *
 * Non-ASCII graphemes keep the measured width that stops fallback-font
 * advances from shifting later cells, and are never split across an emphasis
 * boundary. Passing `emphasis: false` yields width runs alone, so the same
 * projection serves both the emphasised and unemphasised renderings.
 */
export function projectCodeRuns(
  source: string,
  dialect: CodeDialect,
  emphasis: boolean,
): readonly CodeTextRun[] {
  const textRuns = projectTerminalTextRuns(source);
  if (!emphasis || dialect === "plain") return textRuns;

  const emphasisRuns = emphasisRunQueue(emphasiseCode(source, dialect));
  const merged: CodeTextRun[] = [];

  const push = (run: CodeTextRun): void => {
    const last = merged[merged.length - 1];
    if (
      last !== undefined && last.columns === undefined &&
      run.columns === undefined && last.emphasis === run.emphasis
    ) {
      merged[merged.length - 1] = run.emphasis === undefined
        ? { text: last.text + run.text }
        : { text: last.text + run.text, emphasis: run.emphasis };
      return;
    }
    merged.push(run);
  };

  for (const run of textRuns) {
    if (run.columns !== undefined) {
      // A measured grapheme is indivisible: take the tier covering its first
      // character and consume its whole length from the emphasis queue.
      const tier = emphasisRuns.peek();
      emphasisRuns.take(run.text.length);
      push(
        tier === undefined
          ? { text: run.text, columns: run.columns }
          : { text: run.text, columns: run.columns, emphasis: tier },
      );
      continue;
    }
    let offset = 0;
    while (offset < run.text.length) {
      const tier = emphasisRuns.peek();
      const length = emphasisRuns.take(run.text.length - offset);
      const text = run.text.slice(offset, offset + length);
      push(tier === undefined ? { text } : { text, emphasis: tier });
      offset += length;
    }
  }

  return merged;
}

/** Cursor over emphasis runs, handing out tiers by character length. */
function emphasisRunQueue(runs: readonly CodeEmphasisRun[]): {
  peek: () => CodeEmphasis | undefined;
  take: (limit: number) => number;
} {
  let index = 0;
  let consumed = 0;
  return {
    peek: () => runs[index]?.emphasis,
    take: (limit: number): number => {
      const run = runs[index];
      if (run === undefined) return limit;
      const available = run.text.length - consumed;
      const taken = Math.min(available, limit);
      consumed += taken;
      if (consumed >= run.text.length) {
        index += 1;
        consumed = 0;
      }
      return taken === 0 ? limit : taken;
    },
  };
}
