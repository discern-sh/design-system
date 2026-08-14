import { assertEquals, assertThrows } from "@std/assert";
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
