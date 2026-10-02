import { assert, assertEquals, assertThrows } from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  formatKeyChord,
  type KeyHints,
  layoutKeyHintsCli,
  normalizeKeyChord,
  renderKeyHintsCli,
} from "../../src/cli/key-hints.ts";
import { measureText } from "../../src/cli/text.ts";
import { deriveTerminalTheme } from "../../src/cli/theme.ts";
import type { TerminalKeyName } from "../../src/cli/interactive/keys.ts";
import { TERMINAL_KEY_SEQUENCES } from "../../src/cli/interactive/testing.ts";

const capabilities = (
  columns: number,
  overrides: Partial<TerminalCapabilities> = {},
): TerminalCapabilities => ({
  colorDepth: "none",
  columns,
  unicode: true,
  ...overrides,
});

const right = [
  { key: ".", label: "Actions" },
  { key: "ctrl-k", label: "Commands" },
] as const;
const extra = [
  { key: "?", label: "Keys" },
  { key: "/", label: "Filter" },
  { key: "n", label: "New item…" },
  { key: "q", label: "Quit" },
] as const;
const overview: KeyHints = {
  left: [
    { key: "enter", label: "Open…" },
    { key: "v", label: "View details" },
    { key: "g", label: "Approve item…" },
  ],
  right,
  extra,
};

function plain(hints: KeyHints, width: number, unicode = true) {
  return stripAnsi(
    renderKeyHintsCli(hints, width, capabilities(width, { unicode })),
  );
}

Deno.test("key hints collapse through the documented ladder", () => {
  assertEquals(
    plain(overview, 116),
    "↵ Open…   v View details   g Approve item…        . Actions   ^K Commands   ? Keys   / Filter   n New item…   q Quit",
  );
  assertEquals(
    plain(overview, 76),
    "↵ Open…   v View details   g Approve item…           . Actions   ^K Commands",
  );
  assertEquals(
    plain(overview, 56),
    "↵ Open…   v View details         . Actions   ^K Commands",
  );
  assertEquals(
    plain(overview, 36, false),
    "Enter Open...          . Actions  ^K",
  );
  assertEquals(plain(overview, 28), "↵ Open…        . Actions  ^K");
  // A bare one-character key drops whole rather than standing unlabelled.
  assertEquals(plain(overview, 16), "↵ Open…       ^K");
  for (let width = 0; width <= 120; width += 1) {
    const layout = layoutKeyHintsCli(overview, width, capabilities(width));
    for (const placed of layout.placed) {
      assert(
        placed.labelShown || !/^[!-~]$/u.test(
          formatKeyChord(placed.hint.key, { unicode: true }),
        ),
        `width ${width}: a bare ${String(placed.hint.key)} lost its label`,
      );
    }
  }
});

Deno.test("extras join only while the whole left cluster leaves room", () => {
  const two: KeyHints = {
    left: [{ key: "enter", label: "Open…" }, { key: "v", label: "View" }],
    right,
    extra,
  };
  assertEquals(
    plain(two, 76),
    "↵ Open…   v View                 . Actions   ^K Commands   ? Keys   / Filter",
  );
  assertEquals(
    plain({ ...two, extra: [] }, 76),
    "↵ Open…   v View                                     . Actions   ^K Commands",
  );
});

Deno.test("every width yields exactly that many cells and a shrinking ladder", () => {
  let previous = Number.POSITIVE_INFINITY;
  for (let width = 130; width >= 0; width -= 1) {
    const layout = layoutKeyHintsCli(overview, width, capabilities(width));
    assertEquals(measureText(layout.line), width, `width ${width}`);
    const shown = layout.placed.length +
      layout.placed.filter((hint) => hint.labelShown).length;
    assert(shown <= previous, `width ${width} showed more than ${width + 1}`);
    previous = shown;
    const text = stripAnsi(layout.line);
    for (const hint of layout.placed) {
      const cells = [...text].slice(hint.start, hint.end).join("");
      assert(
        cells.startsWith(formatKeyChord(hint.hint.key, { unicode: true })),
        `width ${width}: ${cells}`,
      );
    }
  }
  const narrow = layoutKeyHintsCli(overview, 28, capabilities(28));
  assertEquals(
    narrow.placed.map((hint) => hint.hint.label),
    [
      "Open…",
      ".",
      "^K",
    ].map((label, index) =>
      index === 0 ? label : narrow.placed[index]?.hint.label
    ),
  );
  assertEquals(narrow.placed.map((hint) => hint.cluster), [
    "left",
    "right",
    "right",
  ]);
});

