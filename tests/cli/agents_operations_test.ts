import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  renderFleetCli,
  renderReceiptCli,
  renderTranscriptCli,
  renderWorklogCli,
} from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testCapabilities,
} from "./helpers.ts";

function assertCapabilityLevels(
  columns: number,
  render: (capabilities: TerminalCapabilities) => string,
  expectedUnicode: string,
  expectedAscii: string,
): void {
  for (const unicode of [true, false]) {
    const expected = unicode ? expectedUnicode : expectedAscii;
    for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
      const capabilities = testCapabilities({ colorDepth, columns, unicode });
      assertStyledFrame(render(capabilities), expected, capabilities);
    }
    const capabilities = testCapabilities({ columns, unicode });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
}

Deno.test("Fleet renders exact narrow, standard, wide, and capability frames", () => {
  const props = {
    rows: [
      {
        persona: "CLI 2B",
        branch: "agent/cli-2b",
        status: "working",
        ahead: 5,
        behind: 0,
        meta: "Workflow + Agents",
        beaconPhase: 2,
      },
      {
        persona: "CLI 2A",
        branch: "agent/cli-2a",
        status: "waiting",
        behind: 1,
      },
    ],
  } as const;
  const standard =
    "Fleet\nAGENT            BRANCH              STATE         DRIFT\nCLI 2B           agent/cli-2b        working       ↑5 ↓0\n                                     ..◭⧨◮⧩..\n  Workflow + Agents\nCLI 2A           agent/cli-2a        waiting       ↓1";
  for (
    const [columns, expected] of [
      [
        32,
        "Fleet\nCLI 2B · working\nBranch: agent/cli-2b\nDrift: ↑5 ↓0\nMeta: Workflow + Agents\n  ..◭⧨◮⧩......\n\nCLI 2A · waiting\nBranch: agent/cli-2a\nDrift: ↓1",
      ],
      [60, standard],
      [
        80,
        "Fleet\nAGENT               BRANCH                               STATE         DRIFT\nCLI 2B              agent/cli-2b                         working       ↑5 ↓0\n                                                         ..◭⧨◮⧩..\n  Workflow + Agents\nCLI 2A              agent/cli-2a                         waiting       ↓1",
      ],
    ] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderFleetCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    60,
    (capabilities) => renderFleetCli(props, capabilities),
    standard,
    "Fleet\nAGENT            BRANCH              STATE         DRIFT\nCLI 2B           agent/cli-2b        working       +5 -0\n                                     ..^<>v..\n  Workflow + Agents\nCLI 2A           agent/cli-2a        waiting       -1",
  );
});

Deno.test("Receipt renders exact narrow, standard, wide, and capability frames", () => {
  const props = {
    title: "Gate proof",
    stamp: "pass",
    meta: [
      { label: "Branch", value: "agent/cli-2b" },
      { label: "Commit", value: "abc1234" },
    ],
    checks: [
      { label: "Typecheck", state: "pass" },
      { label: "Tests", state: "pass", value: "310" },
      { label: "Publish", state: "skip" },
    ],
    summary: "All required checks passed",
  } as const;
  const standard =
    "┌ Receipt: Gate proof ─────────────────────────────┐\n│ [PASS]                                           │\n│ Branch: agent/cli-2b                             │\n│ Commit: abc1234                                  │\n│                                                  │\n│ Typecheck ............................... ✓ pass │\n│ Tests ............................... 310 ✓ pass │\n│ Publish ................................. – skip │\n│                                                  │\n│ All required checks passed                       │\n└──────────────────────────────────────────────────┘";
  for (
    const [columns, expected] of [
      [
        24,
        "┌ Receipt: Gate pro… ──┐\n│ [PASS]               │\n│ Branch: agent/cli-2b │\n│ Commit: abc1234      │\n│                      │\n│ Typecheck ... ✓ pass │\n│ Tests ... 310 ✓ pass │\n│ Publish ..... – skip │\n│                      │\n│ All required checks  │\n│ passed               │\n└──────────────────────┘",
      ],
      [52, standard],
      [
        80,
        "┌ Receipt: Gate proof ─────────────────────────────────────────────────────────┐\n│ [PASS]                                                                       │\n│ Branch: agent/cli-2b                                                         │\n│ Commit: abc1234                                                              │\n│                                                                              │\n│ Typecheck ........................................................... ✓ pass │\n│ Tests ........................................................... 310 ✓ pass │\n│ Publish ............................................................. – skip │\n│                                                                              │\n│ All required checks passed                                                   │\n└──────────────────────────────────────────────────────────────────────────────┘",
      ],
    ] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderReceiptCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    52,
    (capabilities) => renderReceiptCli(props, capabilities),
    standard,
    "+ Receipt: Gate proof -----------------------------+\n| [PASS]                                           |\n| Branch: agent/cli-2b                             |\n| Commit: abc1234                                  |\n|                                                  |\n| Typecheck ............................... + pass |\n| Tests ............................... 310 + pass |\n| Publish ................................. - skip |\n|                                                  |\n| All required checks passed                       |\n+--------------------------------------------------+",
  );
});

