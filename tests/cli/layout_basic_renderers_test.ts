import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  renderClusterCli,
  renderContainerCli,
  renderStackCli,
} from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

function assertCapabilityInvariant(
  render: (capabilities: TerminalCapabilities) => string,
  expected: string,
  columns: number,
): void {
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
        columns,
        unicode,
      });
      assertExactFrame(render(capabilities), expected, capabilities);
    }
  }
}

Deno.test("Container wraps exact narrow, standard, wide, and capability-invariant measures", () => {
  const render = (capabilities: TerminalCapabilities) =>
    renderContainerCli(
      {
        body: "Readable content stays centred",
        size: "measure",
        width: capabilities.columns,
      },
      capabilities,
    );
  for (
    const [columns, expected] of [
      [12, "Readable\ncontent\nstays\ncentred"],
      [24, "Readable content stays\ncentred"],
      [80, "                Readable content stays centred"],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
  assertCapabilityInvariant(
    render,
    "Readable content stays\ncentred",
    24,
  );
});

Deno.test("Cluster wraps exact narrow, standard, wide, and capability-invariant items", () => {
  const render = (capabilities: TerminalCapabilities) =>
    renderClusterCli(
      { items: ["Save", "Preview", "Cancel"], width: capabilities.columns },
      capabilities,
    );
  for (
    const [columns, expected] of [
      [8, "Save\nPreview\nCancel"],
      [16, "Save  Preview\nCancel"],
      [32, "Save  Preview  Cancel"],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
  assertCapabilityInvariant(render, "Save  Preview\nCancel", 16);
});

Deno.test("Stack joins exact narrow, standard, wide, and capability-invariant blocks", () => {
  const render = (capabilities: TerminalCapabilities) =>
    renderStackCli(
      { blocks: ["First block", "Second block"], width: capabilities.columns },
      capabilities,
    );
  for (
    const [columns, expected] of [
      [8, "First\nblock\n\nSecond\nblock"],
      [20, "First block\n\nSecond block"],
      [40, "First block\n\nSecond block"],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
  assertCapabilityInvariant(render, "First block\n\nSecond block", 20);
});
