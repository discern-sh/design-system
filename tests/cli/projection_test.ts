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
import {
  renderStyledSpans,
  stripAnsi,
  styleHyperlink,
  styleText,
} from "../../src/cli/ansi.ts";
import { renderBadgeCli } from "../../src/generated/cli-renderers.ts";
import {
  projectTerminalCellRows,
  projectTerminalHtml,
  projectTerminalInlineHtml,
  projectTerminalSpans,
  projectTerminalTextRuns,
  terminalLinkHref,
  TerminalProjectionError,
  terminalSpanCss,
} from "../../src/cli/projection.ts";
import {
  terminalThemeColor,
  terminalThemes,
  terminalToneColor,
} from "../../src/cli/theme.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";

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
  const surface = terminalThemeColor(
    terminalThemes.dark,
    "--discern-color-surface-sunken",
  );
  const style = { bold: true as const, color: accent, background: surface };

  const none = styleText("plain", style, testTerminalCapabilities());
  assertEquals(projectTerminalSpans(none), [{ text: "plain" }]);

  const ansi16 = styleText(
    "sixteen",
    style,
    testTerminalCapabilities({ colorDepth: "ansi16" }),
  );
  assertEquals(projectTerminalSpans(ansi16), [{
    text: "sixteen",
    style: {
      bold: true,
      color: paletteEntry(ANSI_16_RGB, accent.ansi16),
      background: paletteEntry(ANSI_16_RGB, surface.ansi16),
    },
  }]);

  const ansi256 = styleText(
    "extended",
    style,
    testTerminalCapabilities({ colorDepth: "ansi256" }),
  );
  assertEquals(projectTerminalSpans(ansi256), [{
    text: "extended",
    style: {
      bold: true,
      color: paletteEntry(ANSI_256_RGB, accent.ansi256),
      background: paletteEntry(ANSI_256_RGB, surface.ansi256),
    },
  }]);

  const truecolor = styleText(
    "exact",
    style,
    testTerminalCapabilities({ colorDepth: "truecolor" }),
  );
  assertEquals(projectTerminalSpans(truecolor), [{
    text: "exact",
    style: {
      bold: true,
      color: { red: accent.red, green: accent.green, blue: accent.blue },
      background: {
        red: surface.red,
        green: surface.green,
        blue: surface.blue,
      },
    },
  }]);
});

Deno.test("projection decodes every emitted attribute and span boundary", () => {
  const capabilities = testTerminalCapabilities({ colorDepth: "truecolor" });
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
  assertEquals(projectedText("A👩‍💻B ◮ é"), "A👩‍💻B ◮ é");
  for (
    const colorDepth of ["none", "ansi16", "ansi256", "truecolor"] as const
  ) {
    for (const unicode of [true, false]) {
      const output = renderBadgeCli(
        { label: "Ready", dot: true, tone: "success" },
        testTerminalCapabilities({ colorDepth, unicode }),
      );
      assertEquals(
        projectedText(output),
        stripAnsi(output),
        `${colorDepth}/${unicode ? "unicode" : "ascii"} lost frame text`,
      );
    }
  }
});

Deno.test("projection round-trips the package hyperlink composer", () => {
  const capabilities = testTerminalCapabilities({ colorDepth: "truecolor" });
  const accent = terminalToneColor(terminalThemes.dark, "accent");
  const linked = styleHyperlink(
    "Docs",
    "https://discern.sh/docs",
    capabilities,
    { bold: true, color: accent },
  );
  assertEquals(projectTerminalSpans(linked), [{
    text: "Docs",
    style: {
      bold: true,
      color: { red: accent.red, green: accent.green, blue: accent.blue },
    },
    link: "https://discern.sh/docs",
  }]);

  const fallback = styleHyperlink(
    "Docs",
    "https://discern.sh/docs",
    testTerminalCapabilities(),
  );
  assertEquals(projectTerminalSpans(fallback), [
    { text: "Docs (https://discern.sh/docs)" },
  ]);
});

Deno.test("projection scopes hyperlink envelopes independently of SGR resets", () => {
  const output =
    `${ESC}]8;;https://discern.sh${ST}${ESC}[1mHome${ESC}[0m plain${ESC}]8;;${ST} after`;
  assertEquals(projectTerminalSpans(output), [
    { text: "Home", style: { bold: true }, link: "https://discern.sh" },
    { text: " plain", link: "https://discern.sh" },
    { text: " after" },
  ]);
});

Deno.test("projection follows hyperlink target switches without a close", () => {
  const output =
    `${ESC}]8;;https://discern.sh/a${ST}first${ESC}]8;;https://discern.sh/b${ST}second${ESC}]8;;${ST}done`;
  assertEquals(projectTerminalSpans(output), [
    { text: "first", link: "https://discern.sh/a" },
    { text: "second", link: "https://discern.sh/b" },
    { text: "done" },
  ]);
});

