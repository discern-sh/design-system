import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  renderGridCli,
  renderMasonryCli,
  renderMotifSectionRule,
  renderSectionCli,
} from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

Deno.test("Grid renders exact narrow, standard, wide, and capability-invariant rows", () => {
  const render = (capabilities: TerminalCapabilities) =>
    renderGridCli(
      {
        blocks: ["Alpha", "Beta", "Gamma", "Delta"],
        minimum: 8,
        width: capabilities.columns,
      },
      capabilities,
    );
  for (
    const [columns, expected] of [
      [12, "Alpha\n\n\nBeta\n\n\nGamma\n\n\nDelta"],
      [24, "Alpha        Beta\n\n\nGamma        Delta"],
      [40, "Alpha         Beta          Gamma\n\n\nDelta"],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
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
        colorDepth,
        columns: 24,
        unicode,
      });
      assertExactFrame(
        render(capabilities),
        "Alpha        Beta\n\n\nGamma        Delta",
        capabilities,
      );
    }
  }
});

Deno.test("Masonry packs each block into the shortest exact terminal column", () => {
  const blocks = [
    "Alpha\nshort",
    "Beta\nline two\nline three",
    "Gamma",
    "Delta\ntwo",
  ];
  const render = (capabilities: TerminalCapabilities) =>
    renderMasonryCli(
      { blocks, minimum: 10, width: capabilities.columns },
      capabilities,
    );
  for (
    const [columns, expected] of [
      [
        12,
        "Alpha\nshort\n\n\nBeta\nline two\nline three\n\n\nGamma\n\n\nDelta\ntwo",
      ],
      [
        24,
        "Alpha        Beta\nshort        line two\n             line three\n\nGamma\n             Delta\n             two",
      ],
      [
        36,
        "Alpha        Beta         Gamma\nshort        line two\n             line three\n                          Delta\n                          two",
      ],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
  for (const colorDepth of ["none", "ansi16", "truecolor"] as const) {
    for (const unicode of [true, false]) {
      const capabilities = testTerminalCapabilities({
        colorDepth,
        columns: 24,
        unicode,
      });
      assertExactFrame(
        render(capabilities),
        "Alpha        Beta\nshort        line two\n             line three\n\nGamma\n             Delta\n             two",
        capabilities,
      );
    }
  }
});

Deno.test("Section renders exact narrow, standard, wide, and degraded labelled rules", () => {
  const render = (capabilities: TerminalCapabilities) =>
    renderSectionCli(
      {
        title: "Build",
        body: "Shared design language",
        width: capabilities.columns,
      },
      capabilities,
    );
  for (
    const [columns, body] of [[12, "Shared\ndesign\nlanguage"], [
      24,
      "Shared design language",
    ], [
      40,
      "Shared design language",
    ]] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    const rule = renderMotifSectionRule(
      "Build",
      { width: columns },
      capabilities,
    );
    assertExactFrame(render(capabilities), `${rule}\n\n${body}`, capabilities);
  }
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testTerminalCapabilities({ colorDepth, columns: 24 });
    const rule = renderMotifSectionRule(
      "Build",
      { width: 24 },
      { ...capabilities, colorDepth: "none" },
    );
    assertStyledFrame(
      render(capabilities),
      `${rule}\n\nShared design language`,
      capabilities,
    );
  }
  const ascii = testTerminalCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    render(ascii),
    `${
      renderMotifSectionRule("Build", { width: 24 }, ascii)
    }\n\nShared design language`,
    ascii,
  );
});

Deno.test("Section selects the authoritative leading-marker rule treatment", () => {
  const capabilities = testTerminalCapabilities({ columns: 12 });
  assertExactFrame(
    renderSectionCli(
      {
        title: "Details",
        body: "Body",
        treatment: "ribbon",
        spacing: "sm",
        width: 12,
      },
      capabilities,
    ),
    "▲  ─────────\nDetails\nBody",
    capabilities,
  );
});
