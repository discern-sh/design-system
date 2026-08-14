import { assertEquals, assertThrows } from "@std/assert";
import {
  renderStyledSpans,
  stripAnsi,
  styleHyperlink,
  styleText,
} from "../../src/cli/ansi.ts";
import {
  padText,
  truncateStyledText,
  truncateText,
  wrapStyledText,
  wrapText,
} from "../../src/cli/text.ts";
import type { TerminalColor } from "../../src/cli/theme.ts";
import { testCapabilities } from "./helpers.ts";

const color: TerminalColor = {
  red: 12,
  green: 34,
  blue: 56,
  ansi256: 24,
  ansi16: 6,
};
const escape = String.fromCharCode(27);
const truecolor = testCapabilities({ colorDepth: "truecolor" });

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
        testCapabilities({
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
        testCapabilities({
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
      styleText("alpha beta gamma", { color }, testCapabilities()),
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
        testCapabilities({ colorDepth: "ansi256" }),
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
  const capabilities = testCapabilities({ colorDepth: "ansi16" });
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
  ], testCapabilities({ colorDepth: "ansi256" }));
  assertEquals(wrapStyledText(spans, 40), [spans]);
  const mixed = renderStyledSpans([
    { text: "red ", style: { color } },
    { text: "plain" },
  ], testCapabilities({ colorDepth: "ansi16" }));
  assertEquals(wrapStyledText(mixed, 40), [mixed]);
  const linked = styleHyperlink("docs", "https://discern.sh", truecolor, {
    bold: true,
  });
  assertEquals(wrapStyledText(linked, 40), [linked]);
});

Deno.test("styled truncation keeps styling and never leaves a hyperlink open", () => {
  const ansi16 = testCapabilities({ colorDepth: "ansi16" });
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
    testCapabilities({ colorDepth: "ansi16" }),
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
