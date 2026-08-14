import { assertEquals, assertThrows } from "@std/assert";
import {
  renderStyledSpans,
  stripAnsi,
  styleHyperlink,
  styleText,
} from "../../src/cli/ansi.ts";
import {
  measureText,
  padText,
  truncateStyledText,
  truncateText,
  wrapStyledText,
  wrapText,
} from "../../src/cli/text.ts";
import type { TerminalColor } from "../../src/cli/theme.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";

const color: TerminalColor = {
  red: 12,
  green: 34,
  blue: 56,
  ansi256: 24,
  ansi16: 6,
};
const escape = String.fromCharCode(27);
const truecolor = testTerminalCapabilities({ colorDepth: "truecolor" });

Deno.test("styled wrapping re-attributes one style across every line", () => {
  assertEquals(
    wrapStyledText(styleText("alpha beta gamma", { color }, truecolor), 10),
    [
      `${escape}[38;2;12;34;56malpha beta${escape}[0m`,
      `${escape}[38;2;12;34;56mgamma${escape}[0m`,
    ],
  );
  assertEquals(
    wrapStyledText(
      styleText(
        "alpha beta gamma",
        { color },
        testTerminalCapabilities({
          colorDepth: "ansi16",
        }),
      ),
      10,
    ),
    [`${escape}[36malpha beta${escape}[0m`, `${escape}[36mgamma${escape}[0m`],
  );
  assertEquals(
    wrapStyledText(
      styleText(
        "alpha beta gamma",
        { color },
        testTerminalCapabilities({
          colorDepth: "ansi256",
        }),
      ),
      10,
    ),
    [
      `${escape}[38;5;24malpha beta${escape}[0m`,
      `${escape}[38;5;24mgamma${escape}[0m`,
    ],
  );
  assertEquals(
    wrapStyledText(
      styleText("alpha beta gamma", { color }, testTerminalCapabilities()),
      10,
    ),
    ["alpha beta", "gamma"],
  );
});

Deno.test("nested span styling survives wrapping across line breaks", () => {
  const rendered = renderStyledSpans([
    { text: "tone ", style: { color } },
    { text: "bold tail", style: { color, bold: true } },
  ], truecolor);
  assertEquals(wrapStyledText(rendered, 6), [
    `${escape}[38;2;12;34;56mtone${escape}[0m`,
    `${escape}[1;38;2;12;34;56mbold${escape}[0m`,
    `${escape}[1;38;2;12;34;56mtail${escape}[0m`,
  ]);
});

Deno.test("hyperlinks close at each wrapped line end and reopen on the next", () => {
  const url = "https://discern.sh/docs";
  const linked = styleHyperlink("discern documentation", url, truecolor);
  assertEquals(wrapStyledText(linked, 13), [
    `${escape}]8;;${url}${escape}\\discern${escape}]8;;${escape}\\`,
    `${escape}]8;;${url}${escape}\\documentation${escape}]8;;${escape}\\`,
  ]);
});

Deno.test("styled wrapping preserves grapheme clusters inside styled runs", () => {
  assertEquals(
    wrapStyledText(
      styleText(
        "界界界",
        { color },
        testTerminalCapabilities({ colorDepth: "ansi256" }),
      ),
      4,
    ),
    [`${escape}[38;5;24m界界${escape}[0m`, `${escape}[38;5;24m界${escape}[0m`],
  );
  assertEquals(
    wrapStyledText(styleText("👩‍💻 tools", { bold: true }, truecolor), 5),
    [`${escape}[1m👩‍💻${escape}[0m`, `${escape}[1mtools${escape}[0m`],
  );
});

Deno.test("styled wrapping mirrors plain paragraph and blank-line handling", () => {
  const capabilities = testTerminalCapabilities({ colorDepth: "ansi16" });
  assertEquals(
    wrapStyledText(
      styleText("first line\nsecond", { color }, capabilities),
      20,
    ),
    [`${escape}[36mfirst line${escape}[0m`, `${escape}[36msecond${escape}[0m`],
  );
  assertEquals(
    wrapStyledText(`${escape}[1ma\n\nb${escape}[0m`, 10),
    [`${escape}[1ma${escape}[0m`, "", `${escape}[1mb${escape}[0m`],
  );
  assertEquals(wrapStyledText("", 10), [""]);
  assertEquals(wrapStyledText(`${escape}[1m${escape}[0m`, 10), [""]);
  assertEquals(
    wrapStyledText("alpha beta gamma", 10),
    [...wrapText("alpha beta gamma", 10)],
  );
});

