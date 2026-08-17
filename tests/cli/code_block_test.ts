import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { stripAnsi, styleText } from "../../src/cli/ansi.ts";
import {
  createCliBlock,
  renderCliBlock,
} from "../../src/cli/block-composition.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";
import { projectTerminalSpans } from "../../src/cli/projection.ts";
import { measureText } from "../../src/cli/text.ts";
import { terminalThemeColor, terminalThemes } from "../../src/cli/theme.ts";
import renderCodeBlockCli, {
  cliExamples,
  type CodeBlockCliProps,
} from "../../src/components/editorial/code-block/code-block.cli.ts";

Deno.test("Code block wraps losslessly at narrow, standard, and wide measures", () => {
  const frames = [
    [8, "╭──────╮\n│ 01234│\n│›56789│\n╰──────╯"],
    [10, "╭────────╮\n│ 0123456│\n│›789    │\n╰────────╯"],
    [
      24,
      "╭──────────────────────╮\n│ 0123456789           │\n╰──────────────────────╯",
    ],
  ] as const;
  for (const [columns, expected] of frames) {
    const capabilities = testTerminalCapabilities({
      columns,
      colorDepth: "none",
    });
    const output = renderCodeBlockCli({ code: "0123456789" }, capabilities);
    assertEquals(output, expected);
    assert(!output.startsWith("\n"));
    assert(!output.endsWith("\n"));
    for (const line of output.split("\n")) {
      assert(measureText(line) <= columns, line);
    }
  }
});

Deno.test("Code block exact rails and source styling degrade across every capability", () => {
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    for (const unicode of [true, false]) {
      const capabilities = testTerminalCapabilities({
        columns: 16,
        colorDepth,
        unicode,
      });
      const theme = terminalThemes.dark;
      const railStyle = {
        ...theme.typography.muted,
        color: terminalThemeColor(theme, "--discern-color-ink-faint"),
      };
      const labelStyle = {
        ...theme.typography.annotation,
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      };
      const codeStyle = {
        color: terminalThemeColor(theme, "--discern-color-ink"),
      };
      const horizontal = unicode ? "─" : "-";
      const vertical = unicode ? "│" : "|";
      const topLeft = unicode ? "╭" : "+";
      const topRight = unicode ? "╮" : "+";
      const bottomLeft = unicode ? "╰" : "+";
      const bottomRight = unicode ? "╯" : "+";
      const continuation = unicode ? "›" : ">";
      const label = unicode ? "ts · module" : "ts - module";
      const expected = [
        `${styleText(`${topLeft}${horizontal} `, railStyle, capabilities)}${
          styleText(label, labelStyle, capabilities)
        }${styleText(` ${topRight}`, railStyle, capabilities)}`,
        `${styleText(vertical, railStyle, capabilities)} ${
          styleText("let value = 1", codeStyle, capabilities)
        }${styleText(vertical, railStyle, capabilities)}`,
        `${styleText(vertical, railStyle, capabilities)}${
          styleText(continuation, railStyle, capabilities)
        }${styleText(";", codeStyle, capabilities)}${" ".repeat(12)}${
          styleText(vertical, railStyle, capabilities)
        }`,
        `${styleText(vertical, railStyle, capabilities)}${" ".repeat(14)}${
          styleText(vertical, railStyle, capabilities)
        }`,
        styleText(
          `${bottomLeft}${horizontal.repeat(14)}${bottomRight}`,
          railStyle,
          capabilities,
        ),
      ].join("\n");
      assertEquals(
        renderCodeBlockCli(
          {
            language: "ts",
            info: "module",
            code: "let value = 1;\n",
          },
          capabilities,
        ),
        expected,
      );
    }
  }
});

Deno.test("Code block preserves indentation, blank lines, tabs, and Markdown delimiters", () => {
  const capabilities = testTerminalCapabilities({
    columns: 40,
    colorDepth: "none",
  });
  const output = renderCodeBlockCli(
    { code: "\n\t*literal*  `code`\n\n  value\tnext\n" },
    capabilities,
  );
  assertEquals(
    output,
    [
      "╭──────────────────────────────────────╮",
      "│                                      │",
      "│     *literal*  `code`                │",
      "│                                      │",
      "│   value next                         │",
      "│                                      │",
      "╰──────────────────────────────────────╯",
    ].join("\n"),
  );
  assert(!output.startsWith("\n"));
  assert(!output.endsWith("\n"));
});

Deno.test("Code block hard wrapping preserves long tokens and Unicode graphemes", () => {
  const narrow = testTerminalCapabilities({
    columns: 6,
    colorDepth: "none",
  });
  assertEquals(
    renderCodeBlockCli({ code: "界e\u0301🙂" }, narrow),
    "╭────╮\n│ 界e\u0301│\n│›🙂 │\n╰────╯",
  );

  const source = "abcdefghijklmnopqrstuvwxyz";
  const output = renderCodeBlockCli(
    { code: source },
    testTerminalCapabilities({ columns: 9, colorDepth: "none" }),
  );
  const recovered = output.split("\n").slice(1, -1).map((line) =>
    line.slice(2, -1).trimEnd()
  ).join("");
  assertEquals(recovered, source);
  assert(output.split("\n").every((line) => measureText(line) <= 9));
});

