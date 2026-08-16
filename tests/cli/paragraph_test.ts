import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { stripAnsi, styleText } from "../../src/cli/ansi.ts";
import { paragraphCliExamples, renderParagraphCli } from "../../src/cli/mod.ts";
import { projectTerminalSpans } from "../../src/cli/projection.ts";
import { measureText, wrapStyledText } from "../../src/cli/text.ts";
import { terminalThemeColor, terminalThemes } from "../../src/cli/theme.ts";
import {
  assertExactFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

const paragraphProps = {
  content: [
    "One ",
    { kind: "strong", content: "clear" },
    " paragraph keeps ",
    { kind: "code", text: "inline" },
    " meaning.",
  ],
} as const;

Deno.test("Paragraph renders exact capability-bounded measures without blank boundaries", () => {
  const frames = [
    [
      16,
      "One **clear**\nparagraph keeps\n`inline`\nmeaning.",
    ],
    [
      32,
      "One **clear** paragraph keeps\n`inline` meaning.",
    ],
    [
      80,
      "One **clear** paragraph keeps `inline` meaning.",
    ],
  ] as const;
  for (const [columns, expected] of frames) {
    const capabilities = testTerminalCapabilities({ columns });
    const output = renderParagraphCli(paragraphProps, capabilities);
    assertExactFrame(output, expected, capabilities);
    assert(!output.startsWith("\n"));
    assert(!output.endsWith("\n"));
  }

  const narrowed = renderParagraphCli(
    { ...paragraphProps, maxWidth: 16 },
    testTerminalCapabilities({ columns: 80 }),
  );
  assertEquals(narrowed, frames[0][1]);
});

Deno.test("Paragraph renders exact nested styles at every colour depth", () => {
  const theme = terminalThemes.dark;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16"] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns: 32, colorDepth });
    const body = (text: string) =>
      styleText(text, {
        ...theme.typography.body,
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      }, capabilities);
    const expected = [
      body("One ") +
      styleText("clear", {
        ...theme.typography.body,
        ...theme.typography.strong,
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      }, capabilities) +
      body(" paragraph keeps ") +
      styleText("inline", {
        ...theme.typography.body,
        ...theme.typography.strong,
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      }, capabilities),
      body("meaning."),
    ].join("\n");
    assertExactFrame(
      renderParagraphCli(paragraphProps, capabilities),
      expected,
      capabilities,
    );
  }
});

Deno.test("Paragraph rich example preserves links, images, footnotes, and valid lines", () => {
  const example = paragraphCliExamples[0];
  if (example === undefined) throw new Error("Paragraph example missing");
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    for (const unicode of [true, false]) {
      const capabilities = testTerminalCapabilities({
        columns: 34,
        colorDepth,
        unicode,
      });
      const first = renderParagraphCli(example.props, capabilities);
      assertEquals(renderParagraphCli(example.props, capabilities), first);
      assert(!first.startsWith("\n"));
      assert(!first.endsWith("\n"));
      const visible = stripAnsi(first);
      assertStringIncludes(
        visible.replaceAll("\n", " "),
        "Image: Measured line diagram",
      );
      assertStringIncludes(
        visible.replaceAll("\n", ""),
        "https://example.test/diagram.png",
      );
      assertStringIncludes(visible, "[^measure]");
      if (colorDepth === "none") {
        assertStringIncludes(
          first.replaceAll("\n", ""),
          "https://example.test/reference",
        );
      } else {
        const links = first.split("\n").flatMap((line) =>
          projectTerminalSpans(line)
        );
        assert(
          links.some((span) => span.link === "https://example.test/reference"),
        );
        assert(
          links.some((span) =>
            span.link === "https://example.test/diagram.png"
          ),
        );
      }
      for (const line of first.split("\n")) {
        assert(measureText(line) <= 34, stripAnsi(line));
        assertEquals(wrapStyledText(line, 34), [line]);
      }
    }
  }
});

Deno.test("Paragraph keeps hard breaks inside its block and owns no outer rhythm", () => {
  const output = renderParagraphCli(
    {
      content: [
        "first line",
        { kind: "hard-break" },
        "second line",
      ],
    },
    testTerminalCapabilities({ columns: 40 }),
  );
  assertEquals(output, "first line\nsecond line");
  assert(!output.includes("\n\n"));
});

Deno.test("Paragraph validates width and semantic content before rendering", () => {
  const capabilities = testTerminalCapabilities({ columns: 40 });
  for (const maxWidth of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assertThrows(
      () => renderParagraphCli({ ...paragraphProps, maxWidth }, capabilities),
      TypeError,
      "paragraph width",
    );
  }
  assertThrows(
    () =>
      renderParagraphCli(
        {
          content: [{
            kind: "link",
            label: "unsafe",
            destination: "javascript:alert(1)",
          }],
        },
        capabilities,
      ),
    TypeError,
    "unsafe scheme",
  );
});