Deno.test("styling left open at end of input still closes on every line", () => {
  assertEquals(wrapStyledText(`${escape}[1mbold and tall`, 4), [
    `${escape}[1mbold${escape}[0m`,
    `${escape}[1mand${escape}[0m`,
    `${escape}[1mtall${escape}[0m`,
  ]);
});

Deno.test("single-line styled wrapping round-trips package emission bytes", () => {
  const single = styleText("discern", { bold: true, color }, truecolor);
  assertEquals(wrapStyledText(single, 40), [single]);
  const spans = renderStyledSpans([
    { text: "A", style: { color } },
    { text: "/" },
    { text: "B", style: { italic: true } },
  ], testTerminalCapabilities({ colorDepth: "ansi256" }));
  assertEquals(wrapStyledText(spans, 40), [spans]);
  const mixed = renderStyledSpans([
    { text: "red ", style: { color } },
    { text: "plain" },
  ], testTerminalCapabilities({ colorDepth: "ansi16" }));
  assertEquals(wrapStyledText(mixed, 40), [mixed]);
  const linked = styleHyperlink("docs", "https://discern.sh", truecolor, {
    bold: true,
  });
  assertEquals(wrapStyledText(linked, 40), [linked]);
});

Deno.test("styled hyperlink labels wrap with both envelope and style intact", () => {
  const url = "https://discern.sh/docs";
  const linked = styleHyperlink("discern documentation", url, truecolor, {
    bold: true,
  });
  const lines = wrapStyledText(linked, 13);
  assertEquals(lines, [
    `${escape}]8;;${url}${escape}\\${escape}[1mdiscern${escape}[0m${escape}]8;;${escape}\\`,
    `${escape}]8;;${url}${escape}\\${escape}[1mdocumentation${escape}[0m${escape}]8;;${escape}\\`,
  ]);
  for (const line of lines) {
    assertEquals(wrapStyledText(line, 13), [line]);
  }
});

Deno.test("distinct hyperlinks separate cleanly across runs and lines", () => {
  const first = styleHyperlink("alpha", "https://a.example", truecolor);
  const second = styleHyperlink("beta", "https://b.example", truecolor);
  const joined = `${first} ${second}`;
  assertEquals(wrapStyledText(joined, 20), [joined]);
  assertEquals(wrapStyledText(joined, 5), [first, second]);
});

Deno.test("a hyperlink between styled neighbours keeps every boundary on one line", () => {
  const ansi16 = testTerminalCapabilities({ colorDepth: "ansi16" });
  const url = "https://discern.sh";
  const composed = `${styleText("see ", { color }, ansi16)}${
    styleHyperlink("docs", url, truecolor)
  } now`;
  assertEquals(wrapStyledText(composed, 20), [composed]);
  assertEquals(wrapStyledText(composed, 8), [
    `${escape}[36msee ${escape}[0m${escape}]8;;${url}${escape}\\docs${escape}]8;;${escape}\\`,
    "now",
  ]);
});

Deno.test("a hyperlink label wider than the width splits with the envelope reopening", () => {
  const url = "https://discern.sh/docs";
  const lines = wrapStyledText(
    styleHyperlink("documentation", url, truecolor),
    6,
  );
  assertEquals(lines, [
    `${escape}]8;;${url}${escape}\\docume${escape}]8;;${escape}\\`,
    `${escape}]8;;${url}${escape}\\ntatio${escape}]8;;${escape}\\`,
    `${escape}]8;;${url}${escape}\\n${escape}]8;;${escape}\\`,
  ]);
  for (const line of lines) {
    assertEquals(measureText(line) <= 6, true);
    assertEquals(wrapStyledText(line, 6), [line]);
  }
});

Deno.test("an open hyperlink persists across a blank paragraph without dressing it", () => {
  const url = "https://discern.sh";
  const torn = `${escape}]8;;${url}${escape}\\a\n\nb${escape}]8;;${escape}\\`;
  assertEquals(wrapStyledText(torn, 10), [
    `${escape}]8;;${url}${escape}\\a${escape}]8;;${escape}\\`,
    "",
    `${escape}]8;;${url}${escape}\\b${escape}]8;;${escape}\\`,
  ]);
});

