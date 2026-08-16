import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import {
  createCliBlock,
  renderBlockquoteCli,
  renderCodeBlockCli,
  renderListCli,
  renderParagraphCli,
} from "../../src/cli/mod.ts";
import { projectTerminalSpans } from "../../src/cli/projection.ts";
import { measureText } from "../../src/cli/text.ts";
import {
  assertExactFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

Deno.test("List → Blockquote → Code block keeps structure, source, and width", () => {
  const capabilities = testTerminalCapabilities({
    columns: 30,
    colorDepth: "none",
  });
  const code = createCliBlock(renderCodeBlockCli, {
    code: "if (ready) {\n\tpublish();\n}\n",
  });
  const quotation = createCliBlock(renderBlockquoteCli, {
    children: [code],
  });
  const output = renderListCli({
    items: [{
      content: "Quoted source follows.",
      blocks: [quotation],
    }],
  }, capabilities);

  assertExactFrame(
    output,
    [
      "• Quoted source follows.",
      "  │ │ if (ready) {",
      "  │ │     publish();",
      "  │ │ }",
      "  │ │",
    ].join("\n"),
    capabilities,
  );
  for (const line of output.split("\n")) {
    assert(measureText(line) <= capabilities.columns, line);
  }
});

Deno.test("Blockquote → List → Paragraph preserves inline semantics and boundaries", () => {
  const paragraph = createCliBlock(
    renderParagraphCli,
    {
      content: [
        "Paragraph keeps ",
        { kind: "strong", content: "meaning" },
        " and ",
        { kind: "link", label: "the source", destination: "#source" },
        ".",
      ],
    } as const,
  );
  const list = createCliBlock(renderListCli, {
    items: [{
      content: "Nested paragraph follows.",
      blocks: [paragraph],
    }],
  });
  const capabilities = testTerminalCapabilities({
    columns: 36,
    colorDepth: "none",
  });
  const output = renderBlockquoteCli({ children: [list] }, capabilities);

  assertExactFrame(
    output,
    [
      "│ • Nested paragraph follows.",
      "│   Paragraph keeps **meaning** and",
      "│   the source (#source).",
    ].join("\n"),
    capabilities,
  );
  assert(!output.includes("\n\n"));
});

Deno.test("structural nesting is deterministic across every capability posture", () => {
  const paragraph = createCliBlock(
    renderParagraphCli,
    {
      content: [
        "Keep ",
        { kind: "emphasis", content: "nested meaning" },
        " beside ",
        {
          kind: "link",
          label: "its reference",
          destination: "https://example.test/reference",
        },
        ".",
      ],
    } as const,
  );
  const list = createCliBlock(
    renderListCli,
    {
      kind: "task",
      items: [{ content: "Reviewed", checked: true, blocks: [paragraph] }],
    } as const,
  );
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    for (const unicode of [true, false]) {
      const capabilities = testTerminalCapabilities({
        columns: 34,
        colorDepth,
        unicode,
      });
      const first = renderBlockquoteCli({ children: [list] }, capabilities);
      assertEquals(
        renderBlockquoteCli({ children: [list] }, capabilities),
        first,
      );
      projectTerminalSpans(first);
      const visible = stripAnsi(first);
      assertStringIncludes(
        visible,
        unicode ? "│ ☑ Reviewed" : "| [x] Reviewed",
      );
      assertStringIncludes(visible, "nested meaning");
      assertStringIncludes(visible.replaceAll(/[\s│|]/gu, ""), "itsreference");
      for (const line of first.split("\n")) {
        assert(measureText(line) <= capabilities.columns, stripAnsi(line));
      }
    }
  }
});

Deno.test("Code block preserve mode remains the sole documented nested overflow", () => {
  const capabilities = testTerminalCapabilities({
    columns: 16,
    colorDepth: "none",
  });
  const source = "one-uninterrupted-copyable-source-token";
  const code = createCliBlock(
    renderCodeBlockCli,
    { code: source, widthPolicy: "preserve" },
    { widthPolicy: "preserve" },
  );
  const quotation = createCliBlock(renderBlockquoteCli, {
    children: [code],
  });
  const list = createCliBlock(renderListCli, {
    items: [{ content: "Preserved source", blocks: [quotation] }],
  });
  const output = renderBlockquoteCli({ children: [list] }, capabilities);

  assertStringIncludes(stripAnsi(output), source);
  assert(
    output.split("\n").some((line) => measureText(line) > capabilities.columns),
  );
});
