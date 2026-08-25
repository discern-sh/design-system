import { assert, assertThrows } from "@std/assert";
import {
  renderStyledSpans,
  stripAnsi,
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

/**
 * Assert every non-whitespace character of the authored value appears in the
 * stripped output in authored order, so no elision anywhere in the frame can
 * pass. Wrapping may reflow whitespace; it must never drop a fact.
 */
function assertContentSurvives(authored: string, stripped: string): void {
  let cursor = 0;
  for (const character of authored) {
    if (/\s/u.test(character)) continue;
    const found = stripped.indexOf(character, cursor);
    assert(
      found !== -1,
      `authored character ${JSON.stringify(character)} of ${
        JSON.stringify(authored)
      } was dropped or reordered`,
    );
    cursor = found + character.length;
  }
}

Deno.test("Data figure never elides authored content at any width, charset, or depth", () => {
  const props = {
    eyebrow: "AUDIT",
    title:
      "GATEWAY LATENCY DISTRIBUTION ACROSS EVERY REGION WINDOW 314159265358979",
    visual: [
      "alpha-gw ################################ 987654321ms",
      "unbrokenrun#########################################98765",
      "東京都渋谷区ゲートウェイ計測値",
      "📊📈📉 telemetry stream widequartet 📊",
    ].join("\n"),
    legend: [
      {
        label: "route66-primary-interconnect-fabric-2468101214161820",
        tone: "accent",
      },
      {
        label: "overflow-mesh-standby-chain-1357911131517192123",
        tone: "ink",
      },
    ] as const,
    caption: "Latency by gateway over the audit window",
    source: "Synthetic audit corpus",
  } as const;
  for (const columns of [6, 10, 24, 80]) {
    for (const unicode of [true, false]) {
      for (const colorDepth of ["none", "truecolor"] as const) {
        const capabilities = testTerminalCapabilities({
          columns,
          unicode,
          colorDepth,
        });
        const posture = `columns ${columns}, unicode ${unicode}, ${colorDepth}`;
        const output = stripAnsi(renderDataFigureCli(props, capabilities));
        for (const line of output.split("\n")) {
          assert(
            measureText(line) <= columns,
            `${posture}: line ${JSON.stringify(line)} escapes the measure`,
          );
        }
        assert(
          !output.includes("…") && !output.includes("."),
          `${posture}: the frame introduced an elision marker`,
        );
        for (
          const authored of [
            props.eyebrow,
            props.title,
            props.visual,
            props.legend[0].label,
            props.legend[1].label,
            props.caption,
            props.source,
          ]
        ) {
          assertContentSurvives(authored, output);
        }
      }
    }
  }
});

Deno.test("Data figure refuses an impossible single-grapheme fit instead of eliding it", () => {
  for (const unicode of [true, false]) {
    const capabilities = testTerminalCapabilities({ columns: 5, unicode });
    for (
      const impossible of [
        { title: "T", visual: "東", caption: "c" },
        { title: "T", visual: "📊", caption: "c" },
        { title: "計測", visual: "ok", caption: "c" },
      ] as const
    ) {
      assertThrows(
        () => renderDataFigureCli(impossible, capabilities),
        TypeError,
        "wider than the frame's inner measure",
      );
    }
    const narrow = stripAnsi(renderDataFigureCli({
      title: "Top",
      visual: "ok",
      caption: "c",
      legend: [{ label: "東京 series" }],
    }, capabilities));
    for (const line of narrow.split("\n")) {
      assert(measureText(line) <= 5, `${JSON.stringify(line)} escapes width 5`);
    }
    for (const authored of ["Top", "ok", "東京 series", "c"]) {
      assertContentSurvives(authored, narrow);
    }
  }
});