Deno.test("keys stay distinct from their labels at every colour depth", () => {
  const theme = deriveTerminalTheme("dark", { accent: 255 });
  const accent = theme.colors["--discern-color-accent-700"];
  const ink = theme.colors["--discern-color-ink"];
  const muted = theme.colors["--discern-color-ink-muted"];
  assert(accent !== undefined && ink !== undefined && muted !== undefined);
  const line = renderKeyHintsCli(
    overview,
    76,
    capabilities(76, { colorDepth: "truecolor" }),
    { theme: "dark", appearance: { accent: 255 } },
  );
  const rgb = (color: typeof ink) =>
    `${color.red};${color.green};${color.blue}`;
  assert(line.includes(`\x1b[1;38;2;${rgb(accent)}m↵\x1b[0m`));
  assert(line.includes(`\x1b[1;38;2;${rgb(ink)}mv\x1b[0m`));
  assert(line.includes(`\x1b[38;2;${rgb(muted)}mView details\x1b[0m`));
  assertEquals(
    renderKeyHintsCli(overview, 76, capabilities(76)),
    plain(overview, 76),
    "without colour the hints carry no styling",
  );
});

Deno.test("a cluster without a primary draws every key in ink", () => {
  const theme = deriveTerminalTheme("dark", { accent: 255 });
  const accent = theme.colors["--discern-color-accent-700"];
  const ink = theme.colors["--discern-color-ink"];
  assert(accent !== undefined && ink !== undefined);
  const rgb = (color: typeof ink) =>
    `${color.red};${color.green};${color.blue}`;
  const hints: KeyHints = {
    primary: false,
    left: [{ key: "escape", label: "Hide" }, { key: "d", label: "Plan" }],
  };
  const line = renderKeyHintsCli(
    hints,
    40,
    capabilities(40, { colorDepth: "truecolor" }),
    { theme: "dark", appearance: { accent: 255 } },
  );
  assert(!line.includes(`38;2;${rgb(accent)}m`), "no key takes the accent");
  assert(line.includes(`\x1b[1;38;2;${rgb(ink)}mEsc\x1b[0m`));
  // Without a primary the first hint still holds its place at any width.
  assertEquals(
    stripAnsi(renderKeyHintsCli(hints, 9, capabilities(9))),
    "Esc Hide ",
  );
});

Deno.test("ranked left hints outlast lower ranks, whatever their order", () => {
  const hints: KeyHints = {
    left: [
      { key: "enter", label: "Land" },
      { key: ["left", "right"], label: "Choose" },
      { key: "c", label: "Command" },
      { key: "u", label: "Update", rank: 1 },
      { key: "escape", label: "Close", rank: 2 },
    ],
  };
  const shown = (width: number) =>
    layoutKeyHintsCli(hints, width, capabilities(width)).placed.map((
      placed,
    ) => placed.hint.label);
  assertEquals(shown(80), ["Land", "Choose", "Command", "Update", "Close"]);
  assertEquals(shown(40), ["Land", "Choose", "Update", "Close"]);
  assertEquals(shown(28), ["Land", "Update", "Close"]);
  assertEquals(shown(20), ["Land", "Close"]);
  assertEquals(shown(15), ["Land"]);
  // At every width, no shown hint outranks a dropped one, and the order
  // on the line is the order given.
  for (let width = 0; width <= 80; width += 1) {
    const kept = layoutKeyHintsCli(hints, width, capabilities(width)).placed
      .map((placed) => placed.hint);
    const dropped = hints.left.filter((hint) => !kept.includes(hint));
    for (const hint of kept.slice(1)) {
      assert(
        dropped.every((other) => (other.rank ?? 0) <= (hint.rank ?? 0)),
        `${width}: kept ${hint.label} over a higher rank`,
      );
    }
    assertEquals(
      kept,
      hints.left.filter((hint) => kept.includes(hint)),
      `${width}: order`,
    );
  }
});

