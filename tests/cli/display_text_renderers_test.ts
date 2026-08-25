import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  type HeadingCliProps,
  renderHeadingCli,
  renderKickerCli,
  renderStatCli,
  renderTagCli,
} from "../../src/cli/mod.ts";
import { projectTerminalSpans } from "../../src/cli/projection.ts";
import type { SemanticInlineContent } from "../../src/cli/semantic-inline.ts";
import {
  measureText,
  wrapStyledTextPreservingIndent,
} from "../../src/cli/text.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

function assertCapabilityLevels(
  render: (capabilities: TerminalCapabilities) => string,
  expectedUnicode: string,
  expectedAscii: string,
): void {
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testTerminalCapabilities({ colorDepth, columns: 24 });
    assertStyledFrame(render(capabilities), expectedUnicode, capabilities);
  }
  const plain = testTerminalCapabilities({ columns: 24 });
  assertExactFrame(render(plain), expectedUnicode, plain);
  const ascii = testTerminalCapabilities({ columns: 24, unicode: false });
  assertExactFrame(render(ascii), expectedAscii, ascii);
}

Deno.test("Heading renders exact narrow, standard, wide, and colour-degraded text", () => {
  const render = (capabilities: TerminalCapabilities) =>
    renderHeadingCli(
      { text: "Rules that", accent: "travel", level: 2 },
      capabilities,
    );
  for (
    const [columns, expected] of [
      [8, "##  tra…"],
      [24, "## Rules that travel"],
      [48, "## Rules that travel"],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(render(capabilities), `\n${expected}`, capabilities);
  }
  assertCapabilityLevels(
    render,
    "\n## Rules that travel",
    "\n## Rules that travel",
  );
});

Deno.test("Heading owns one leading blank line by default and validates explicit overrides", () => {
  const capabilities = testTerminalCapabilities({ columns: 32 });
  const render = renderHeadingCli as unknown as (
    props: {
      readonly text: string;
      readonly leadingBlankLines?: number;
    },
    capabilities: TerminalCapabilities,
  ) => string;
  assertEquals(render({ text: "Boundary" }, capabilities), "\n## Boundary");
  assertEquals(
    render({ text: "Boundary", leadingBlankLines: 0 }, capabilities),
    "## Boundary",
  );
  assertEquals(
    render({ text: "Boundary", leadingBlankLines: 2 }, capabilities),
    "\n\n## Boundary",
  );
  for (const invalid of [-1, 1.5, Number.NaN]) {
    assertThrows(
      () =>
        render({ text: "Boundary", leadingBlankLines: invalid }, capabilities),
      TypeError,
      "leading blank lines",
    );
  }
});

Deno.test("Heading retains every semantic level in its exact CLI prefix", () => {
  const capabilities = testTerminalCapabilities({ columns: 32 });
  for (const level of [1, 2, 3, 4, 5, 6] as const) {
    assertExactFrame(
      renderHeadingCli({ text: "Section", level }, capabilities),
      `\n${"#".repeat(level)} Section`,
      capabilities,
    );
  }
});

Deno.test("Heading document treatment styles H1 through H6 and degrades to level markers", () => {
  const styledVisible = {
    1: `▲ Level 1\n${"━".repeat(32)}`,
    2: `Level 2\n${"─".repeat(32)}`,
    3: `╶─ Level 3 ${"─".repeat(21)}`,
    4: "Level 4",
    5: "Level 5",
    6: "Level 6",
  } as const;

  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    for (const theme of ["light", "dark"] as const) {
      const capabilities = testTerminalCapabilities({
        colorDepth,
        columns: 32,
        unicode: true,
      });
      for (const level of [1, 2, 3, 4, 5, 6] as const) {
        const output = renderHeadingCli({
          text: `Level ${level}`,
          level,
          treatment: "document",
          overflow: "wrap",
          leadingBlankLines: 0,
          theme,
        }, capabilities);
        assertEquals(stripAnsi(output), styledVisible[level]);
        assert(!stripAnsi(output).includes("#"));
        for (const line of output.split("\n")) {
          assert(measureText(line) <= capabilities.columns);
        }
        const content = projectTerminalSpans(output).find((span) =>
          span.text === `Level ${level}`
        );
        assert(content?.style !== undefined);
        if (level <= 4) assertEquals(content.style.bold, true);
        if (level === 5) {
          assertEquals(content.style.bold, undefined);
          assertEquals(content.style.italic, true);
        }
        if (level === 6) {
          assertEquals(content.style.dim, true);
          assertEquals(content.style.italic, true);
        }
      }
    }
  }

  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    for (const unicode of [true, false]) {
      if (colorDepth !== "none" && unicode) continue;
      const capabilities = testTerminalCapabilities({
        colorDepth,
        columns: 32,
        unicode,
      });
      for (const level of [1, 2, 3, 4, 5, 6] as const) {
        const props = {
          text: `Level ${level}`,
          level,
          overflow: "wrap",
          leadingBlankLines: 0,
        } as const satisfies HeadingCliProps;
        assertEquals(
          renderHeadingCli({ ...props, treatment: "document" }, capabilities),
          renderHeadingCli(props, capabilities),
        );
      }
    }
  }

  const narrow = testTerminalCapabilities({
    colorDepth: "ansi16",
    columns: 14,
    unicode: true,
  });
  assertEquals(
    stripAnsi(renderHeadingCli({
      text: "A deliberately long document boundary",
      level: 1,
      treatment: "document",
      overflow: "wrap",
      leadingBlankLines: 0,
    }, narrow)),
    [
      "▲ A",
      "  deliberately",
      "  long",
      "  document",
      "  boundary",
      "━".repeat(14),
    ].join("\n"),
  );
});

