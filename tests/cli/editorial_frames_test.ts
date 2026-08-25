import {
  renderStyledSpans,
  styleText,
  type TerminalTextStyle,
} from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  createCliBlock,
  renderCalloutCli,
  renderCodeListingCli,
  renderDataFigureCli,
  renderListCli,
  renderParagraphCli,
} from "../../src/cli/mod.ts";
import { measureText, padText, truncateText } from "../../src/cli/text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  terminalToneColor,
} from "../../src/cli/theme.ts";
import {
  assertExactFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

function expectedFrame(
  title: string,
  lines: readonly string[],
  width: number,
  style: TerminalTextStyle,
  capabilities: TerminalCapabilities,
): string {
  const glyphs = capabilities.unicode
    ? {
      topLeft: "┌",
      topRight: "┐",
      bottomLeft: "└",
      bottomRight: "┘",
      horizontal: "─",
      vertical: "│",
    }
    : {
      topLeft: "+",
      topRight: "+",
      bottomLeft: "+",
      bottomRight: "+",
      horizontal: "-",
      vertical: "|",
    };
  const framedTitle = title === "" ? "" : ` ${
    truncateText(
      title,
      Math.max(0, width - 6),
      capabilities.unicode ? "…" : ".",
    )
  } `;
  const border = (value: string) => styleText(value, style, capabilities);
  const top = `${border(glyphs.topLeft)}${border(framedTitle)}${
    border(glyphs.horizontal.repeat(width - 2 - measureText(framedTitle)))
  }${border(glyphs.topRight)}`;
  const innerWidth = width - 4;
  const content = lines.map((line) =>
    `${border(glyphs.vertical)} ${padText(line, innerWidth)} ${
      border(glyphs.vertical)
    }`
  );
  const bottom = border(
    `${glyphs.bottomLeft}${
      glyphs.horizontal.repeat(width - 2)
    }${glyphs.bottomRight}`,
  );
  return [top, ...content, bottom].join("\n");
}

const calloutProps = {
  eyebrow: "Insight",
  title: "Keep the evidence close",
  body:
    "A terminal note should interrupt the eye without interrupting the argument.",
  tone: "insight",
} as const;

Deno.test("Callout renders exact width, ASCII, and colour frames", () => {
  const frames = [
    [
      24,
      "┌ INSIGHT: Keep the… ──┐\n│ A terminal note      │\n│ should interrupt the │\n│ eye without          │\n│ interrupting the     │\n│ argument.            │\n└──────────────────────┘",
    ],
    [
      52,
      "┌ INSIGHT: Keep the evidence close ────────────────┐\n│ A terminal note should interrupt the eye without │\n│ interrupting the argument.                       │\n└──────────────────────────────────────────────────┘",
    ],
    [
      96,
      "┌ INSIGHT: Keep the evidence close ────────────────────────────────────────────────────────────┐\n│ A terminal note should interrupt the eye without interrupting the argument.                  │\n└──────────────────────────────────────────────────────────────────────────────────────────────┘",
    ],
  ] as const;
  for (const [columns, expected] of frames) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderCalloutCli(calloutProps, capabilities),
      expected,
      capabilities,
    );
  }
  const ascii = testTerminalCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderCalloutCli(calloutProps, ascii),
    "+ INSIGHT: Keep the. --+\n| A terminal note      |\n| should interrupt the |\n| eye without          |\n| interrupting the     |\n| argument.            |\n+----------------------+",
    ascii,
  );
  const theme = terminalThemes.dark;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns: 52, colorDepth });
    const expected = expectedFrame(
      "INSIGHT: Keep the evidence close",
      [
        "A terminal note should interrupt the eye without",
        "interrupting the argument.",
      ],
      52,
      {
        ...theme.typography.strong,
        color: terminalToneColor(theme, "accent"),
      },
      capabilities,
    );
    assertExactFrame(
      renderCalloutCli(calloutProps, capabilities),
      expected,
      capabilities,
    );
  }
});