Deno.test("adjacent identically styled runs merge into one span", () => {
  const capabilities = testTerminalCapabilities({ colorDepth: "truecolor" });
  const twice = styleText("one ", { bold: true }, capabilities) +
    styleText("two", { bold: true }, capabilities);
  assertEquals(projectTerminalSpans(twice), [
    { text: "one two", style: { bold: true } },
  ]);
});

Deno.test("styling or a hyperlink left open ends with the final span", () => {
  assertEquals(
    projectTerminalSpans(`${ESC}]8;;https://discern.sh${ST}open`),
    [{ text: "open", link: "https://discern.sh" }],
  );
  assertEquals(projectTerminalSpans(`${ESC}[1mbold`), [
    { text: "bold", style: { bold: true } },
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
  const foreign = "unsupported or unterminated sequence";
  rejects(`${ESC}[2K`, foreign);
  rejects(`${ESC}[1G`, foreign);
  rejects(`${ESC}[?25l`, foreign);
  rejects(`${ESC}]0;title${BEL}`, foreign);
  rejects(`${ESC}[39m`, foreign);
  rejects(`${ESC}[48;2;300;0;0m`, foreign);
  rejects(`${ESC}[48;5;256m`, foreign);
  rejects(`${ESC}[48;6;1m`, foreign);
  rejects(`${ESC}[22m`, foreign);
  rejects(`${ESC}[m`, foreign);
  rejects(`${ESC}[1;;3m`, foreign);
  rejects(`${ESC}[38;2;300;0;0m`, foreign);
  rejects(`${ESC}[38;5;256m`, foreign);
  rejects(`${ESC}[38;6;1m`, foreign);
  rejects(`${ESC}]8;;https://discern.sh${BEL}bel-ended`, foreign);
  rejects(`${ESC}]8;id=doc;https://discern.sh${ST}params`, foreign);
  rejects(`${ESC}]8;;has space${ST}target`, foreign);
  rejects(`${ESC}]8;;https://discern.sh`, foreign);
  rejects(`bare${BEL}bell`, "unsupported control character");
  rejects("form\ffeed", "unsupported control character");
});

Deno.test("projection accepts newlines and tabs as frame text", () => {
  assertEquals(projectTerminalSpans("one\n\ttwo\n"), [
    { text: "one\n\ttwo\n" },
  ]);
});

Deno.test("cell projection addresses styled links across graphemes, tabs, and rows", () => {
  const accent = terminalToneColor(terminalThemes.dark, "accent");
  const linked = styleHyperlink(
    "A界",
    "https://discern.sh/linked",
    testTerminalCapabilities({ colorDepth: "truecolor" }),
    { underline: true, color: accent },
  );
  assertEquals(projectTerminalCellRows(`x\t${linked}\nend`), [
    {
      row: 1,
      columns: 11,
      spans: [
        { text: "x\t", startColumn: 1, endColumn: 8 },
        {
          text: "A界",
          style: {
            underline: true,
            color: {
              red: accent.red,
              green: accent.green,
              blue: accent.blue,
            },
          },
          link: "https://discern.sh/linked",
          startColumn: 9,
          endColumn: 11,
        },
      ],
    },
    {
      row: 2,
      columns: 3,
      spans: [{ text: "end", startColumn: 1, endColumn: 3 }],
    },
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
      background: { red: 65, green: 43, blue: 21 },
    }),
    {
      backgroundColor: "rgb(65 43 21)",
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
  const capabilities = testTerminalCapabilities({ colorDepth: "truecolor" });
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

Deno.test("projected inline HTML fixes Unicode graphemes to terminal cells", () => {
  const html = projectTerminalInlineHtml("A◮界🎨e\u0301B");
  assertEquals(
    [...html.matchAll(/data-discern-terminal-cell="(\d+)"/gu)].map((match) =>
      Number(match[1])
    ),
    [1, 2, 2, 1],
  );
  assertStringIncludes(html, "A");
  assertStringIncludes(html, "B");
  assert(!html.includes('data-discern-terminal-cell="1">A'));
});

Deno.test("plain terminal text projection coalesces ASCII around measured Unicode", () => {
  assertEquals(projectTerminalTextRuns("AB┌界🎨CD"), [
    { text: "AB" },
    { text: "┌", columns: 1 },
    { text: "界", columns: 2 },
    { text: "🎨", columns: 2 },
    { text: "CD" },
  ]);
});

Deno.test("projected HTML links safe targets and neutralises unsafe ones", () => {
  const capabilities = testTerminalCapabilities({ colorDepth: "truecolor" });
  const linked = projectTerminalHtml(
    styleHyperlink("docs", "https://discern.sh", capabilities, {
      underline: true,
    }),
  );
  assertStringIncludes(
    linked,
    `<a href="https://discern.sh" target="_blank" rel="noopener noreferrer" style="text-decoration-line:underline">docs</a>`,
  );

  const unsafe = projectTerminalHtml(
    `${ESC}]8;;javascript:alert(1)${ST}click${ESC}]8;;${ST}`,
  );
  assert(!unsafe.includes("<a "), "unsafe hyperlink target became an anchor");
  assertStringIncludes(unsafe, "click");
});
