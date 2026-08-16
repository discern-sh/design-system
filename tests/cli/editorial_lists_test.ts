import { styleText } from "../../src/cli/ansi.ts";
import {
  renderFootnotesCli,
  renderKeyPointsCli,
  renderRelatedContentCli,
  renderTableOfContentsCli,
} from "../../src/cli/mod.ts";
import {
  terminalThemeColor,
  terminalThemes,
  terminalToneColor,
} from "../../src/cli/theme.ts";
import {
  assertExactFrame,
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
