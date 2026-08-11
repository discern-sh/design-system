import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  renderResultSummaryCli,
  renderStandardMeterCli,
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
  for (const unicode of [true, false]) {
    const expected = unicode ? expectedUnicode : expectedAscii;
    for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
      const capabilities = testCapabilities({
        colorDepth,
        columns: 52,
        unicode,
      });
      assertStyledFrame(render(capabilities), expected, capabilities);
    }
    const capabilities = testCapabilities({ columns: 52, unicode });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
}

Deno.test("Result summary renders exact widths, capability levels, and every outcome", () => {
  const props = {
    state: "passed",
    fact: "The full gate passed",
    counts: [
      { label: "Tests", value: "310" },
      { label: "Files", value: "98" },
    ],
    duration: "2m 18s",
    nextAction: "Accept the branch",
    machineReadable: '{"ok":true}',
  } as const;
  const standard =
    '✓ Passed: The full gate passed\nTests: 310   Files: 98   Duration: 2m 18s\nNext: Accept the branch\nData: {"ok":true}';
  for (
    const [columns, expected] of [
      [
        24,
        '✓ Passed: The full gate\n          passed\nTests: 310   Files: 98\nDuration: 2m 18s\nNext: Accept the branch\nData: {"ok":true}',
      ],
      [52, standard],
      [80, standard],
    ] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderResultSummaryCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    (capabilities) => renderResultSummaryCli(props, capabilities),
    standard,
    '+ Passed: The full gate passed\nTests: 310   Files: 98   Duration: 2m 18s\nNext: Accept the branch\nData: {"ok":true}',
  );

  const capabilities = testCapabilities({ columns: 52 });
  for (
    const [state, expected] of [
      ["passed", "✓ Passed: One fact"],
      ["failed", "✕ Failed: One fact"],
      ["blocked", "! Blocked: One fact"],
      ["changed", "◇ Changed: One fact"],
      ["unchanged", "= Unchanged: One fact"],
    ] as const
  ) {
    assertExactFrame(
      renderResultSummaryCli({ state, fact: "One fact" }, capabilities),
      expected,
      capabilities,
    );
  }
});

Deno.test("Standard meter renders exact widths, capability levels, and both limit directions", () => {
  const props = {
    label: "CLI pending",
    value: 79,
    limit: 108,
    direction: "ceiling",
    min: 0,
    max: 120,
    trend: "improving",
  } as const;
  const standard =
    "CLI pending · improving\n[ 65%] ◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮................\nCurrent: 79\nStatus: Within limit\nLimit: ceiling 108\nHeadroom: 29 below ceiling\nDirection: Lower is better";
  const wide = `CLI pending · improving\n[ 65%] ${"◮⧩◭⧨".repeat(12)}${
    ".".repeat(25)
  }\nCurrent: 79\nStatus: Within limit\nLimit: ceiling 108\nHeadroom: 29 below ceiling\nDirection: Lower is better`;
  for (
    const [columns, expected] of [
      [
        24,
        "CLI pending · improving\n[ 65%] ◮⧩◭⧨◮⧩◭⧨◮⧩◭......\nCurrent: 79\nStatus: Within limit\nLimit: ceiling 108\nHeadroom: 29 below\n          ceiling\nDirection: Lower is\n           better",
      ],
      [52, standard],
      [80, wide],
    ] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderStandardMeterCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    (capabilities) => renderStandardMeterCli(props, capabilities),
    standard,
    "CLI pending - improving\n[ 65%] >v^<>v^<>v^<>v^<>v^<>v^<>v^<>................\nCurrent: 79\nStatus: Within limit\nLimit: ceiling 108\nHeadroom: 29 below ceiling\nDirection: Lower is better",
  );

  const capabilities = testCapabilities({ columns: 52 });
  assertExactFrame(
    renderStandardMeterCli(
      {
        label: "Coverage",
        value: 86,
        limit: 90,
        direction: "floor",
        min: 0,
        max: 100,
        trend: "drifting",
      },
      capabilities,
    ),
    "Coverage · drifting\n[ 86%] ◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩.......\nCurrent: 86\nStatus: Outside limit\nLimit: floor 90\nHeadroom: 4 below floor\nDirection: Higher is better",
    capabilities,
  );
});
