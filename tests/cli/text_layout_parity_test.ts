import { assert, assertEquals } from "@std/assert";
import { styleHyperlink, styleText } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";
import * as linear from "../../src/cli/text.ts";
import { deriveTerminalTheme, terminalToneColor } from "../../src/cli/theme.ts";
import * as reference from "./text_layout_oracle.ts";

/**
 * Text fragments chosen for the ways a line can be measured or cut wrongly:
 * wide and ambiguous scalars, combining and spacing marks, prepended
 * marks, Indic conjuncts, ZWJ emoji, modifiers, flags and lone regional
 * indicators, format characters, every kind of whitespace a paragraph
 * splits on, joints and clause separators, and ANSI sequences.
 */
const FRAGMENTS = [
  "a",
  "b",
  "Z",
  "0",
  "word",
  "-",
  "/",
  "//",
  "--",
  ",",
  ";",
  ":",
  "·",
  "•",
  "—",
  "–",
  " ",
  " ",
  "  ",
  "\t",
  "\u00a0",
  "\u3000",
  "\ufeff",
  "\r",
  "界",
  "漢",
  "Ａ",
  "가",
  "e\u0301",
  "\u0301",
  "a\u0308\u0323",
  "\u093e",
  "\u0915\u093e",
  "\u0903",
  "\u0600",
  "\u0d4e",
  "\u0d4e\u0d15",
  "\u0915\u094d\u0937",
  "\u0e33",
  "\u1100\u1161\u11a8",
  "👩\u200d💻",
  "👨\u200d👩\u200d👧\u200d👦",
  "🧑🏽",
  "\u{1f3fb}",
  "🇬🇧",
  "🇺🇸",
  "🇦",
  "1\ufe0f\u20e3",
  "☑\ufe0f",
  "\u200d",
  "\u200c",
  "\u200b",
  "±",
  "→",
  "…",
] as const;

/** Fragments that repeat into words wider than a line. */
const RUNS = ["x", "ab-", "dir/", "界", "e\u0301", "🇬🇧", "a/b-c", "\u093e"];

const ANSI = [
  "\x1b[31m",
  "\x1b[0m",
  "\x1b[1;4m",
  "\x1b]8;;https://x.test\x1b\\",
];

function generator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

type Random = ReturnType<typeof generator>;

function pick<T>(random: Random, values: readonly T[]): T {
  const index = Math.floor(random() * values.length);
  if (index >= values.length) throw new Error("pick needs a value");
  return values[index] as T;
}

function integer(random: Random, low: number, high: number): number {
  return low + Math.floor(random() * (high - low + 1));
}

function text(
  random: Random,
  options: { newlines: boolean; ansi: boolean },
): string {
  let value = "";
  const parts = integer(random, 0, 40);
  for (let part = 0; part < parts; part += 1) {
    const roll = random();
    if (roll < 0.08) value += pick(random, RUNS).repeat(integer(random, 4, 60));
    else if (roll < 0.12 && options.newlines) value += "\n";
    else if (roll < 0.15 && options.ansi) value += pick(random, ANSI);
    else value += pick(random, FRAGMENTS);
  }
  return value;
}

function columns(random: Random, low: number): number {
  return random() < 0.5 ? integer(random, low, 20) : integer(random, low, 120);
}

const theme = deriveTerminalTheme("dark");
const STYLES = [
  {},
  { bold: true },
  { dim: true, italic: true },
  { underline: true, color: terminalToneColor(theme, "accent") },
  { background: theme.surfaces.selection },
  { color: terminalToneColor(theme, "danger"), strikethrough: true },
] as const;
const CAPABILITIES: readonly TerminalCapabilities[] = [
  testTerminalCapabilities({ colorDepth: "truecolor" }),
  testTerminalCapabilities({ colorDepth: "ansi256" }),
  testTerminalCapabilities({ colorDepth: "ansi16" }),
  testTerminalCapabilities({ colorDepth: "none", unicode: false }),
];

/** Package-styled text: styled runs, some inside hyperlinks. */
function styled(random: Random, capabilities: TerminalCapabilities): string {
  let value = "";
  const runs = integer(random, 0, 4);
  for (let run = 0; run < runs; run += 1) {
    const part = text(random, { newlines: true, ansi: false });
    const style = pick(random, STYLES);
    const label = part.replaceAll(/[\p{Cc}\p{Cf}]/gu, "");
    value += random() < 0.2 && label.trim() !== ""
      ? styleHyperlink(label, "https://example.test/a", capabilities, style)
      : styleText(part, style, capabilities);
  }
  return value;
}

/** What a call produced: its value, or the error it threw. */
function outcome(call: () => unknown): unknown {
  try {
    return { value: call() };
  } catch (error) {
    return {
      error: error instanceof Error ? `${error.name}: ${error.message}` : error,
    };
  }
}

