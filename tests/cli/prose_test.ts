import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import type { CliBlock } from "../../src/cli/block-composition.ts";
import {
  createCliBlock,
  renderListCli,
  renderProseCli,
} from "../../src/cli/mod.ts";
import { projectTerminalSpans } from "../../src/cli/projection.ts";
import { measureText } from "../../src/cli/text.ts";
import {
  assertExactFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";
import type { ProseCliProps } from "../../src/components/editorial/prose/prose.cli.ts";

const richProps = {
  children: [
    {
      kind: "paragraph",
      content: [
        "Rich ",
        { kind: "strong", content: "meaning" },
        " keeps ",
        { kind: "link", label: "the source", destination: "#source" },
        ".",
        { kind: "hard-break" },
        "A hard break stays here.",
      ],
    },
    {
      kind: "block",
      block: createCliBlock(renderListCli, {
        items: [
          { content: "Structural list item wraps safely." },
          { content: "Second item." },
        ],
      }),
    },
    {
      kind: "paragraph",
      content: "Final paragraph remains separate.",
    },
  ],
  maxWidth: 28,
} as const satisfies ProseCliProps;

Deno.test("Prose composes rich Paragraphs and structural blocks with exact rhythm", () => {
  const capabilities = testTerminalCapabilities({
    columns: 28,
    colorDepth: "none",
  });
  assertExactFrame(
    renderProseCli(richProps, capabilities),
    [
      "Rich **meaning** keeps the",
      "source (#source).",
      "A hard break stays here.",
      "",
      "• Structural list item wraps",
      "  safely.",
      "• Second item.",
      "",
      "Final paragraph remains",
      "separate.",
    ].join("\n"),
    capabilities,
  );
});

Deno.test("Prose rich output preserves styles, links, graphemes, and bounds at every capability posture", () => {
  const props = {
    children: [{
      kind: "paragraph",
      content: [
        "界🙂 ",
        {
          kind: "strong",
          content: [{ kind: "emphasis", content: "nested meaning wraps" }],
        },
        " ",
        {
          kind: "link",
          label: "reference",
          destination: "https://example.test/reference",
        },
      ],
    }],
    maxWidth: 18,
  } as const satisfies ProseCliProps;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    for (const unicode of [true, false]) {
      const capabilities = testTerminalCapabilities({
        columns: 24,
        colorDepth,
        unicode,
      });
      const output = renderProseCli(props, capabilities);
      assertEquals(renderProseCli(props, capabilities), output);
      assert(!output.startsWith("\n"));
      assert(!output.endsWith("\n"));
      assertStringIncludes(stripAnsi(output), "界🙂");
      for (const line of output.split("\n")) {
        assert(measureText(line) <= 18, stripAnsi(line));
      }
      if (colorDepth === "none") {
        assertStringIncludes(output, "reference");
        assertStringIncludes(
          output.replaceAll("\n", ""),
          "https://example.test/reference",
        );
      } else {
        const spans = projectTerminalSpans(output);
        const nested = spans.find((span) =>
          span.text.includes("nested") || span.text.includes("meaning")
        );
        assertEquals(nested?.style?.bold, true);
        assertEquals(nested?.style?.italic, true);
        assert(
          spans.some((span) => span.link === "https://example.test/reference"),
        );
      }
    }
  }
});

Deno.test("Prose applies lead and drop cap only to a wholly plain first Paragraph", () => {
  const capabilities = testTerminalCapabilities({
    columns: 40,
    colorDepth: "truecolor",
  });
  const richFirst = {
    children: [{
      kind: "paragraph",
      content: ["Styled ", { kind: "strong", content: "opening" }],
    }],
  } as const satisfies ProseCliProps;
  assertEquals(
    renderProseCli({ ...richFirst, lead: true, dropCap: true }, capabilities),
    renderProseCli(richFirst, capabilities),
  );

  const blockFirst = {
    children: [{
      kind: "block",
      block: createCliBlock(renderListCli, {
        items: [{ content: "A list opens the context." }],
      }),
    }],
  } as const satisfies ProseCliProps;
  assertEquals(
    renderProseCli({ ...blockFirst, lead: true, dropCap: true }, capabilities),
    renderProseCli(blockFirst, capabilities),
  );

  const plain = renderProseCli({
    children: [{ kind: "paragraph", content: "Plain opening." }],
    lead: true,
    dropCap: true,
  }, capabilities);
  const spans = projectTerminalSpans(plain);
  assertEquals(spans[0]?.text, "P");
  assertEquals(spans[0]?.style?.bold, true);
  assertEquals(spans[1]?.text, "lain opening.");
  assertEquals(spans[1]?.style?.italic, true);
});

Deno.test("Prose rich mode rejects ambiguous, empty, malformed, and hostile input", () => {
  const capabilities = testTerminalCapabilities({ columns: 40 });
  assertThrows(
    () =>
      renderProseCli(
        { children: [] },
        capabilities,
      ),
    TypeError,
    "non-empty",
  );
  assertThrows(
    () =>
      renderProseCli(
        {
          text: "legacy",
          children: [{ kind: "paragraph", content: "rich" }],
        } as unknown as ProseCliProps,
        capabilities,
      ),
    TypeError,
    "exactly one",
  );
  assertThrows(
    () =>
      renderProseCli(
        { children: [{ kind: "unknown" }] } as unknown as ProseCliProps,
        capabilities,
      ),
    TypeError,
    "unknown prose child",
  );
  assertThrows(
    () =>
      renderProseCli(
        {
          children: [{
            kind: "paragraph",
            content: "unsafe\u001b[2J",
          }],
          lead: true,
        },
        capabilities,
      ),
    TypeError,
    "control",
  );
  assertThrows(
    () =>
      renderProseCli(
        {
          children: [{
            kind: "block",
            block: {} as CliBlock,
          }],
        },
        capabilities,
      ),
    TypeError,
    "createCliBlock",
  );
  for (const maxWidth of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assertThrows(
      () => renderProseCli({ ...richProps, maxWidth }, capabilities),
      TypeError,
      "prose width",
    );
  }
});