Deno.test("styled truncation respects hyperlink edges exactly", () => {
  const url = "https://discern.sh/docs";
  const linked = styleHyperlink("docs", url, truecolor);
  const composed = `${linked} tail`;
  assertEquals(truncateStyledText(composed, 9), composed);
  assertEquals(truncateStyledText(composed, 5), `${linked}…`);
  assertEquals(
    truncateStyledText(composed, 3),
    `${escape}]8;;${url}${escape}\\do${escape}]8;;${escape}\\…`,
  );
  assertEquals(truncateStyledText(`head ${linked}`, 3), "he…");
  assertEquals(
    truncateStyledText(`${escape}[1mbold`, 10),
    `${escape}[1mbold${escape}[0m`,
  );
});

Deno.test("styled truncation mirrors plain marker and depth-none behaviour", () => {
  const ansi16 = testTerminalCapabilities({ colorDepth: "ansi16" });
  assertEquals(
    truncateStyledText(
      styleText("abcdef", { color }, testTerminalCapabilities()),
      4,
    ),
    truncateText("abcdef", 4),
  );
  assertEquals(
    truncateStyledText(styleText("abcdef", { color }, ansi16), 2, "..."),
    "..",
  );
  assertEquals(
    truncateStyledText(styleText("abcdef", { color }, ansi16), 1),
    "…",
  );
});

Deno.test("the plain family measures and wraps hyperlinked strings by label alone", () => {
  const url = "https://discern.sh/docs";
  const linked = styleHyperlink("docs", url, truecolor);
  assertEquals(measureText(linked), 4);
  assertEquals(truncateText(linked, 3), "do…");
  assertEquals(
    wrapText(styleHyperlink("discern documentation", url, truecolor), 13),
    ["discern", "documentation"],
  );
});

Deno.test("styled truncation keeps styling and never leaves a hyperlink open", () => {
  const ansi16 = testTerminalCapabilities({ colorDepth: "ansi16" });
  assertEquals(
    truncateStyledText(styleText("ab\ncd", { color }, ansi16), 10),
    `${escape}[36mab cd${escape}[0m`,
  );
  assertEquals(
    truncateStyledText(styleText("abcdef", { color }, ansi16), 4),
    `${escape}[36mabc${escape}[0m…`,
  );
  assertEquals(
    truncateStyledText(styleText("abcdef", { color }, ansi16), 4, "."),
    `${escape}[36mabc${escape}[0m.`,
  );
  const url = "https://discern.sh/docs";
  const linked = styleHyperlink("discern documentation", url, truecolor);
  assertEquals(
    truncateStyledText(linked, 10),
    `${escape}]8;;${url}${escape}\\discern d${escape}]8;;${escape}\\…`,
  );
  assertEquals(stripAnsi(truncateStyledText(linked, 10)), "discern d…");
  assertEquals(
    truncateStyledText(styleText("👩‍💻tools", { bold: true }, truecolor), 4),
    `${escape}[1m👩‍💻t${escape}[0m…`,
  );
  assertEquals(
    truncateStyledText(styleText("abc", { bold: true }, truecolor), 0),
    "",
  );
  assertEquals(
    stripAnsi(truncateStyledText(styleText("abcdef", { color }, ansi16), 4)),
    truncateText("abcdef", 4),
  );
});

Deno.test("padding styled and hyperlinked text aligns by visible cells", () => {
  const styled = styleText(
    "界",
    { color },
    testTerminalCapabilities({ colorDepth: "ansi16" }),
  );
  assertEquals(padText(styled, 4), `${styled}  `);
  const linked = styleHyperlink("docs", "https://discern.sh", truecolor);
  assertEquals(padText(linked, 6, "end"), `  ${linked}`);
  assertEquals(padText(linked, 6, "center"), ` ${linked} `);
});

Deno.test("styled wrapping rejects foreign, malformed, and unterminated sequences", () => {
  const bell = String.fromCharCode(7);
  const rejected = [
    `${escape}[2J`,
    `${escape}[31`,
    `${escape}[m`,
    `${escape}[22m`,
    `${escape}]0;title${bell}`,
    `${escape}]8;;https://discern.sh${bell}label`,
    `${escape}]8;;https://discern.sh`,
    `${escape}[38;5;300mx${escape}[0m`,
    `${escape}[1;;3mx${escape}[0m`,
  ];
  for (const value of rejected) {
    assertThrows(() => wrapStyledText(value, 10), TypeError);
  }
  assertThrows(() => wrapStyledText("x", 0), TypeError);
});
