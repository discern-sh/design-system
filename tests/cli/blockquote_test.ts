import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { stripAnsi, styleHyperlink, styleText } from "../../src/cli/ansi.ts";
import {
  CLI_BLOCK_MAX_DEPTH,
  type CliBlock,
  createCliBlock,
  renderCliBlock,
} from "../../src/cli/block-composition.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import type { CliRenderer } from "../../src/cli/contracts.ts";
import { projectTerminalSpans } from "../../src/cli/projection.ts";
import { measureText, wrapText } from "../../src/cli/text.ts";
import { terminalThemeColor, terminalThemes } from "../../src/cli/theme.ts";
import renderBlockquoteCli from "../../src/components/editorial/blockquote/blockquote.cli.ts";
import renderParagraphCli from "../../src/components/editorial/paragraph/paragraph.cli.ts";
import {
  assertExactFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

interface TextFixtureProps {
  readonly text: string;
}

const renderWrappedText: CliRenderer<TextFixtureProps> = (
  props,
  capabilities,
) => wrapText(props.text, capabilities.columns).join("\n");

const renderLiteralText: CliRenderer<TextFixtureProps> = (props) => props.text;

function expectedRail(capabilities: TerminalCapabilities): string {
  const theme = terminalThemes.dark;
  return styleText(
    `${capabilities.unicode ? "│" : "|"} `,
    {
      ...theme.typography.muted,
      color: terminalThemeColor(theme, "--discern-color-ink-faint"),
    },
    capabilities,
  );
}

Deno.test("Blockquote renders exact narrow, standard, and wide frames across terminal capabilities", () => {
  const frames = [
    [8, "alpha\nbeta\ngamma"],
    [18, "alpha beta gamma"],
    [80, "alpha beta gamma"],
  ] as const;
  for (const [columns, body] of frames) {
    for (
      const colorDepth of [
        "truecolor",
        "ansi256",
        "ansi16",
        "none",
      ] as const
    ) {
      for (const unicode of [true, false]) {
        const capabilities = testTerminalCapabilities({
          columns,
          colorDepth,
          unicode,
        });
        const rail = expectedRail(capabilities);
        const expected = body.split("\n").map((line) => `${rail}${line}`).join(
          "\n",
        );
        const output = renderBlockquoteCli({
          children: [
            createCliBlock(renderWrappedText, { text: "alpha beta gamma" }),
          ],
        }, capabilities);
        assertExactFrame(output, expected, capabilities);
        assertEquals(
          stripAnsi(output),
          body.split("\n").map((line) => `${unicode ? "│" : "|"} ${line}`).join(
            "\n",
          ),
        );
      }
    }
  }
});

Deno.test("Blockquote narrows and preserves styled Paragraph content and hyperlinks", () => {
  const capabilities = testTerminalCapabilities({
    columns: 30,
    colorDepth: "truecolor",
    hyperlinks: true,
  });
  const paragraph = createCliBlock(
    renderParagraphCli,
    {
      content: [
        "Keep ",
        { kind: "strong", content: "meaning" },
        " beside ",
        {
          kind: "link",
          label: "its source",
          destination: "https://example.test/source",
        },
        ".",
      ],
    } as const,
  );
  const output = renderBlockquoteCli({ children: [paragraph] }, capabilities);
  const childCapabilities = { ...capabilities, columns: 28 };
  const child = renderParagraphCli({
    content: [
      "Keep ",
      { kind: "strong", content: "meaning" },
      " beside ",
      {
        kind: "link",
        label: "its source",
        destination: "https://example.test/source",
      },
      ".",
    ],
  }, childCapabilities);
  assertExactFrame(
    output,
    child.split("\n").map((line) => `${expectedRail(capabilities)}${line}`)
      .join("\n"),
    capabilities,
  );
  assert(output.includes("\u001b["));
  assert(
    output.split("\n").flatMap(projectTerminalSpans).some((span) =>
      span.link === "https://example.test/source"
    ),
  );

  const noColour = testTerminalCapabilities({
    columns: 48,
    colorDepth: "none",
    hyperlinks: false,
  });
  assertStringIncludes(
    renderBlockquoteCli({ children: [paragraph] }, noColour).replaceAll(
      "\n│ ",
      " ",
    ),
    "its source (https://example.test/source)",
  );
});

Deno.test("Blockquote rails every intentional blank line and composes nested rails", () => {
  const capabilities = testTerminalCapabilities({
    columns: 30,
    colorDepth: "none",
  });
  const twoBlocks = [
    createCliBlock(renderLiteralText, { text: "first" }),
    createCliBlock(renderLiteralText, { text: "second" }),
  ];
  assertExactFrame(
    renderBlockquoteCli({ children: twoBlocks }, capabilities),
    "│ first\n│ \n│ second",
    capabilities,
  );

  const nested = createCliBlock(renderBlockquoteCli, {
    children: twoBlocks,
  });
  assertExactFrame(
    renderBlockquoteCli({ children: [nested] }, capabilities),
    "│ │ first\n│ │ \n│ │ second",
    capabilities,
  );

  const ascii = { ...capabilities, unicode: false };
  assertExactFrame(
    renderBlockquoteCli({ children: [nested] }, ascii),
    "| | first\n| | \n| | second",
    ascii,
  );
});

Deno.test("Blockquote validates children, renderer output, and available width", () => {
  const capabilities = testTerminalCapabilities({ columns: 20 });
  assertThrows(
    () => renderBlockquoteCli({ children: [] }, capabilities),
    TypeError,
    "one or more",
  );
  assertThrows(
    () =>
      renderBlockquoteCli(
        { children: ["raw" as unknown as CliBlock] },
        capabilities,
      ),
    TypeError,
    "createCliBlock",
  );
  assertThrows(
    () =>
      renderBlockquoteCli({
        children: [
          createCliBlock(renderLiteralText, { text: "\u001b[2Junsafe" }),
        ],
      }, capabilities),
    TypeError,
    "unsupported or unterminated sequence",
  );
  assertThrows(
    () =>
      renderBlockquoteCli({
        children: [createCliBlock(renderLiteralText, { text: "" })],
      }, capabilities),
    TypeError,
    "no visible content",
  );
  for (const maxWidth of [0, 2, 2.5, Number.MAX_SAFE_INTEGER + 1]) {
    assertThrows(
      () =>
        renderBlockquoteCli({
          children: [createCliBlock(renderLiteralText, { text: "valid" })],
          maxWidth,
        }, capabilities),
      TypeError,
      "blockquote width",
    );
  }
  assertThrows(
    () =>
      renderBlockquoteCli({
        children: [createCliBlock(renderLiteralText, { text: "valid" })],
        maxWidth: 3,
      }, testTerminalCapabilities({ columns: 2 })),
    TypeError,
    "terminal columns",
  );
});

Deno.test("Blockquote nesting observes the shared deterministic depth ceiling", () => {
  const capabilities = testTerminalCapabilities({
    columns: CLI_BLOCK_MAX_DEPTH * 2 + 16,
    colorDepth: "none",
  });
  let block = createCliBlock(renderLiteralText, { text: "leaf" });
  for (let depth = 1; depth < CLI_BLOCK_MAX_DEPTH; depth += 1) {
    block = createCliBlock(renderBlockquoteCli, { children: [block] });
  }
  const exact = renderCliBlock(block, capabilities);
  assertEquals(renderCliBlock(block, capabilities), exact);
  assertEquals(measureText(exact), (CLI_BLOCK_MAX_DEPTH - 1) * 2 + 4);

  const tooDeep = createCliBlock(renderBlockquoteCli, { children: [block] });
  assertThrows(
    () => renderCliBlock(tooDeep, capabilities),
    TypeError,
    `exceeds ${CLI_BLOCK_MAX_DEPTH}`,
  );
});

Deno.test("Blockquote output is deterministic and bounded unless a child explicitly preserves width", () => {
  const capabilities = testTerminalCapabilities({
    columns: 12,
    colorDepth: "none",
  });
  const bounded = createCliBlock(renderWrappedText, {
    text: "one two three four",
  });
  const first = renderBlockquoteCli({ children: [bounded] }, capabilities);
  assertEquals(
    renderBlockquoteCli({ children: [bounded] }, capabilities),
    first,
  );
  for (const line of first.split("\n")) {
    assert(measureText(line) <= capabilities.columns, line);
  }

  const preserved = createCliBlock(
    renderLiteralText,
    { text: "one-very-long-unbroken-value" },
    { widthPolicy: "preserve" },
  );
  assertEquals(
    renderBlockquoteCli({ children: [preserved] }, capabilities),
    "│ one-very-long-unbroken-value",
  );
});

Deno.test("Blockquote accepts package-authored styled blocks without repainting them", () => {
  const capabilities = testTerminalCapabilities({
    columns: 40,
    colorDepth: "ansi256",
    hyperlinks: true,
  });
  const childOutput = styleText("styled", { bold: true }, capabilities) +
    " " + styleHyperlink(
      "reference",
      "https://example.test/reference",
      capabilities,
    );
  const child = createCliBlock(renderLiteralText, { text: childOutput });
  const output = renderBlockquoteCli({ children: [child] }, capabilities);
  assertEquals(output, `${expectedRail(capabilities)}${childOutput}`);
});