Deno.test("one-cell alternatives stay readable as one hint", () => {
  const unicode = { unicode: true };
  const ascii = { unicode: false };
  assertEquals(formatKeyChord(["up", "down"], unicode), "↑↓");
  assertEquals(formatKeyChord(["left", "right"], unicode), "←→");
  assertEquals(formatKeyChord(["up", "down", "k", "j"], unicode), "↑↓ k j");
  assertEquals(formatKeyChord(["right", "."], unicode), "→ .");
  assertEquals(formatKeyChord(["1", "2", "3", "4", "5"], unicode), "1–5");
  assertEquals(formatKeyChord(["1", "2", "3", "4", "5"], ascii), "1-5");
  assertEquals(formatKeyChord(["1", "2"], unicode), "1 2");
  assertEquals(formatKeyChord(["3", "4", "5", "7"], unicode), "3–5 7");
  // Wider names stand a space apart too, so a keys list has one separator.
  assertEquals(formatKeyChord(["up", "down", "k"], ascii), "Up Down k");
  assertEquals(formatKeyChord(["page-up", "page-down"], unicode), "PgUp PgDn");
  assertEquals(formatKeyChord(["home", "end"], unicode), "Home End");
  assertEquals(formatKeyChord(["tab", "shift-tab"], unicode), "Tab ⇧Tab");
  assertEquals(formatKeyChord(["ctrl-k", ":"], unicode), "^K :");
  assertEquals(formatKeyChord(["d", "ctrl-t"], unicode), "d ^T");
  assertEquals(formatKeyChord(["left", "right"], ascii), "Left Right");
});

Deno.test("every token of an alternatives hint is one key, an arrow pair, or a digit range", () => {
  const pool = [
    "up",
    "down",
    "left",
    "right",
    "enter",
    "escape",
    "page-up",
    "page-down",
    "home",
    "tab",
    "shift-tab",
    "ctrl-k",
    "j",
    "k",
    ".",
    "/",
    "?",
    "1",
    "2",
    "3",
    "4",
    "5",
  ];
  const arrows = new Set(["↑", "↓", "←", "→"]);
  for (const unicode of [true, false]) {
    const capabilities = { unicode };
    const single = new Set(
      pool.map((key) => formatKeyChord(key, capabilities)),
    );
    const range = unicode ? /^\d–\d$/u : /^\d-\d$/u;
    for (const first of pool) {
      for (const second of pool) {
        for (const third of pool) {
          const shown = formatKeyChord([first, second, third], capabilities);
          assert(!shown.includes("/") || [first, second, third].includes("/"));
          for (const token of shown.split(" ")) {
            const cells = [...token];
            assert(
              single.has(token) ||
                (unicode && cells.every((cell) => arrows.has(cell))) ||
                range.test(token),
              `${JSON.stringify([first, second, third])} reads "${shown}"`,
            );
          }
        }
      }
    }
  }
});

Deno.test("chords display as glyphs, carets, and words", () => {
  const unicode = { unicode: true };
  const ascii = { unicode: false };
  assertEquals(formatKeyChord("enter", unicode), "↵");
  assertEquals(formatKeyChord("enter", ascii), "Enter");
  assertEquals(formatKeyChord(["up", "down"], unicode), "↑↓");
  assertEquals(formatKeyChord(["up", "down"], ascii), "Up Down");
  assertEquals(formatKeyChord("shift-down", unicode), "⇧↓");
  assertEquals(formatKeyChord("shift-down", ascii), "Shift+Down");
  assertEquals(formatKeyChord("shift-tab", ascii), "Shift+Tab");
  assertEquals(formatKeyChord("ctrl-k", unicode), "^K");
  assertEquals(formatKeyChord("page-down", unicode), "PgDn");
  assertEquals(formatKeyChord("f12", unicode), "F12");
  assertEquals(formatKeyChord("D", unicode), "D");
  assertEquals(formatKeyChord("Letters", unicode), "Letters");
});

Deno.test("chord spellings normalise to the key decoder's names", () => {
  assertEquals(normalizeKeyChord("ctrl+k"), "ctrl-k");
  assertEquals(normalizeKeyChord("shift+down"), "shift-down");
  assertEquals(normalizeKeyChord("pageDown"), "page-down");
  assertEquals(normalizeKeyChord("esc"), "escape");
  assertEquals(normalizeKeyChord("F5"), "f5");
  assertEquals(normalizeKeyChord("D"), "D");
  assertEquals(normalizeKeyChord("Letters"), "Letters");
});

Deno.test("every decoded key name has a display form", () => {
  const names = Object.keys(TERMINAL_KEY_SEQUENCES) as TerminalKeyName[];
  for (const name of names) {
    assertEquals(normalizeKeyChord(name), name, name);
    for (const unicode of [true, false]) {
      const shown = formatKeyChord(name, { unicode });
      assert(shown !== name, `${name} has no display form`);
      assert(/^[\x20-\x7e]+$/u.test(shown) || unicode, `${name}: ${shown}`);
    }
  }
});

Deno.test("key hints reject impossible widths", () => {
  assertThrows(
    () => renderKeyHintsCli(overview, -1, capabilities(10)),
    TypeError,
  );
  assertThrows(
    () =>
      renderKeyHintsCli(
        { ...overview, compactBelowColumns: 1.5 },
        10,
        capabilities(10),
      ),
    TypeError,
  );
});
