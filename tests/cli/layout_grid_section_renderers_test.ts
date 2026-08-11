import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import { renderGridCli, renderSectionCli } from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testCapabilities,
} from "./helpers.ts";

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
    const capabilities = testCapabilities({ columns });
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
      const capabilities = testCapabilities({
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
  const narrow = "◮⧩ Build ⧩◮⧨\n\nShared\ndesign\nlanguage";
  const standard = "◮⧩◭⧨◮⧩◭⧨ Build ⧨◭⧩◮⧨◭⧩◮⧨\n\nShared design language";
  const wide =
    "◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨ Build ⧨◭⧩◮⧨◭⧩◮⧨◭⧩◮⧨◭⧩◮⧨\n\nShared design language";
  for (
    const [columns, expected] of [[12, narrow], [24, standard], [
      40,
      wide,
    ]] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testCapabilities({ colorDepth, columns: 24 });
    assertStyledFrame(render(capabilities), standard, capabilities);
  }
  const ascii = testCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    render(ascii),
    ">v^<>v^< Build <^v><^v><\n\nShared design language",
    ascii,
  );
});

Deno.test("Section selects the authoritative multi-row ribbon treatment", () => {
  const capabilities = testCapabilities({ columns: 12 });
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
    "◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨\n⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭\nDetails\nBody",
    capabilities,
  );
});