Deno.test("Callout preserves rich Component children inside its owned frame", () => {
  const capabilities = testTerminalCapabilities({
    columns: 32,
    colorDepth: "none",
    unicode: false,
  });
  assertExactFrame(
    renderCalloutCli({
      title: "Tip",
      tone: "success",
      children: [
        createCliBlock(renderParagraphCli, {
          content: [
            "Keep ",
            { kind: "strong", content: "meaning" },
            " intact.",
          ],
        }),
        createCliBlock(renderListCli, {
          items: [{ content: "First fact" }, { content: "Second fact" }],
        }),
      ],
    }, capabilities),
    "+ Tip -------------------------+\n| Keep **meaning** intact.     |\n|                              |\n| * First fact                 |\n| * Second fact                |\n+------------------------------+",
    capabilities,
  );
});

Deno.test("Callout preserves a marker-only rich note as an empty semantic frame", () => {
  const capabilities = testTerminalCapabilities({
    columns: 24,
    colorDepth: "none",
  });
  assertExactFrame(
    renderCalloutCli({
      title: "Note",
      tone: "note",
      children: [],
    }, capabilities),
    "┌ Note ────────────────┐\n│                      │\n└──────────────────────┘",
    capabilities,
  );
});

const codeListingProps = {
  filename: "brief.ts",
  language: "ts",
  code: 'const brief = {\n  scope: "editorial",\n  status: "ready",\n};',
  highlightLines: [2],
  caption: "A small, deterministic input.",
} as const;

Deno.test("Code listing renders exact width, ASCII, and colour frames", () => {
  const frames = [
    [
      24,
      '┌ brief.ts [ts] ───────┐\n│  1 const brief = {   │\n│ ›2   scope: "editor… │\n│  3   status: "ready… │\n│  4 };                │\n└──────────────────────┘\nCaption: A small,\ndeterministic input.',
    ],
    [
      52,
      '┌ brief.ts [ts] ───────────────────────────────────┐\n│  1 const brief = {                               │\n│ ›2   scope: "editorial",                         │\n│  3   status: "ready",                            │\n│  4 };                                            │\n└──────────────────────────────────────────────────┘\nCaption: A small, deterministic input.',
    ],
    [
      96,
      '┌ brief.ts [ts] ───────────────────────────────────────────────────────────────────────────────┐\n│  1 const brief = {                                                                           │\n│ ›2   scope: "editorial",                                                                     │\n│  3   status: "ready",                                                                        │\n│  4 };                                                                                        │\n└──────────────────────────────────────────────────────────────────────────────────────────────┘\nCaption: A small, deterministic input.',
    ],
  ] as const;
  for (const [columns, expected] of frames) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderCodeListingCli(codeListingProps, capabilities),
      expected,
      capabilities,
    );
  }
  const ascii = testTerminalCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderCodeListingCli(codeListingProps, ascii),
    '+ brief.ts [ts] -------+\n|  1 const brief = {   |\n| >2   scope: "editor. |\n|  3   status: "ready. |\n|  4 };                |\n+----------------------+\nCaption: A small,\ndeterministic input.',
    ascii,
  );
  const theme = terminalThemes.dark;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns: 52, colorDepth });
    const frame = expectedFrame(
      "brief.ts [ts]",
      [
        " 1 const brief = {",
        '›2   scope: "editorial",',
        ' 3   status: "ready",',
        " 4 };",
      ],
      52,
      { color: terminalThemeColor(theme, "--discern-color-ink-faint") },
      capabilities,
    );
    const caption = styleText("Caption: A small, deterministic input.", {
      ...theme.typography.annotation,
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
    }, capabilities);
    assertExactFrame(
      renderCodeListingCli(codeListingProps, capabilities),
      `${frame}\n${caption}`,
      capabilities,
    );
  }
});

const dataFigureProps = {
  eyebrow: "Survey",
  title: "Preferred reading mode",
  visual: "Terminal  ####### 70%\nBrowser   ###     30%",
  legend: [
    { label: "Terminal", tone: "accent" },
    { label: "Browser", tone: "ink" },
  ],
  caption: "Share of respondents by primary reading mode.",
  source: "Documentation survey",
} as const;