Deno.test("Heading explicit truncation remains byte-identical to its legacy default", () => {
  const legacy = {
    text: "Rules that are deliberately long",
    accent: "travel intact",
    level: 2,
    maxWidth: 18,
  } as const satisfies HeadingCliProps;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    for (const unicode of [true, false]) {
      const capabilities = testTerminalCapabilities({
        columns: 40,
        colorDepth,
        unicode,
      });
      assertEquals(
        renderHeadingCli({ ...legacy, overflow: "truncate" }, capabilities),
        renderHeadingCli(legacy, capabilities),
      );
      assertEquals(
        renderHeadingCli({ ...legacy, treatment: "default" }, capabilities),
        renderHeadingCli(legacy, capabilities),
      );
    }
  }
});

Deno.test("Heading lossless policy wraps plain text and accent beneath the content column", () => {
  const props = {
    text: "A deliberately long heading",
    accent: "accent phrase",
    level: 3,
    overflow: "wrap",
    maxWidth: 18,
    leadingBlankLines: 0,
  } as const satisfies HeadingCliProps;
  const expected = "### A deliberately\n    long heading\n    accent phrase";

  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    for (const unicode of [true, false]) {
      const capabilities = testTerminalCapabilities({
        columns: 40,
        colorDepth,
        unicode,
      });
      const output = renderHeadingCli(props, capabilities);
      assertStyledFrame(output, expected, capabilities);
      for (const line of output.split("\n")) {
        assert(measureText(line) <= 18, stripAnsi(line));
        assertEquals(wrapStyledTextPreservingIndent(line, 18), [line]);
      }
    }
  }
  for (const unicode of [true, false]) {
    const capabilities = testTerminalCapabilities({
      columns: 40,
      colorDepth: "none",
      unicode,
    });
    assertExactFrame(
      renderHeadingCli(props, capabilities),
      expected,
      capabilities,
    );
  }
});

const richHeadingContent = [
  "A long ",
  {
    kind: "strong",
    content: [
      "semantic ",
      { kind: "emphasis", content: "heading" },
    ],
  },
  " links to ",
  {
    kind: "link",
    label: "the reference guide",
    destination: "https://example.test/guide",
  },
  " across 漢字 and 🚀 tools.",
] as const satisfies SemanticInlineContent;

