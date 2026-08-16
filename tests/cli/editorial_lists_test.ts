import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { stripAnsi, styleText } from "../../src/cli/ansi.ts";
import {
  composeCliBlocks,
  createCliBlock,
  type FootnotesCliProps,
  renderBlockquoteCli,
  renderCodeBlockCli,
  renderFootnotesCli,
  renderKeyPointsCli,
  renderListCli,
  renderParagraphCli,
  renderRelatedContentCli,
  renderTableOfContentsCli,
} from "../../src/cli/mod.ts";
import { projectTerminalSpans } from "../../src/cli/projection.ts";
import type { SemanticInlineContent } from "../../src/cli/semantic-inline.ts";
import { measureText } from "../../src/cli/text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  terminalToneColor,
} from "../../src/cli/theme.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

const keyPointsProps = {
  eyebrow: "The brief",
  title: "Ideas to carry into the work",
  items: [
    {
      title: "Begin with evidence",
      description: "Observe the real state before proposing a change.",
    },
    {
      title: "Leave a trace",
      description: "Preserve what the next reader will need.",
    },
  ],
} as const;

Deno.test("Key points renders exact width, ASCII, and colour frames", () => {
  const frames = [
    [
      24,
      "THE BRIEF\n\nIdeas to carry into the\nwork\n\n01  Begin with evidence\n    Observe the real\n    state before\n    proposing a change.\n\n02  Leave a trace\n    Preserve what the\n    next reader will\n    need.",
    ],
    [
      52,
      "THE BRIEF\n\nIdeas to carry into the work\n\n01  Begin with evidence\n    Observe the real state before proposing a\n    change.\n\n02  Leave a trace\n    Preserve what the next reader will need.",
    ],
    [
      96,
      "THE BRIEF\n\nIdeas to carry into the work\n\n01  Begin with evidence\n    Observe the real state before proposing a change.\n\n02  Leave a trace\n    Preserve what the next reader will need.",
    ],
  ] as const;
  for (const [columns, expected] of frames) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderKeyPointsCli(keyPointsProps, capabilities),
      expected,
      capabilities,
    );
  }
  const ascii = testTerminalCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderKeyPointsCli(keyPointsProps, ascii),
    frames[0][1],
    ascii,
  );
  const theme = terminalThemes.dark;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns: 52, colorDepth });
    const expected = [
      styleText("THE BRIEF", {
        ...theme.typography.annotation,
        color: terminalToneColor(theme, "accent"),
      }, capabilities),
      styleText("Ideas to carry into the work", {
        ...theme.typography.display,
        color: terminalThemeColor(theme, "--discern-color-ink"),
      }, capabilities),
      `${
        styleText("01  Begin with evidence", {
          ...theme.typography.strong,
          color: terminalToneColor(theme, "accent"),
        }, capabilities)
      }\n    Observe the real state before proposing a\n    change.`,
      `${
        styleText("02  Leave a trace", {
          ...theme.typography.strong,
          color: terminalToneColor(theme, "accent"),
        }, capabilities)
      }\n    Preserve what the next reader will need.`,
    ].join("\n\n");
    assertExactFrame(
      renderKeyPointsCli(keyPointsProps, capabilities),
      expected,
      capabilities,
    );
  }
});

const footnotesProps = {
  items: [
    { content: "Terminal widths were measured in character cells." },
    {
      content: "Source labels remain plain text when links are unavailable.",
      returnLabel: "return",
    },
  ],
} as const;