Deno.test("Transcript renders exact narrow, standard, wide, and capability frames", () => {
  const props = {
    turns: [
      { speaker: "Maintainer", body: "Run the complete gate" },
      {
        speaker: "Agent",
        aside: "after verification",
        body: "The gate passed and the proof is recorded",
      },
    ],
  } as const;
  const standard =
    "Maintainer\n  Run the complete gate\n\nAgent · after verification\n  The gate passed and the proof is recorded";
  for (
    const [columns, expected] of [
      [
        20,
        "Maintainer\n  Run the complete\n  gate\n\nAgent · after\nverification\n  The gate passed\n  and the proof is\n  recorded",
      ],
      [52, standard],
      [80, standard],
    ] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderTranscriptCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    52,
    (capabilities) => renderTranscriptCli(props, capabilities),
    standard,
    "Maintainer\n  Run the complete gate\n\nAgent - after verification\n  The gate passed and the proof is recorded",
  );
});

Deno.test("Worklog renders exact widths, capability levels, and every status", () => {
  const props = {
    entries: [
      { label: "Generate registry", status: "done", meta: "120ms" },
      {
        label: "Run exact-frame tests",
        status: "active",
        detail: "Testing every capability level",
        phase: 2,
      },
      { label: "Accept branch", status: "queued" },
      { label: "Publish", status: "failed" },
      { label: "Notify", status: "skipped" },
    ],
  } as const;
  const standard =
    "✓ Generate registry [done]\nMeta: 120ms\n..◭⧨◮⧩.. Run exact-frame tests [active]\n  Testing every capability level\n· Accept branch [queued]\n✕ Publish [failed]\n– Notify [skipped]";
  for (
    const [columns, expected] of [
      [
        24,
        "✓ Generate registry\n  [done]\nMeta: 120ms\n..◭⧨◮⧩.. Run exact-frame\n         tests [active]\n  Testing every\n  capability level\n· Accept branch [queued]\n✕ Publish [failed]\n– Notify [skipped]",
      ],
      [52, standard],
      [80, standard],
    ] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderWorklogCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    52,
    (capabilities) => renderWorklogCli(props, capabilities),
    standard,
    "+ Generate registry [done]\nMeta: 120ms\n..^<>v.. Run exact-frame tests [active]\n  Testing every capability level\n. Accept branch [queued]\nx Publish [failed]\n- Notify [skipped]",
  );
});

Deno.test("Fleet and Worklog render representative beacon phases at every capability level", () => {
  for (
    const [phase, unicodeBeacon, asciiBeacon] of [
      [0, "◮⧩◭⧨....", ">v^<...."],
      [2, "..◭⧨◮⧩..", "..^<>v.."],
      [4, "....◮⧩◭⧨", "....>v^<"],
    ] as const
  ) {
    assertCapabilityLevels(
      60,
      (capabilities) =>
        renderFleetCli(
          {
            rows: [{ persona: "Agent", status: "working", beaconPhase: phase }],
          },
          capabilities,
        ),
      `Fleet\nAGENT            BRANCH              STATE         DRIFT\nAgent            —                   working       —\n                                     ${unicodeBeacon}`,
      `Fleet\nAGENT            BRANCH              STATE         DRIFT\nAgent            -                   working       -\n                                     ${asciiBeacon}`,
    );
    assertCapabilityLevels(
      60,
      (capabilities) =>
        renderWorklogCli(
          { entries: [{ label: "Active", status: "active", phase }] },
          capabilities,
        ),
      `${unicodeBeacon} Active [active]`,
      `${asciiBeacon} Active [active]`,
    );
  }
});
