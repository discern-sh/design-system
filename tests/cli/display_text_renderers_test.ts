import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  renderHeadingCli,
  renderKickerCli,
  renderStatCli,
  renderTagCli,
} from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testCapabilities,
} from "./helpers.ts";

function assertCapabilityLevels(
  render: (capabilities: TerminalCapabilities) => string,
  expectedUnicode: string,
  expectedAscii: string,
): void {
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testCapabilities({ colorDepth, columns: 24 });
    assertStyledFrame(render(capabilities), expectedUnicode, capabilities);
  }
  const plain = testCapabilities({ columns: 24 });
  assertExactFrame(render(plain), expectedUnicode, plain);
  const ascii = testCapabilities({ columns: 24, unicode: false });
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
    const capabilities = testCapabilities({ columns });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
  assertCapabilityLevels(
    render,
    "## Rules that travel",
    "## Rules that travel",
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
    const capabilities = testCapabilities({ columns });
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
    const capabilities = testCapabilities({ columns });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
  assertCapabilityLevels(
    render,
    "ENTRIES\n128\nAcross four collections",
    "ENTRIES\n128\nAcross four collections",
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
    const capabilities = testCapabilities({ columns });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
  assertCapabilityLevels(render, "‹ selected × ›", "[ selected x ]");
});