Deno.test("Footnotes renders exact width, ASCII, and colour frames", () => {
  const frames = [
    [
      24,
      "† Notes & sources\n\n[01] Terminal widths\n     were measured in\n     character cells.\n\n[02] Source labels\n     remain plain text\n     when links are\n     unavailable. ↩\n     return",
    ],
    [
      52,
      "† Notes & sources\n\n[01] Terminal widths were measured in character\n     cells.\n\n[02] Source labels remain plain text when links are\n     unavailable. ↩ return",
    ],
    [
      96,
      "† Notes & sources\n\n[01] Terminal widths were measured in character cells.\n\n[02] Source labels remain plain text when links are unavailable. ↩ return",
    ],
  ] as const;
  for (const [columns, expected] of frames) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderFootnotesCli(footnotesProps, capabilities),
      expected,
      capabilities,
    );
  }
  const ascii = testTerminalCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderFootnotesCli(footnotesProps, ascii),
    "+ Notes & sources\n\n[01] Terminal widths\n     were measured in\n     character cells.\n\n[02] Source labels\n     remain plain text\n     when links are\n     unavailable. <-\n     return",
    ascii,
  );
  const theme = terminalThemes.dark;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns: 52, colorDepth });
    const heading = styleText("† Notes & sources", {
      ...theme.typography.strong,
      color: terminalToneColor(theme, "accent"),
    }, capabilities);
    const expected =
      `${heading}\n\n[01] Terminal widths were measured in character\n     cells.\n\n[02] Source labels remain plain text when links are\n     unavailable. ↩ return`;
    assertExactFrame(
      renderFootnotesCli(footnotesProps, capabilities),
      expected,
      capabilities,
    );
  }
});

const richFootnoteContent = [
  "A ",
  { kind: "strong", content: "measured result" },
  " links to ",
  {
    kind: "link",
    label: "the source",
    destination: "https://example.test/source",
  },
  " beside 界🙂.",
] as const satisfies SemanticInlineContent;

const richFootnotesProps = {
  title: "References",
  items: [{
    id: "source-note",
    content: richFootnoteContent,
    returnLabel: "back",
    returnReferences: [
      { href: "#source-ref-a" },
      { href: "#source-ref-b", label: "other citation" },
    ],
  }],
} as const;

Deno.test("Footnotes rich inline mode is exact, lossless, and capability-aware", () => {
  const frames = [
    [
      24,
      "† References\n\n[01] A **measured\n     result** links to\n     the source\n     (https://example.te\n     st/source) beside\n     界🙂.\n\n     ↩ back 1\n     (#source-ref-a)\n     ↩ other citation\n     (#source-ref-b)",
    ],
    [
      52,
      "† References\n\n[01] A **measured result** links to the source\n     (https://example.test/source) beside 界🙂.\n\n     ↩ back 1 (#source-ref-a)\n     ↩ other citation (#source-ref-b)",
    ],
    [
      96,
      "† References\n\n[01] A **measured result** links to the source (https://example.test/source) beside 界🙂.\n\n     ↩ back 1 (#source-ref-a)\n     ↩ other citation (#source-ref-b)",
    ],
  ] as const;
  for (const [columns, expected] of frames) {
    const capabilities = testTerminalCapabilities({
      columns,
      colorDepth: "none",
    });
    assertExactFrame(
      renderFootnotesCli(richFootnotesProps, capabilities),
      expected,
      capabilities,
    );
  }

  const ascii = testTerminalCapabilities({
    columns: 24,
    colorDepth: "none",
    unicode: false,
  });
  assertExactFrame(
    renderFootnotesCli(richFootnotesProps, ascii),
    "+ References\n\n[01] A **measured\n     result** links to\n     the source\n     (https://example.te\n     st/source) beside\n     界🙂.\n\n     <- back 1\n     (#source-ref-a)\n     <- other citation\n     (#source-ref-b)",
    ascii,
  );

  const expectedStyled =
    "† References\n\n[01] A measured result links to the\n     source beside 界🙂.\n\n     ↩ back 1\n     ↩ other citation";
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16"] as const
  ) {
    const capabilities = testTerminalCapabilities({
      columns: 36,
      colorDepth,
      hyperlinks: true,
    });
    const output = renderFootnotesCli(richFootnotesProps, capabilities);
    assertStyledFrame(output, expectedStyled, capabilities);
    const links = projectTerminalSpans(output).filter((span) =>
      span.link !== undefined
    );
    assertEquals(
      [...new Set(links.map((span) => span.link))],
      [
        "https://example.test/source",
        "#source-ref-a",
        "#source-ref-b",
      ],
    );
    assertEquals(
      links.filter((span) => span.link === "https://example.test/source").map((
        span,
      ) => span.text).join(" "),
      "the source",
    );
    assertEquals(renderFootnotesCli(richFootnotesProps, capabilities), output);
  }

  const withoutHyperlinks = testTerminalCapabilities({
    columns: 52,
    colorDepth: "truecolor",
    hyperlinks: false,
  });
  const fallback = renderFootnotesCli(richFootnotesProps, withoutHyperlinks);
  assertStringIncludes(stripAnsi(fallback), "https://example.test/source");
  assertStringIncludes(stripAnsi(fallback), "back 1 (#source-ref-a)");
});