Deno.test("Heading rich wrapping preserves nested styles and links on independent lines", () => {
  const props = {
    content: richHeadingContent,
    level: 2,
    overflow: "wrap",
    leadingBlankLines: 0,
  } as const satisfies HeadingCliProps;
  const expected = [
    "## A long semantic heading",
    "   links to the reference",
    "   guide across 漢字 and",
    "   🚀 tools.",
  ].join("\n");

  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    for (const unicode of [true, false]) {
      const capabilities = testTerminalCapabilities({
        columns: 26,
        colorDepth,
        unicode,
      });
      const output = renderHeadingCli(props, capabilities);
      assertStyledFrame(output, expected, capabilities);
      assertEquals(renderHeadingCli(props, capabilities), output);
      assert(!output.startsWith("\n"));

      const lines = output.split("\n");
      for (const line of lines) {
        assert(measureText(line) <= 26, stripAnsi(line));
        assertEquals(wrapStyledTextPreservingIndent(line, 26), [line]);
      }
      const linked = lines.flatMap(projectTerminalSpans).filter((span) =>
        span.link === "https://example.test/guide"
      );
      assertEquals(linked.map((span) => span.text), ["the reference", "guide"]);
      assert(linked.every((span) => span.style?.underline === true));
      const headingRuns = lines.slice(1).flatMap(projectTerminalSpans).filter(
        (span) => span.text.trim() !== "",
      );
      assert(
        headingRuns.every((span) => span.style?.bold === true),
        "each rich continuation must independently retain display styling",
      );
    }
  }
});

Deno.test("Heading document treatment preserves rich wrapping and hyperlink targets", () => {
  const props = {
    content: richHeadingContent,
    level: 2,
    overflow: "wrap",
    treatment: "document",
    leadingBlankLines: 0,
  } as const satisfies HeadingCliProps;
  const capabilities = testTerminalCapabilities({
    columns: 26,
    colorDepth: "ansi256",
    hyperlinks: true,
    unicode: true,
  });
  const output = renderHeadingCli(props, capabilities);
  assertEquals(
    stripAnsi(output),
    [
      "A long semantic heading",
      "links to the reference",
      "guide across 漢字 and 🚀",
      "tools.",
      "─".repeat(26),
    ].join("\n"),
  );
  const linked = projectTerminalSpans(output).filter((span) =>
    span.link === "https://example.test/guide"
  );
  assertEquals(linked.map((span) => span.text), ["the reference", "guide"]);
  for (const line of output.split("\n")) {
    assert(measureText(line) <= capabilities.columns);
  }
});

Deno.test("Heading rich no-colour fallback is exact, lossless, and width-bounded", () => {
  const expected = [
    "## A long",
    "   **semantic",
    "   _heading_**",
    "   links to the",
    "   reference guide",
    "   (https://exampl",
    "   e.test/guide)",
    "   across 漢字 and",
    "   🚀 tools.",
  ].join("\n");
  for (const unicode of [true, false]) {
    const capabilities = testTerminalCapabilities({
      columns: 18,
      colorDepth: "none",
      unicode,
    });
    const output = renderHeadingCli(
      {
        content: richHeadingContent,
        level: 2,
        overflow: "wrap",
        leadingBlankLines: 0,
      },
      capabilities,
    );
    assertExactFrame(output, expected, capabilities);
    assertStringIncludes(
      output.split("\n").map((line) => line.trimStart()).join(""),
      "https://example.test/guide",
    );
    for (const line of output.split("\n")) {
      assert(measureText(line) <= 18, line);
    }
  }
});

Deno.test("Heading preserves structurally empty rich headings", () => {
  const capabilities = testTerminalCapabilities({
    columns: 24,
    colorDepth: "none",
  });
  for (const content of ["", []] as const) {
    assertExactFrame(
      renderHeadingCli({
        content,
        level: 1,
        overflow: "wrap",
        leadingBlankLines: 0,
      }, capabilities),
      "# ",
      capabilities,
    );
  }
});

