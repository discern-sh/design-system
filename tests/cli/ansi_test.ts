import { assertEquals } from "@std/assert";
import { renderStyledSpans, stripAnsi, styleText } from "../../src/cli/ansi.ts";
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

Deno.test("ANSI emission degrades through truecolour, 256, 16, and none", () => {
  assertEquals(
    styleText(
      "discern",
      { bold: true, color },
      testCapabilities({ colorDepth: "truecolor" }),
    ),
    `${escape}[1;38;2;12;34;56mdiscern${escape}[0m`,
  );
  assertEquals(
    styleText(
      "discern",
      { color },
      testCapabilities({ colorDepth: "ansi256" }),
    ),
    `${escape}[38;5;24mdiscern${escape}[0m`,
  );
  assertEquals(
    styleText("discern", { color }, testCapabilities({ colorDepth: "ansi16" })),
    `${escape}[36mdiscern${escape}[0m`,
  );
  assertEquals(
    styleText("discern", { bold: true, color }, testCapabilities()),
    "discern",
  );
});

Deno.test("stripping treats OSC envelopes as zero-width and keeps labels", () => {
  const bell = String.fromCharCode(7);
  const linked =
    `${escape}]8;;https://discern.sh${escape}\\docs${escape}]8;;${escape}\\`;
  assertEquals(stripAnsi(linked), "docs");
  assertEquals(stripAnsi(`a${escape}]0;title${bell}b`), "ab");
  assertEquals(
    stripAnsi(`${escape}[1m${linked}${escape}[0m after`),
    "docs after",
  );
});

Deno.test("styled spans compose independently and strip to source text", () => {
  const rendered = renderStyledSpans([
    { text: "A", style: { color } },
    { text: "/" },
    { text: "B", style: { italic: true } },
  ], testCapabilities({ colorDepth: "ansi256" }));
  assertEquals(stripAnsi(rendered), "A/B");
  assertEquals(rendered.split(`${escape}[0m`).length - 1, 2);
});