Deno.test("Code block renders terminal-control payloads visibly instead of activating them", () => {
  const capabilities = testTerminalCapabilities({
    columns: 80,
    colorDepth: "none",
  });
  const output = renderCodeBlockCli(
    { code: "\u001b[31m*not styled*\u001b[0m\u200e\r" },
    capabilities,
  );
  assertEquals(
    output,
    "╭──────────────────────────────────────────────────────────────────────────────╮\n│ \\u{1B}[31m*not styled*\\u{1B}[0m\\u{200E}\\u{D}                                 │\n╰──────────────────────────────────────────────────────────────────────────────╯",
  );
  assert(!/[\p{Cc}\p{Cf}]/u.test(output.replaceAll("\n", "")));
  assertEquals(
    projectTerminalSpans(output).map((span) => span.text).join(""),
    output,
  );

  const coloured = renderCodeBlockCli(
    { code: "\u001b[2Jstill visible" },
    testTerminalCapabilities({ columns: 80, colorDepth: "truecolor" }),
  );
  assertStringIncludes(stripAnsi(coloured), "\\u{1B}[2Jstill visible");
  projectTerminalSpans(coloured);
});

Deno.test("Code block preserve mode is the explicit width-overflow contract", () => {
  const capabilities = testTerminalCapabilities({
    columns: 8,
    colorDepth: "none",
  });
  const props = {
    code: "0123456789",
    widthPolicy: "preserve",
  } as const satisfies CodeBlockCliProps;
  const output = renderCodeBlockCli(props, capabilities);
  assertEquals(output, "╭───────────╮\n│ 0123456789│\n╰───────────╯");
  assert(measureText(output) > capabilities.columns);

  const preserved = createCliBlock(renderCodeBlockCli, props, {
    widthPolicy: props.widthPolicy === "preserve" ? "preserve" : "bounded",
  });
  assertEquals(renderCliBlock(preserved, capabilities), output);

  const wrappedProps: CodeBlockCliProps = { code: props.code };
  const wrapped = createCliBlock(renderCodeBlockCli, wrappedProps, {
    widthPolicy: wrappedProps.widthPolicy === "preserve"
      ? "preserve"
      : "bounded",
  });
  assertEquals(
    renderCliBlock(wrapped, capabilities),
    "╭──────╮\n│ 01234│\n│›56789│\n╰──────╯",
  );
});

Deno.test("Code block validates width, labels, source, and width policy", () => {
  const capabilities = testTerminalCapabilities({ columns: 40 });
  for (const maxWidth of [0, 3, 4, 4.5, Number.MAX_SAFE_INTEGER + 1]) {
    assertThrows(
      () => renderCodeBlockCli({ code: "value", maxWidth }, capabilities),
      TypeError,
      "code block width",
    );
  }
  for (const language of ["", " ts", "ts ", "t\u001bs", "t\u200es"]) {
    assertThrows(
      () => renderCodeBlockCli({ code: "value", language }, capabilities),
      TypeError,
      "code block language",
    );
  }
  for (const info of ["", " info", "info\nline"]) {
    assertThrows(
      () => renderCodeBlockCli({ code: "value", info }, capabilities),
      TypeError,
      "code block info",
    );
  }
  assertThrows(
    () =>
      renderCodeBlockCli(
        { code: 42 as unknown as string },
        capabilities,
      ),
    TypeError,
    "code block code",
  );
  assertThrows(
    () =>
      renderCodeBlockCli(
        {
          code: "value",
          widthPolicy: "truncate" as NonNullable<
            CodeBlockCliProps["widthPolicy"]
          >,
        },
        capabilities,
      ),
    TypeError,
    "unknown code block width policy",
  );
  assertThrows(
    () =>
      renderCodeBlockCli(
        {
          code: "value",
          theme: "contrast" as NonNullable<CodeBlockCliProps["theme"]>,
        },
        capabilities,
      ),
    TypeError,
    "unknown code block theme",
  );
});

Deno.test("Code block accepts empty source and renders deterministically", () => {
  const capabilities = testTerminalCapabilities({
    columns: 32,
    colorDepth: "ansi256",
  });
  const empty = renderCodeBlockCli({ code: "" }, capabilities);
  assertEquals(
    stripAnsi(empty),
    "╭──────────────────────────────╮\n│                              │\n╰──────────────────────────────╯",
  );
  for (const example of cliExamples) {
    const first = renderCodeBlockCli(example.props, capabilities);
    assertEquals(renderCodeBlockCli(example.props, capabilities), first);
    assert(!first.startsWith("\n"));
    assert(!first.endsWith("\n"));
    projectTerminalSpans(first);
  }
});