Deno.test("Heading rich path validates hostile content and impossible wrapped prefixes", () => {
  const capabilities = testTerminalCapabilities({ columns: 32 });
  for (const content of ["unsafe\u001btext", "unsafe\u200btext"]) {
    assertThrows(
      () =>
        renderHeadingCli(
          { content, overflow: "wrap" },
          capabilities,
        ),
      TypeError,
      "control and format",
    );
  }
  assertThrows(
    () =>
      renderHeadingCli(
        {
          content: [{
            kind: "link",
            label: "unsafe",
            destination: "javascript:alert(1)",
          }],
          overflow: "wrap",
        },
        capabilities,
      ),
    TypeError,
    "unsafe scheme",
  );
  assertThrows(
    () =>
      renderHeadingCli(
        {
          text: "No content cell",
          level: 6,
          overflow: "wrap",
          maxWidth: 7,
        },
        capabilities,
      ),
    TypeError,
    "needs at least 8 cells",
  );
  assertThrows(
    () =>
      renderHeadingCli(
        {
          text: "Unknown treatment",
          treatment: "unknown" as "default",
        },
        capabilities,
      ),
    TypeError,
    "unknown heading treatment",
  );
});

Deno.test("Kicker renders exact narrow, standard, wide, and colour-degraded annotations", () => {
  const render = (capabilities: TerminalCapabilities) =>
    renderKickerCli({ text: "Working agreement", index: "02" }, capabilities);
  for (
    const [columns, expected] of [
      [8, "[02] WO…"],
      [24, "[02] WORKING AGREEMENT"],
      [48, "[02] WORKING AGREEMENT"],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
  assertCapabilityLevels(
    render,
    "[02] WORKING AGREEMENT",
    "[02] WORKING AGREEMENT",
  );
});

Deno.test("Stat renders exact narrow, standard, wide, and colour-degraded figures", () => {
  const render = (capabilities: TerminalCapabilities) =>
    renderStatCli(
      { label: "Entries", value: "128", context: "Across four collections" },
      capabilities,
    );
  for (
    const [columns, expected] of [
      [8, "ENTRIES\n128\nAcross …"],
      [24, "ENTRIES\n128\nAcross four collections"],
      [48, "ENTRIES\n128\nAcross four collections"],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
  assertCapabilityLevels(
    render,
    "ENTRIES\n128\nAcross four collections",
    "ENTRIES\n128\nAcross four collections",
  );
});

Deno.test("Stat carries an annotated sparkline beneath its trend line", () => {
  const render = (capabilities: TerminalCapabilities) =>
    renderStatCli(
      {
        label: "Throughput",
        value: "9.1",
        context: "Up 5.9 from last period",
        trend: "positive",
        sparkline: [3.2, 4.1, 3.8, 5.5, 7.4, 9.1],
      },
      capabilities,
    );
  const capabilities = testTerminalCapabilities({ columns: 32 });
  assertExactFrame(
    render(capabilities),
    "THROUGHPUT\n9.1\nUp 5.9 from last period\n▁▂▂▄▆█ 3.2→9.1",
    capabilities,
  );
  assertCapabilityLevels(
    render,
    "THROUGHPUT\n9.1\nUp 5.9 from last period\n▁▂▂▄▆█ 3.2→9.1",
    "THROUGHPUT\n9.1\nUp 5.9 from last period\n___==# 3.2->9.1",
  );
});

Deno.test("Tag renders exact narrow, standard, wide, and ASCII-removal frames", () => {
  const render = (capabilities: TerminalCapabilities) =>
    renderTagCli({ label: "selected", removable: true }, capabilities);
  for (
    const [columns, expected] of [
      [8, "‹ s… × ›"],
      [24, "‹ selected × ›"],
      [48, "‹ selected × ›"],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
  assertCapabilityLevels(render, "‹ selected × ›", "[ selected x ]");
});