Deno.test("Footnotes composes paragraph, list, quotation, and code blocks without flattening", () => {
  const capabilities = testTerminalCapabilities({
    columns: 32,
    colorDepth: "none",
  });
  const output = renderFootnotesCli({
    items: [{
      id: "multi",
      content: {
        kind: "blocks",
        children: [
          createCliBlock(
            renderParagraphCli,
            {
              content: [
                "First ",
                { kind: "emphasis", content: "paragraph" },
                ".",
              ],
            } as const,
          ),
          createCliBlock(renderParagraphCli, {
            content: "Second paragraph.",
          }),
          createCliBlock(renderListCli, {
            items: [{ content: "Nested item." }],
          }),
          createCliBlock(renderBlockquoteCli, {
            children: [createCliBlock(renderParagraphCli, {
              content: "Quoted note.",
            })],
          }),
          createCliBlock(renderCodeBlockCli, {
            code: "alpha\nbeta",
            language: "text",
          }),
        ],
      },
    }],
  }, capabilities);

  assertExactFrame(
    output,
    "† Notes & sources\n\n[01] First _paragraph_.\n\n     Second paragraph.\n\n     • Nested item.\n\n     │ Quoted note.\n\n     [text]\n     │ alpha\n     │ beta",
    capabilities,
  );
  assertEquals(
    renderFootnotesCli({
      items: [{
        id: "multi",
        content: {
          kind: "blocks",
          children: [createCliBlock(renderParagraphCli, {
            content: "Stable body.",
          })],
        },
      }],
    }, capabilities),
    renderFootnotesCli({
      items: [{
        id: "multi",
        content: {
          kind: "blocks",
          children: [createCliBlock(renderParagraphCli, {
            content: "Stable body.",
          })],
        },
      }],
    }, capabilities),
  );
});

Deno.test("Footnotes owns one clean boundary when interleaved with structural blocks", () => {
  const capabilities = testTerminalCapabilities({
    columns: 40,
    colorDepth: "none",
  });
  const paragraph = renderParagraphCli({ content: "Before." }, capabilities);
  const footnotes = renderFootnotesCli({
    items: [{ content: "Definition." }],
  }, capabilities);
  const list = renderListCli({
    items: [{ content: "After." }],
  }, capabilities);
  assertEquals(
    composeCliBlocks([paragraph, footnotes, list]),
    "Before.\n\n† Notes & sources\n\n[01] Definition.\n\n• After.",
  );
});