Deno.test("Data figure renders exact width, ASCII, and colour frames", () => {
  const frames = [
    [
      24,
      "┌──────────────────────┐\n│ SURVEY: Preferred    │\n│ reading mode         │\n│                      │\n│ Terminal ####### 70% │\n│ Browser ### 30%      │\n└──────────────────────┘\n● Terminal\n● Browser\nShare of respondents by\nprimary reading mode.\nSource: Documentation\nsurvey",
    ],
    [
      52,
      "┌ SURVEY: Preferred reading mode ──────────────────┐\n│ Terminal  ####### 70%                            │\n│ Browser   ###     30%                            │\n└──────────────────────────────────────────────────┘\n● Terminal\n● Browser\nShare of respondents by primary reading mode.\nSource: Documentation survey",
    ],
    [
      96,
      "┌ SURVEY: Preferred reading mode ──────────────────────────────────────────────────────────────┐\n│ Terminal  ####### 70%                                                                        │\n│ Browser   ###     30%                                                                        │\n└──────────────────────────────────────────────────────────────────────────────────────────────┘\n● Terminal\n● Browser\nShare of respondents by primary reading mode.\nSource: Documentation survey",
    ],
  ] as const;
  for (const [columns, expected] of frames) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderDataFigureCli(dataFigureProps, capabilities),
      expected,
      capabilities,
    );
  }
  const ascii = testTerminalCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderDataFigureCli(dataFigureProps, ascii),
    "+----------------------+\n| SURVEY: Preferred    |\n| reading mode         |\n|                      |\n| Terminal ####### 70% |\n| Browser ### 30%      |\n+----------------------+\n* Terminal\n* Browser\nShare of respondents by\nprimary reading mode.\nSource: Documentation\nsurvey",
    ascii,
  );
  const theme = terminalThemes.dark;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns: 52, colorDepth });
    const frame = expectedFrame(
      "SURVEY: Preferred reading mode",
      ["Terminal  ####### 70%", "Browser   ###     30%"],
      52,
      { color: terminalThemeColor(theme, "--discern-color-ink-faint") },
      capabilities,
    );
    const legend = [
      renderStyledSpans([
        { text: "●", style: { color: terminalToneColor(theme, "accent") } },
        { text: " Terminal" },
      ], capabilities),
      renderStyledSpans([
        { text: "●", style: { color: terminalToneColor(theme, "neutral") } },
        { text: " Browser" },
      ], capabilities),
    ].join("\n");
    const source = styleText("Source: Documentation survey", {
      ...theme.typography.annotation,
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
    }, capabilities);
    const expected =
      `${frame}\n${legend}\nShare of respondents by primary reading mode.\n${source}`;
    assertExactFrame(
      renderDataFigureCli(dataFigureProps, capabilities),
      expected,
      capabilities,
    );
  }
});

Deno.test("Data figure wraps over-wide title, visual, and legend losslessly", () => {
  const props = {
    eyebrow: "Q3",
    title: "Latency window",
    visual: "gw-one ##### 900ms\ngw-two # 40ms",
    legend: [{ label: "gateway latency series", tone: "accent" }],
    caption: "Latency by gateway",
  } as const;
  const unicode = testTerminalCapabilities({ columns: 16 });
  assertExactFrame(
    renderDataFigureCli(props, unicode),
    "┌──────────────┐\n│ Q3: Latency  │\n│ window       │\n│              │\n│ gw-one ##### │\n│ 900ms        │\n│ gw-two #     │\n│ 40ms         │\n└──────────────┘\n● gateway\n  latency series\nLatency by\ngateway",
    unicode,
  );
  const ascii = testTerminalCapabilities({ columns: 16, unicode: false });
  assertExactFrame(
    renderDataFigureCli(props, ascii),
    "+--------------+\n| Q3: Latency  |\n| window       |\n|              |\n| gw-one ##### |\n| 900ms        |\n| gw-two #     |\n| 40ms         |\n+--------------+\n* gateway\n  latency series\nLatency by\ngateway",
    ascii,
  );
});
