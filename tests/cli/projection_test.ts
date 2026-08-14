import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import {
  ANSI_16_RGB,
  ANSI_256_RGB,
  type TerminalRgbColor,
} from "../../src/cli/ansi-palette.ts";
import { renderStyledSpans, stripAnsi, styleText } from "../../src/cli/ansi.ts";
import { renderBadgeCli } from "../../src/generated/cli-renderers.ts";
import {
  projectTerminalHtml,
  projectTerminalSpans,
  terminalLinkHref,
  TerminalProjectionError,
  terminalSpanCss,
} from "../../src/cli/projection.ts";
import { terminalThemes, terminalToneColor } from "../../src/cli/theme.ts";
import { testCapabilities } from "./helpers.ts";

const ESC = "\u001b";
const BEL = "\u0007";
const ST = `${ESC}\\`;

function paletteEntry(
  palette: readonly TerminalRgbColor[],
  index: number,
): TerminalRgbColor {
  const color = palette[index];
  assert(color !== undefined, `palette has no index ${index}`);
  return color;
}

function projectedText(output: string): string {
  return projectTerminalSpans(output).map(({ text }) => text).join("");
}

Deno.test("projection round-trips the real emitter at every colour depth", () => {
  const accent = terminalToneColor(terminalThemes.dark, "accent");
  const style = { bold: true as const, color: accent };

  const none = styleText("plain", style, testCapabilities());
  assertEquals(projectTerminalSpans(none), [{ text: "plain" }]);

  const ansi16 = styleText(
    "sixteen",
    style,
    testCapabilities({ colorDepth: "ansi16" }),
  );
  assertEquals(projectTerminalSpans(ansi16), [{
    text: "sixteen",
    style: { bold: true, color: paletteEntry(ANSI_16_RGB, accent.ansi16) },
  }]);

  const ansi256 = styleText(
    "extended",
    style,
    testCapabilities({ colorDepth: "ansi256" }),
  );
  assertEquals(projectTerminalSpans(ansi256), [{
    text: "extended",
    style: { bold: true, color: paletteEntry(ANSI_256_RGB, accent.ansi256) },
  }]);

  const truecolor = styleText(
    "exact",
    style,
    testCapabilities({ colorDepth: "truecolor" }),
  );
  assertEquals(projectTerminalSpans(truecolor), [{
    text: "exact",
    style: {
      bold: true,
      color: { red: accent.red, green: accent.green, blue: accent.blue },
    },
  }]);
});

Deno.test("projection decodes every emitted attribute and span boundary", () => {
  const capabilities = testCapabilities({ colorDepth: "truecolor" });
  const output = renderStyledSpans([
    {
      text: "Discern",
      style: {
        bold: true,
        italic: true,
        underline: true,
        strikethrough: true,
        color: terminalToneColor(terminalThemes.dark, "success"),
      },
    },
    { text: " plain " },
    { text: "quiet", style: { dim: true } },
  ], capabilities);
  const success = terminalToneColor(terminalThemes.dark, "success");
  assertEquals(projectTerminalSpans(output), [
    {
      text: "Discern",
      style: {
        bold: true,
        italic: true,
        underline: true,
        strikethrough: true,
        color: {
          red: success.red,
          green: success.green,
          blue: success.blue,
        },
      },
    },
    { text: " plain " },
    { text: "quiet", style: { dim: true } },
  ]);
});

Deno.test("projection preserves Unicode, ASCII, and rendered component text", () => {
  assertEquals(projectedText("A👩‍💻B ◮ é"), "A👩‍💻B ◮ é");
  for (
    const colorDepth of ["none", "ansi16", "ansi256", "truecolor"] as const
  ) {
    for (const unicode of [true, false]) {
      const output = renderBadgeCli(
        { label: "Ready", dot: true, tone: "success" },
        testCapabilities({ colorDepth, unicode }),
      );
      assertEquals(
        projectedText(output),
        stripAnsi(output),
        `${colorDepth}/${unicode ? "unicode" : "ascii"} lost frame text`,
      );
    }
  }
});

Deno.test("projection scopes hyperlink envelopes independently of SGR resets", () => {
  for (const terminator of [BEL, ST]) {
    const output =
      `${ESC}]8;;https://discern.sh${terminator}${ESC}[1mHome${ESC}[0m plain${ESC}]8;;${terminator} after`;
    assertEquals(projectTerminalSpans(output), [
      { text: "Home", style: { bold: true }, link: "https://discern.sh" },
      { text: " plain", link: "https://discern.sh" },
      { text: " after" },
    ]);
  }
});

Deno.test("projection follows hyperlink parameters and target switches", () => {
  const output =
    `${ESC}]8;id=doc;https://discern.sh/a${BEL}first${ESC}]8;;https://discern.sh/b${ST}second${ESC}]8;;${BEL}done`;
  assertEquals(projectTerminalSpans(output), [
    { text: "first", link: "https://discern.sh/a" },
    { text: "second", link: "https://discern.sh/b" },
    { text: "done" },
  ]);
});

