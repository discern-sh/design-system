import { assertEquals } from "@std/assert";
import { renderStyledSpans, stripAnsi, styleText } from "../../src/cli/ansi.ts";
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

Deno.test("ANSI emission degrades through truecolour, 256, 16, and none", () => {
  assertEquals(
    styleText(
      "discern",
      { bold: true, color },
      testTerminalCapabilities({ colorDepth: "truecolor" }),
    ),
    `${escape}[1;38;2;12;34;56mdiscern${escape}[0m`,
  );
  assertEquals(
    styleText(
      "discern",
      { color },
      testTerminalCapabilities({ colorDepth: "ansi256" }),
    ),
    `${escape}[38;5;24mdiscern${escape}[0m`,
  );
  assertEquals(
    styleText(
      "discern",
      { color },
      testTerminalCapabilities({ colorDepth: "ansi16" }),
    ),
    `${escape}[36mdiscern${escape}[0m`,
  );
  assertEquals(
    styleText("discern", { bold: true, color }, testTerminalCapabilities()),
    "discern",
  );
});

Deno.test("styled spans compose independently and strip to source text", () => {
  const rendered = renderStyledSpans([
    { text: "A", style: { color } },
    { text: "/" },
    { text: "B", style: { italic: true } },
  ], testTerminalCapabilities({ colorDepth: "ansi256" }));
  assertEquals(stripAnsi(rendered), "A/B");
  assertEquals(rendered.split(`${escape}[0m`).length - 1, 2);
});
