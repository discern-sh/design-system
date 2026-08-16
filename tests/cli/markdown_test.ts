import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  composeCliBlocks,
  renderCodeBlockCli,
  renderHeadingCli,
  renderListCli,
  renderMarkdownCli,
  renderParagraphCli,
  renderTableCli,
} from "../../src/cli/mod.ts";
import { projectTerminalSpans } from "../../src/cli/projection.ts";
import { measureText } from "../../src/cli/text.ts";
import {
  assertExactFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";
import { markdownFixtures } from "../../src/fixtures/markdown.ts";

const exactSource = `# Read **carefully**

Use [the guide](https://example.test/guide).

- First item
- Second item`;

const exactFrames = {
  "24-true":
    "# Read **carefully**\n\nUse the guide\n(https://example.test/gu\nide).\n\n• First item\n• Second item",
  "24-false":
    "# Read **carefully**\n\nUse the guide\n(https://example.test/gu\nide).\n\n* First item\n* Second item",
  "48-true":
    "# Read **carefully**\n\nUse the guide (https://example.test/guide).\n\n• First item\n• Second item",
  "48-false":
    "# Read **carefully**\n\nUse the guide (https://example.test/guide).\n\n* First item\n* Second item",
  "80-true":
    "# Read **carefully**\n\nUse the guide (https://example.test/guide).\n\n• First item\n• Second item",
  "80-false":
    "# Read **carefully**\n\nUse the guide (https://example.test/guide).\n\n* First item\n* Second item",
} as const;

Deno.test("Markdown renders exact narrow, standard, and wide Unicode/ASCII frames", () => {
  for (const columns of [24, 48, 80] as const) {
    for (const unicode of [true, false] as const) {
      const capabilities = testTerminalCapabilities({
        columns,
        unicode,
        colorDepth: "none",
        hyperlinks: false,
      });
      assertExactFrame(
        renderMarkdownCli(
          { source: exactSource, theme: "dark", maxWidth: columns },
          capabilities,
        ),
        exactFrames[`${columns}-${unicode}`],
        capabilities,
      );
    }
  }
});

Deno.test("Markdown alert task markers preserve the enclosing frame width", () => {
  const capabilities = testTerminalCapabilities({
    columns: 40,
    colorDepth: "none",
    unicode: true,
    hyperlinks: false,
  });
  const source = [
    "> [!IMPORTANT]",
    "> Alerts retain nested content.",
    ">",
    "> - [x] Reviewed",
    "> - [ ] Ready to verify",
  ].join("\n");
  assertExactFrame(
    renderMarkdownCli({ source, maxWidth: 40 }, capabilities),
    [
      "┌ Important ───────────────────────────┐",
      "│ Alerts retain nested content.        │",
      "│                                      │",
      "│ ☑ Reviewed                           │",
      "│ ☐ Ready to verify                    │",
      "└──────────────────────────────────────┘",
    ].join("\n"),
    capabilities,
  );
});

function expectedComponentDocument(
  capabilities: TerminalCapabilities,
  theme: "light" | "dark",
): string {
  return composeCliBlocks([
    renderHeadingCli({
      content: ["Read ", { kind: "strong", content: ["carefully"] }],
      level: 1,
      overflow: "wrap",
      leadingBlankLines: 0,
      theme,
    }, capabilities),
    renderParagraphCli({
      content: [
        "Use ",
        {
          kind: "link",
          label: ["the guide"],
          destination: "https://example.test/guide",
        },
        ".",
      ],
      theme,
    }, capabilities),
    renderListCli({
      kind: "unordered",
      spacing: "tight",
      items: [{ content: ["First item"] }, { content: ["Second item"] }],
      theme,
    }, capabilities),
  ]);
}

Deno.test("Markdown is byte-identical to public Component calls at every terminal posture", () => {
  for (
    const colorDepth of [
      "truecolor",
      "ansi256",
      "ansi16",
      "none",
    ] as const
  ) {
    for (const unicode of [true, false]) {
      for (const theme of ["light", "dark"] as const) {
        const capabilities = testTerminalCapabilities({
          columns: 48,
          colorDepth,
          unicode,
          hyperlinks: true,
        });
        assertEquals(
          renderMarkdownCli({ source: exactSource, theme }, capabilities),
          expectedComponentDocument(capabilities, theme),
        );
      }
    }
  }
});

Deno.test("Markdown delegates responsive tables and lossless code at every measure", () => {
  const source = [
    "| Field | Value |",
    "| :--- | ---: |",
    "| Rich | **complete evidence remains visible** |",
    "",
    "```text",
    "one-uninterrupted-copyable-source-token",
    "```",
  ].join("\n");
  for (const columns of [20, 48, 80]) {
    for (const unicode of [true, false]) {
      const capabilities = testTerminalCapabilities({
        columns,
        unicode,
        colorDepth: "none",
        hyperlinks: false,
      });
      const expected = composeCliBlocks([
        renderTableCli({
          layout: "responsive",
          columns: [{ header: ["Field"], align: "start" }, {
            header: ["Value"],
            align: "end",
          }],
          rows: [[
            ["Rich"],
            [{
              kind: "strong",
              content: ["complete evidence remains visible"],
            }],
          ]],
          theme: "dark",
        }, capabilities),
        renderCodeBlockCli({
          code: "one-uninterrupted-copyable-source-token",
          language: "text",
          widthPolicy: "wrap",
          theme: "dark",
        }, capabilities),
      ]);
      const output = renderMarkdownCli({ source, theme: "dark" }, capabilities);
      assertEquals(output, expected);
      const uninterruptedFacts = stripAnsi(output).replaceAll(
        /[\s*│|┌┐└┘├┤┬┴┼─+\-›>\[\]]/gu,
        "",
      );
      assertStringIncludes(
        uninterruptedFacts,
        "completeevidenceremainsvisible",
      );
      assertStringIncludes(
        uninterruptedFacts,
        "oneuninterruptedcopyablesourcetoken",
      );
      for (const line of output.split("\n")) {
        assert(measureText(line) <= columns, stripAnsi(line));
        projectTerminalSpans(line);
      }
    }
  }
});

Deno.test("Markdown owns only validated hyperlink envelopes and keeps every target fact", () => {
  const source = [
    "[Safe](https://example.test/path) ![Diagram](https://example.test/image.png)",
    "",
    "[Unsafe](javascript:alert(1)) ![Unsafe image](data:text/html,boom)",
    "",
    "A note[^proof].",
    "",
    "[^proof]: Evidence.",
  ].join("\n");
  const linkedCapabilities = testTerminalCapabilities({
    columns: 80,
    colorDepth: "ansi16",
    hyperlinks: true,
  });
  const linked = renderMarkdownCli(
    { source, theme: "dark" },
    linkedCapabilities,
  );
  const targets = projectTerminalSpans(linked).flatMap((span) =>
    span.link === undefined ? [] : [span.link]
  );
  assert(targets.includes("https://example.test/path"));
  assert(targets.includes("https://example.test/image.png"));
  assert(targets.includes("#fnref-1"));
  assert(!targets.some((target) => target.startsWith("javascript:")));
  assert(!targets.some((target) => target.startsWith("data:")));

  const plain = renderMarkdownCli(
    { source, theme: "dark" },
    testTerminalCapabilities({
      columns: 80,
      colorDepth: "none",
      hyperlinks: false,
    }),
  );
  for (
    const target of [
      "https://example.test/path",
      "https://example.test/image.png",
      "javascript:alert(1)",
      "data:text/html,boom",
      "#fnref-1",
    ]
  ) {
    assertStringIncludes(plain, target);
  }
});

Deno.test("Markdown makes hostile controls visible and every styled line independently valid", () => {
  const source = [
    "# café 👩‍💻‮",
    "",
    "```txt",
    "first line",
    "second line",
    "```",
  ].join("\r\n");
  for (
    const colorDepth of [
      "truecolor",
      "ansi256",
      "ansi16",
      "none",
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({
      columns: 40,
      colorDepth,
      hyperlinks: true,
    });
    const output = renderMarkdownCli({ source, theme: "dark" }, capabilities);
    const visible = stripAnsi(output);
    for (const notation of ["\\u{1B}", "\\u{85}", "\\u{202E}", "\\u{7}"]) {
      assertStringIncludes(visible, notation);
    }
    assert(!/[\p{Cc}\p{Cf}]/u.test(visible.replaceAll("\n", "")));
    for (const line of output.split("\n")) {
      projectTerminalSpans(line);
      assert(measureText(line) <= capabilities.columns, visible);
    }
  }
});

Deno.test("every dialect fixture renders deterministically through the CLI", () => {
  for (const fixture of markdownFixtures) {
    for (const columns of [20, 52]) {
      for (const unicode of [true, false]) {
        const capabilities = testTerminalCapabilities({
          columns,
          unicode,
          colorDepth: "ansi256",
          hyperlinks: true,
        });
        const first = renderMarkdownCli(
          { source: fixture.source, theme: "light", maxWidth: columns },
          capabilities,
        );
        assertEquals(
          renderMarkdownCli(
            { source: fixture.source, theme: "light", maxWidth: columns },
            capabilities,
          ),
          first,
          fixture.id,
        );
        if (fixture.source.trim() === "") assertEquals(first, "");
        else {
          assert(!first.startsWith("\n"), fixture.id);
          assert(!first.endsWith("\n"), fixture.id);
          assert(!first.includes("\n\n\n"), fixture.id);
          for (const line of first.split("\n")) {
            assert(measureText(line) <= columns, fixture.id);
            projectTerminalSpans(line);
          }
        }
      }
    }
  }
});

Deno.test("empty Markdown has an exact empty terminal result", () => {
  const capabilities = testTerminalCapabilities({ columns: 24 });
  assertEquals(renderMarkdownCli({ source: "" }, capabilities), "");
  assertEquals(renderMarkdownCli({ source: " \n\t\n" }, capabilities), "");
});