Deno.test("Footnotes validates identities, linked returns, hostile input, and width", () => {
  const capabilities = testTerminalCapabilities({ columns: 40 });
  assertEquals(
    stripAnsi(renderFootnotesCli({
      items: [{ content: "Legacy anonymous definition." }],
    }, capabilities)),
    "† Notes & sources\n\n[01] Legacy anonymous definition.",
  );
  assertThrows(
    () =>
      renderFootnotesCli({
        items: [
          {
            content: [{ kind: "strong", content: "Needs identity." }],
          } as unknown as FootnotesCliProps["items"][number],
        ],
      }, capabilities),
    TypeError,
    "requires a stable id",
  );
  const linkedTextProps = {
    items: [{
      id: "linked-text",
      content: "Plain linked definition.",
      returnReferences: [{ href: "#linked-text-ref" }],
    }],
  } as const satisfies FootnotesCliProps;
  assertExactFrame(
    renderFootnotesCli(linkedTextProps, capabilities),
    "† Notes & sources\n\n[01] Plain linked definition.\n\n     ↩ return (#linked-text-ref)",
    capabilities,
  );
  assertThrows(
    () =>
      renderFootnotesCli({
        items: [
          {
            content: "Linked text needs identity.",
            returnReferences: [{ href: "#missing-id-ref" }],
          } as unknown as FootnotesCliProps["items"][number],
        ],
      }, capabilities),
    TypeError,
    "requires a stable id",
  );
  assertThrows(
    () =>
      renderFootnotesCli({
        items: [
          { id: "same", content: "First." },
          { id: "same", content: "Second." },
        ],
      }, capabilities),
    TypeError,
    "duplicate footnotes id",
  );
  assertThrows(
    () =>
      renderFootnotesCli({
        items: [{
          id: "unsafe id",
          content: [{ kind: "text", text: "Definition." }],
        }],
      }, capabilities),
    TypeError,
    "valid footnote identifier",
  );
  assertThrows(
    () =>
      renderFootnotesCli({
        items: [{
          id: "unsafe-content",
          content: [{
            kind: "text",
            text: "erase\u001b[2J",
          }],
        }],
      }, capabilities),
    TypeError,
    "semantic inline content",
  );
  assertThrows(
    () =>
      renderFootnotesCli({
        items: [{
          id: "unsafe-return",
          content: "Definition.",
          returnReferences: [{
            href: "javascript:alert(1)",
          }],
        }],
      }, capabilities),
    TypeError,
    "unsafe scheme",
  );
  assertThrows(
    () =>
      renderFootnotesCli({
        items: [{
          id: "empty-blocks",
          content: { kind: "blocks", children: [] },
        }],
      }, capabilities),
    TypeError,
    "one or more CLI block",
  );
  assertThrows(
    () =>
      renderFootnotesCli({
        items: [{
          id: "empty-linked-returns",
          content: "Definition.",
          returnReferences: [],
        }],
      }, capabilities),
    TypeError,
    "non-empty array",
  );
  const unlinkedReturn = testTerminalCapabilities({
    columns: 40,
    colorDepth: "none",
  });
  assertExactFrame(
    renderFootnotesCli({
      items: [{
        id: "unlinked-return",
        content: ["Rich definition."],
        returnLabel: "return",
      }],
    }, unlinkedReturn),
    "† Notes & sources\n\n[01] Rich definition.\n\n     ↩ return",
    unlinkedReturn,
  );
  assertThrows(
    () =>
      renderFootnotesCli(
        { items: [{ content: "Definition." }], maxWidth: 7 },
        capabilities,
      ),
    TypeError,
    "at least 8",
  );
  assertThrows(
    () =>
      renderFootnotesCli(
        { items: [{ content: "Definition." }], maxWidth: 40 },
        testTerminalCapabilities({ columns: 7 }),
      ),
    TypeError,
    "terminal columns",
  );

  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    for (const unicode of [true, false]) {
      const current = testTerminalCapabilities({
        columns: 24,
        colorDepth,
        unicode,
      });
      const first = renderFootnotesCli(richFootnotesProps, current);
      assertEquals(renderFootnotesCli(richFootnotesProps, current), first);
      for (const line of first.split("\n")) {
        assert(measureText(line) <= current.columns, stripAnsi(line));
      }
    }
  }
});

const relatedContentProps = {
  eyebrow: "Continue",
  title: "Related reading",
  items: [{
    eyebrow: "Guide",
    title: "Terminal reading patterns",
    description: "How hierarchy survives capability changes.",
    href: "/guides/terminal-reading",
    meta: "6 min",
  }],
} as const;

