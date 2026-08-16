import { assertEquals, assertThrows } from "@std/assert";
import {
  renderStyledSpans,
  stripAnsi,
  styleHyperlink,
  styleText,
} from "../../src/cli/ansi.ts";
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

Deno.test("hyperlink authority gates on capability and never loses the label", () => {
  const url = "https://discern.sh/docs";
  const linked = styleHyperlink(
    "docs",
    url,
    testTerminalCapabilities({ colorDepth: "truecolor" }),
  );
  assertEquals(
    linked,
    `${escape}]8;;${url}${escape}\\docs${escape}]8;;${escape}\\`,
  );
  assertEquals(stripAnsi(linked), "docs");
  assertEquals(
    styleHyperlink(
      "docs",
      url,
      testTerminalCapabilities({ colorDepth: "truecolor" }),
      {
        bold: true,
      },
    ),
    `${escape}]8;;${url}${escape}\\${escape}[1mdocs${escape}[0m${escape}]8;;${escape}\\`,
  );
  assertEquals(
    styleHyperlink("docs", url, testTerminalCapabilities()),
    `docs (${url})`,
  );
  assertEquals(
    styleHyperlink("docs", url, testTerminalCapabilities(), { bold: true }),
    `docs (${url})`,
  );
  assertEquals(
    styleHyperlink(
      "https://discern.sh",
      "https://discern.sh",
      testTerminalCapabilities(),
    ),
    "https://discern.sh",
  );
  assertEquals(
    styleHyperlink(
      "docs",
      url,
      testTerminalCapabilities({ colorDepth: "ansi16", hyperlinks: false }),
      { bold: true },
    ),
    `${escape}[1mdocs${escape}[0m (${url})`,
  );
  assertEquals(
    styleHyperlink("docs", url, testTerminalCapabilities({ hyperlinks: true })),
    `${escape}]8;;${url}${escape}\\docs${escape}]8;;${escape}\\`,
  );
});

Deno.test("hyperlink authority preserves a multi-style label as one target", () => {
  const url = "https://discern.sh/docs";
  const capabilities = testTerminalCapabilities({ colorDepth: "truecolor" });
  const linked = styleHyperlink(
    [
      { text: "read ", style: { italic: true } },
      { text: "now", style: { bold: true } },
    ],
    url,
    capabilities,
  );
  assertEquals(
    linked,
    `${escape}]8;;${url}${escape}\\${escape}[3mread ${escape}[0m${escape}[1mnow${escape}[0m${escape}]8;;${escape}\\`,
  );
  assertEquals(stripAnsi(linked), "read now");
  assertEquals(
    styleHyperlink(
      [
        { text: "read ", style: { italic: true } },
        { text: "now", style: { bold: true } },
      ],
      url,
      testTerminalCapabilities(),
    ),
    `read now (${url})`,
  );
  assertThrows(
    () => styleHyperlink([], url, capabilities),
    TypeError,
    "non-empty",
  );
});

Deno.test("hyperlink authority rejects control-bearing and non-ASCII input", () => {
  const capabilities = testTerminalCapabilities();
  const url = "https://discern.sh";
  assertThrows(() => styleHyperlink("", url, capabilities), TypeError);
  assertThrows(() => styleHyperlink("a\nb", url, capabilities), TypeError);
  assertThrows(() => styleHyperlink("docs", "", capabilities), TypeError);
  assertThrows(
    () => styleHyperlink("docs", `${url}/a b`, capabilities),
    TypeError,
  );
  assertThrows(
    () => styleHyperlink("docs", `${url}/${escape}]`, capabilities),
    TypeError,
  );
  assertThrows(
    () => styleHyperlink("docs", `${url}/café`, capabilities),
    TypeError,
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
  ], testTerminalCapabilities({ colorDepth: "ansi256" }));
  assertEquals(stripAnsi(rendered), "A/B");
  assertEquals(rendered.split(`${escape}[0m`).length - 1, 2);
});