Deno.test("projection rejects input outside the emitted repertoire", () => {
  const rejects = (input: string, message: string) => {
    const error = assertThrows(
      () => projectTerminalSpans(input),
      TerminalProjectionError,
      message,
    );
    assertEquals(error.name, "TerminalProjectionError");
  };
  rejects(`${ESC}[2K`, "does not support the terminal sequence");
  rejects(`${ESC}[1G`, "does not support the terminal sequence");
  rejects(`${ESC}[?25l`, "does not support the terminal sequence");
  rejects(`${ESC}]0;title${BEL}`, "does not support the terminal sequence");
  rejects(`${ESC}[39m`, "does not support SGR code 39");
  rejects(`${ESC}[48;2;0;0;0m`, "does not support SGR code 48");
  rejects(`${ESC}[22m`, "does not support SGR code 22");
  rejects(`${ESC}[m`, "malformed SGR sequence");
  rejects(`${ESC}[1;;3m`, "malformed SGR sequence");
  rejects(`${ESC}[38;2;300;0;0m`, "invalid truecolour channel");
  rejects(`${ESC}[38;5;256m`, "palette index 256");
  rejects(`${ESC}[38;6;1m`, "does not support SGR code 38");
  rejects(`bare${BEL}bell`, "unsupported control character");
  rejects("form\ffeed", "unsupported control character");
  rejects(`${ESC}]8;;https://discern.sh`, "unterminated hyperlink envelope");
  rejects(`${ESC}]8;no-target${BEL}`, "without a target field");
  rejects(
    `${ESC}]8;;https://discern.sh${BEL}open`,
    "ended inside an open hyperlink envelope",
  );
});

Deno.test("projection accepts newlines and tabs as frame text", () => {
  assertEquals(projectTerminalSpans("one\n\ttwo\n"), [
    { text: "one\n\ttwo\n" },
  ]);
});

Deno.test("span styles map to the shared browser declarations", () => {
  assertEquals(
    terminalSpanCss({
      bold: true,
      dim: true,
      italic: true,
      underline: true,
      strikethrough: true,
      color: { red: 12, green: 34, blue: 56 },
    }),
    {
      color: "rgb(12 34 56)",
      fontStyle: "italic",
      fontWeight: 700,
      opacity: 0.68,
      textDecorationLine: "underline line-through",
    },
  );
  assertEquals(terminalSpanCss({ underline: true }), {
    textDecorationLine: "underline",
  });
  assertEquals(terminalSpanCss({}), {});
});

Deno.test("hyperlink targets resolve to safe hrefs only", () => {
  assertEquals(
    terminalLinkHref("https://discern.sh/docs"),
    "https://discern.sh/docs",
  );
  assertEquals(
    terminalLinkHref("http://localhost:8010/"),
    "http://localhost:8010/",
  );
  assertEquals(
    terminalLinkHref("mailto:hello@discern.sh"),
    "mailto:hello@discern.sh",
  );
  assertEquals(
    terminalLinkHref("file:///tmp/report.html"),
    "file:///tmp/report.html",
  );
  assertEquals(terminalLinkHref("javascript:alert(1)"), undefined);
  assertEquals(terminalLinkHref("data:text/html,x"), undefined);
  assertEquals(terminalLinkHref("relative/path"), undefined);
  assertEquals(terminalLinkHref(""), undefined);
});

Deno.test("projected HTML is self-contained, escaped, and theme-coloured", () => {
  const capabilities = testCapabilities({ colorDepth: "truecolor" });
  const output = styleText(
    `<danger> & "quoted"`,
    { bold: true, color: terminalToneColor(terminalThemes.dark, "danger") },
    capabilities,
  );
  const html = projectTerminalHtml(output);
  assert(
    html.startsWith("<pre style="),
    "projection must render one pre shell",
  );
  assertStringIncludes(html, "&lt;danger&gt; &amp; &quot;quoted&quot;");
  assertStringIncludes(html, "font-weight:700");
  assertStringIncludes(html, "font-family:ui-monospace");
  assert(!html.includes("<danger>"), "raw text leaked unescaped");

  const dark = terminalThemes.dark.colors["--discern-color-canvas"];
  const light = terminalThemes.light.colors["--discern-color-canvas"];
  assert(dark !== undefined && light !== undefined);
  assertStringIncludes(
    html,
    `background-color:rgb(${dark.red} ${dark.green} ${dark.blue})`,
  );
  assertStringIncludes(
    projectTerminalHtml(output, { theme: "light" }),
    `background-color:rgb(${light.red} ${light.green} ${light.blue})`,
  );
});

Deno.test("projected HTML links safe targets and neutralises unsafe ones", () => {
  const linked = projectTerminalHtml(
    `${ESC}]8;;https://discern.sh${BEL}${ESC}[4mdocs${ESC}[0m${ESC}]8;;${BEL}`,
  );
  assertStringIncludes(
    linked,
    `<a href="https://discern.sh" target="_blank" rel="noopener noreferrer" style="text-decoration-line:underline">docs</a>`,
  );

  const unsafe = projectTerminalHtml(
    `${ESC}]8;;javascript:alert(1)${BEL}click${ESC}]8;;${BEL}`,
  );
  assert(!unsafe.includes("<a "), "unsafe hyperlink target became an anchor");
  assertStringIncludes(unsafe, "click");
});
