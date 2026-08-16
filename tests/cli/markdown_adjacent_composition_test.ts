import { assert, assertEquals } from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  composeCliBlocks,
  createCliBlock,
  renderBlockquoteCli,
  renderCodeBlockCli,
  renderFootnotesCli,
  renderHeadingCli,
  renderListCli,
  renderParagraphCli,
  renderProseCli,
  renderTableCli,
} from "../../src/cli/mod.ts";
import { measureText } from "../../src/cli/text.ts";
import {
  assertExactFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

function renderMarkdownAdjacentDocument(
  capabilities: TerminalCapabilities,
): string {
  const heading = renderHeadingCli({
    content: [
      "Complete ",
      { kind: "strong", content: "document" },
      { kind: "soft-break" },
      "semantics",
      { kind: "hard-break" },
      "remain visible",
    ],
    level: 2,
    overflow: "wrap",
    leadingBlankLines: 0,
  }, capabilities);
  const paragraph = renderParagraphCli({
    content: [
      "A paragraph links to ",
      {
        kind: "link",
        label: "evidence",
        destination: "https://example.test/evidence",
      },
      ".",
    ],
  }, capabilities);
  const prose = renderProseCli({
    children: [{
      kind: "paragraph",
      content: [
        "Prose keeps ",
        { kind: "emphasis", content: "reading" },
        " measure.",
      ],
    }],
  }, capabilities);
  const list = renderListCli({
    items: [{
      content: [
        "A ",
        { kind: "strong", content: "list" },
        " remains structural.",
      ],
    }],
  }, capabilities);
  const table = renderTableCli({
    layout: "responsive",
    columns: [{ header: "Field" }, { header: "Value", align: "end" }],
    rows: [["State", [{ kind: "code", text: "complete" }]]],
  }, capabilities);
  const quotation = renderBlockquoteCli({
    children: [createCliBlock(renderParagraphCli, {
      content: "A quotation remains a block.",
    })],
  }, capabilities);
  const footnotes = renderFootnotesCli({
    items: [{
      id: "evidence-note",
      content: {
        kind: "blocks",
        children: [
          createCliBlock(renderParagraphCli, {
            content: ["A note keeps ", {
              kind: "strong",
              content: "blocks",
            }, "."],
          }),
          createCliBlock(renderListCli, {
            items: [{ content: "One supporting item." }],
          }),
        ],
      },
      returnReferences: [{ href: "#evidence-ref-1" }, {
        href: "#evidence-ref-2",
      }],
    }],
  }, capabilities);
  const code = renderCodeBlockCli({
    code: "complete = true",
    language: "text",
  }, capabilities);

  return composeCliBlocks([
    heading,
    paragraph,
    prose,
    list,
    table,
    quotation,
    footnotes,
    code,
  ]);
}

Deno.test("Markdown-adjacent Components compose with wave-2 blocks at exact document boundaries", () => {
  const capabilities = testTerminalCapabilities({
    columns: 32,
    colorDepth: "none",
  });
  const expected = [
    "## Complete **document**",
    "   semantics",
    "   remain visible",
    "",
    "A paragraph links to evidence",
    "(https://example.test/evidence).",
    "",
    "Prose keeps _reading_ measure.",
    "",
    "• A **list** remains structural.",
    "",
    "┌────────────┬─────────────────┐",
    "│ Field      │           Value │",
    "├────────────┼─────────────────┤",
    "│ State      │      `complete` │",
    "└────────────┴─────────────────┘",
    "",
    "│ A quotation remains a block.",
    "",
    "† Notes & sources",
    "",
    "[01] A note keeps **blocks**.",
    "",
    "     • One supporting item.",
    "",
    "     ↩ return 1",
    "     (#evidence-ref-1)",
    "     ↩ return 2",
    "     (#evidence-ref-2)",
    "",
    "[text]",
    "│ complete = true",
  ].join("\n");
  assertExactFrame(
    renderMarkdownAdjacentDocument(capabilities),
    expected,
    capabilities,
  );
});

Deno.test("Markdown-adjacent composition stays deterministic and width-bounded across capabilities", () => {
  for (const columns of [18, 32]) {
    for (
      const colorDepth of [
        "none",
        "ansi16",
        "ansi256",
        "truecolor",
      ] as const
    ) {
      for (const unicode of [true, false]) {
        const capabilities = testTerminalCapabilities({
          columns,
          colorDepth,
          unicode,
        });
        const output = renderMarkdownAdjacentDocument(capabilities);
        assertEquals(renderMarkdownAdjacentDocument(capabilities), output);
        assert(!output.startsWith("\n"));
        assert(!output.endsWith("\n"));
        for (const line of stripAnsi(output).split("\n")) {
          assert(
            measureText(line) <= columns,
            `${JSON.stringify(line)} exceeded ${columns} columns`,
          );
        }
      }
    }
  }
});