function assertSame(
  label: string,
  input: unknown,
  ours: () => unknown,
  theirs: () => unknown,
): void {
  assertEquals(
    outcome(ours),
    outcome(theirs),
    `${label} diverged from the reference for ${JSON.stringify(input)}`,
  );
}

const CASES = 1500;

Deno.test("plain wrapping, truncation, measurement, and padding match the reference byte for byte", () => {
  const random = generator(0x7e47);
  for (let index = 0; index < CASES; index += 1) {
    const value = text(random, { newlines: true, ansi: true });
    const width = columns(random, 1);
    assertSame(
      "wrapText",
      { value, width },
      () => linear.wrapText(value, width),
      () => reference.wrapText(value, width),
    );
    assertSame(
      "wrapTextPreservingIndent",
      { value, width },
      () => linear.wrapTextPreservingIndent(`  ${value}`, width),
      () => reference.wrapTextPreservingIndent(`  ${value}`, width),
    );
    assertSame(
      "measureText",
      value,
      () => linear.measureText(value),
      () => reference.measureText(value),
    );
    const room = columns(random, 0);
    const ellipsis = pick(random, ["…", ".", "...", "", "界", "→→"]);
    const at = pick(random, [undefined, "grapheme", "word"] as const);
    const options = at === undefined ? {} : { at };
    assertSame(
      "truncateText",
      { value, room, ellipsis, at },
      () => linear.truncateText(value, room, ellipsis, options),
      () => reference.truncateText(value, room, ellipsis, options),
    );
    const alignment = pick(random, ["start", "center", "end"] as const);
    assertSame(
      "padText",
      { value, room, alignment },
      () => linear.padText(value, room, alignment),
      () => reference.padText(value, room, alignment),
    );
  }
});

Deno.test("styled wrapping, truncation, and fills match the reference byte for byte", () => {
  const random = generator(0x57e1);
  for (let index = 0; index < CASES; index += 1) {
    const capabilities = pick(random, CAPABILITIES);
    const value = styled(random, capabilities);
    const width = columns(random, 1);
    assertSame(
      "wrapStyledText",
      { value, width },
      () => linear.wrapStyledText(value, width),
      () => reference.wrapStyledText(value, width),
    );
    assertSame(
      "wrapStyledTextPreservingIndent",
      { value, width },
      () => linear.wrapStyledTextPreservingIndent(` ${value}`, width),
      () => reference.wrapStyledTextPreservingIndent(` ${value}`, width),
    );
    const room = columns(random, 0);
    const at = pick(random, [undefined, "grapheme", "word"] as const);
    const options = at === undefined ? {} : { at };
    assertSame(
      "truncateStyledText",
      { value, room, at },
      () => linear.truncateStyledText(value, room, "…", options),
      () => reference.truncateStyledText(value, room, "…", options),
    );
    const line = value.replaceAll("\n", " ");
    const style = pick(random, STYLES);
    assertSame(
      "fillStyledLine",
      { line, room, style },
      () => linear.fillStyledLine(line, room, style, capabilities),
      () => reference.fillStyledLine(line, room, style, capabilities),
    );
  }
});

Deno.test("a space joining pieces is measured with the marks that cluster onto it", () => {
  // A prepended mark before the joining space, or a combining or spacing
  // mark after it, folds the space into one grapheme with its neighbour,
  // so the joined line is not the sum of its pieces plus one cell.
  const neighbours = ["\u0d4e", "\u0600", "a"];
  const starts = ["\u093e", "\u0301", "\u0903", "\u200d", "\u{1f3fb}", "b"];
  let compared = 0;
  for (const before of neighbours) {
    for (const after of starts) {
      for (const tail of ["", "x", "xx", "abc/def-ghi"]) {
        const value = `w${before} ${after}${tail} ${before}${after} z`;
        for (let width = 1; width <= 14; width += 1) {
          compared += 1;
          assertSame(
            "wrapText",
            { value, width },
            () => linear.wrapText(value, width),
            () => reference.wrapText(value, width),
          );
        }
      }
    }
  }
  assert(compared > 0);
});

Deno.test("a path's last name stays whole exactly when the reference keeps it whole", () => {
  const random = generator(0x9a7);
  const names = [
    "agent",
    "homepage-session",
    "b2c3d4",
    "x",
    "project.worktrees",
  ];
  for (let index = 0; index < 400; index += 1) {
    const words = Array.from({ length: integer(random, 1, 12) }, () => {
      const segments = integer(random, 1, 5);
      return random() < 0.5
        ? pick(random, ["to", "drop", "it", "the", "a"])
        : Array.from({ length: segments }, () => pick(random, names))
          .join(pick(random, ["/", "-", "/"]));
    });
    const value = words.join(" ");
    const width = integer(random, 3, 40);
    assertSame(
      "wrapText",
      { value, width },
      () => linear.wrapText(value, width),
      () => reference.wrapText(value, width),
    );
  }
});