Deno.test("Related content renders exact width, ASCII, and colour frames", () => {
  const frames = [
    [
      24,
      "CONTINUE\n\nRelated reading\n\n01  [GUIDE] Terminal\n    reading patterns\n    How hierarchy\n    survives capability\n    changes.\n    /guides/terminal-rea\n    ding · 6 min",
    ],
    [
      52,
      "CONTINUE\n\nRelated reading\n\n01  [GUIDE] Terminal reading patterns\n    How hierarchy survives capability changes.\n    /guides/terminal-reading · 6 min",
    ],
    [
      96,
      "CONTINUE\n\nRelated reading\n\n01  [GUIDE] Terminal reading patterns\n    How hierarchy survives capability changes.\n    /guides/terminal-reading · 6 min",
    ],
  ] as const;
  for (const [columns, expected] of frames) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderRelatedContentCli(relatedContentProps, capabilities),
      expected,
      capabilities,
    );
  }
  const ascii = testTerminalCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderRelatedContentCli(relatedContentProps, ascii),
    "CONTINUE\n\nRelated reading\n\n01  [GUIDE] Terminal\n    reading patterns\n    How hierarchy\n    survives capability\n    changes.\n    /guides/terminal-rea\n    ding | 6 min",
    ascii,
  );
  const theme = terminalThemes.dark;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns: 52, colorDepth });
    const expected = [
      styleText("CONTINUE", {
        ...theme.typography.annotation,
        color: terminalToneColor(theme, "accent"),
      }, capabilities),
      styleText("Related reading", {
        ...theme.typography.display,
        color: terminalThemeColor(theme, "--discern-color-ink"),
      }, capabilities),
      [
        styleText("01  [GUIDE] Terminal reading patterns", {
          ...theme.typography.strong,
          color: terminalToneColor(theme, "accent"),
        }, capabilities),
        "    How hierarchy survives capability changes.",
        styleText("    /guides/terminal-reading · 6 min", {
          ...theme.typography.annotation,
          color: terminalThemeColor(theme, "--discern-color-ink-muted"),
        }, capabilities),
      ].join("\n"),
    ].join("\n\n");
    assertExactFrame(
      renderRelatedContentCli(relatedContentProps, capabilities),
      expected,
      capabilities,
    );
  }
});

const tableOfContentsProps = {
  items: [
    { label: "Context", href: "#context" },
    { label: "Evidence", href: "#evidence", current: true },
    { label: "Methods and sources", href: "#methods", nested: true },
    { label: "Decision", href: "#decision" },
  ],
  progress: "2 of 3 sections",
} as const;

Deno.test("Table of contents renders exact width, ASCII, and colour frames", () => {
  const unicode =
    "On this page\n  01 Context\n▶ 02 Evidence\n  └─ Methods and sources\n  03 Decision\n2 of 3 sections";
  for (const columns of [24, 52, 96]) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderTableOfContentsCli(tableOfContentsProps, capabilities),
      unicode,
      capabilities,
    );
  }
  const ascii = testTerminalCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderTableOfContentsCli(tableOfContentsProps, ascii),
    "On this page\n  01 Context\n> 02 Evidence\n  \\- Methods and sources\n  03 Decision\n2 of 3 sections",
    ascii,
  );
  const theme = terminalThemes.dark;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns: 52, colorDepth });
    const heading = styleText("On this page", {
      ...theme.typography.strong,
      color: terminalToneColor(theme, "accent"),
    }, capabilities);
    const current = styleText("▶ 02 Evidence", {
      ...theme.typography.strong,
      color: terminalToneColor(theme, "accent"),
    }, capabilities);
    const progress = styleText("2 of 3 sections", {
      ...theme.typography.annotation,
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
    }, capabilities);
    const expected =
      `${heading}\n  01 Context\n${current}\n  └─ Methods and sources\n  03 Decision\n${progress}`;
    assertExactFrame(
      renderTableOfContentsCli(tableOfContentsProps, capabilities),
      expected,
      capabilities,
    );
  }
});
