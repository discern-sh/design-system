import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import { measureText } from "../../src/cli/text.ts";
import {
  renderFleetCli,
  renderReceiptCli,
  renderTranscriptCli,
  renderWorklogCli,
} from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";
import { TEST_TERMINAL_MOTIF } from "./motif_fixture.ts";

function assertCapabilityLevels(
  columns: number,
  render: (capabilities: TerminalCapabilities) => string,
  expectedUnicode: string,
  expectedAscii: string,
): void {
  for (const unicode of [true, false]) {
    const expected = unicode ? expectedUnicode : expectedAscii;
    for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
      const capabilities = testTerminalCapabilities({
        colorDepth,
        columns,
        unicode,
      });
      assertStyledFrame(render(capabilities), expected, capabilities);
    }
    const capabilities = testTerminalCapabilities({ columns, unicode });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
}

function assertLosslessIdentity(
  frame: string,
  label: "Persona" | "Branch",
  expected: string,
): void {
  const marker = `${label}: `;
  const line = stripAnsi(frame).split("\n").find((candidate) =>
    candidate.includes(marker)
  );
  assert(line !== undefined, `${label} continuation is missing`);
  const markerAt = line.indexOf(marker);
  assertEquals(line.slice(markerAt + marker.length), expected);
}

function assertOnlyIdentitiesExceed(
  frame: string,
  width: number,
): void {
  for (const line of stripAnsi(frame).split("\n")) {
    if (/^\s*(?:Persona|Branch): /u.test(line)) continue;
    assert(
      measureText(line) <= width,
      `${JSON.stringify(line)} exceeds the Fleet width ${width}`,
    );
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
    "Fleet\nAGENT            BRANCH              STATE         DRIFT\nCLI 2B           agent/cli-2b        working       ↑5 ↓0\n                                     ──◮─────\n  Workflow + Agents\nCLI 2A           agent/cli-2a        waiting       ↓1";
  for (
    const [columns, expected] of [
      [
        32,
        "Fleet\nCLI 2B · working\nBranch: agent/cli-2b\nDrift: ↑5 ↓0\nMeta: Workflow + Agents\n  ──◮─────────\n\nCLI 2A · waiting\nBranch: agent/cli-2a\nDrift: ↓1",
      ],
      [60, standard],
      [
        80,
        "Fleet\nAGENT               BRANCH                               STATE         DRIFT\nCLI 2B              agent/cli-2b                         working       ↑5 ↓0\n                                                         ──◮─────\n  Workflow + Agents\nCLI 2A              agent/cli-2a                         waiting       ↓1",
      ],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
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
    "Fleet\nAGENT            BRANCH              STATE         DRIFT\nCLI 2B           agent/cli-2b        working       +5 -0\n                                     -->-----\n  Workflow + Agents\nCLI 2A           agent/cli-2a        waiting       -1",
  );
});

Deno.test("Fleet keeps compact identity rendering as the backward-compatible default", () => {
  const capabilities = testTerminalCapabilities({ columns: 60 });
  const rows = [{
    persona: "Audit",
    branch: "agent/audit",
    status: "working",
    ahead: 1,
    beaconPhase: 1,
  }] as const;
  const implicit = renderFleetCli({ rows }, capabilities);
  assertEquals(
    renderFleetCli({ rows, identityMode: "compact" }, capabilities),
    implicit,
  );
  assertEquals(
    renderFleetCli({ rows, identityMode: "lossless" }, capabilities),
    implicit,
  );
  assertThrows(
    () =>
      renderFleetCli({ rows, identityMode: "expanded" as never }, capabilities),
    TypeError,
    "compact or lossless",
  );
});

Deno.test("Fleet lossless mode preserves long ASCII identities at narrow and wide widths", () => {
  const persona = "Terminal contract coordination agent";
  const branch = "agent/terminal-contract-coordination-with-complete-identity";
  const row = {
    persona,
    branch,
    status: "working",
    ahead: 5,
    behind: 2,
    meta: "Compatibility evidence",
    beaconPhase: 2,
  } as const;

  const narrow = renderFleetCli(
    { rows: [row], identityMode: "lossless", maxWidth: 32 },
    testTerminalCapabilities({ columns: 32 }),
  );
  assertEquals(
    narrow,
    "Fleet\nTerminal contract coordination\nagent · working\nPersona: Terminal contract coordination agent\nBranch: agent/terminal-contract-coordination-with-complete-identity\nDrift: ↑5 ↓2\nMeta: Compatibility evidence\n  ──◮─────────",
  );
  assertLosslessIdentity(narrow, "Persona", persona);
  assertLosslessIdentity(narrow, "Branch", branch);
  assertOnlyIdentitiesExceed(narrow, 32);

  const wide = renderFleetCli(
    { rows: [row], identityMode: "lossless", maxWidth: 60 },
    testTerminalCapabilities({ columns: 80 }),
  );
  assertEquals(
    wide,
    "Fleet\nAGENT            BRANCH              STATE         DRIFT\nTerminal contr…  agent/terminal-co…  working       ↑5 ↓2\n  Persona: Terminal contract coordination agent\n  Branch: agent/terminal-contract-coordination-with-complete-identity\n                                     ──◮─────\n  Compatibility evidence",
  );
  assertLosslessIdentity(wide, "Persona", persona);
  assertLosslessIdentity(wide, "Branch", branch);
  assertOnlyIdentitiesExceed(wide, 60);
  assertStringIncludes(wide, "working       ↑5 ↓2");
  assertStringIncludes(wide, "──◮─────");
  assertStringIncludes(wide, "Compatibility evidence");
});

Deno.test("Fleet lossless identities survive Unicode, ASCII, colour, and no-colour modes", () => {
  const unicodePersona = "界面監査チームの完全な識別子 🧭";
  const unicodeBranch = "agent/監査-完全-識別子-枝-長期運用";
  const unicode = renderFleetCli({
    identityMode: "lossless",
    maxWidth: 60,
    rows: [{
      persona: unicodePersona,
      branch: unicodeBranch,
      status: "waiting",
      ahead: 1,
      behind: 3,
      meta: "Unicode identity evidence",
    }],
  }, testTerminalCapabilities({ columns: 80 }));
  assertEquals(
    unicode,
    "Fleet\nAGENT            BRANCH              STATE         DRIFT\n界面監査チーム…  agent/監査-完全-…   waiting       ↑1 ↓3\n  Persona: 界面監査チームの完全な識別子 🧭\n  Branch: agent/監査-完全-識別子-枝-長期運用\n  Unicode identity evidence",
  );
  assertLosslessIdentity(unicode, "Persona", unicodePersona);
  assertLosslessIdentity(unicode, "Branch", unicodeBranch);
  assert(!unicode.includes(String.fromCharCode(27)));

  const asciiPersona = "Terminal contract coordination agent";
  const asciiBranch =
    "agent/terminal-contract-coordination-with-complete-identity";
  const asciiRow = {
    persona: asciiPersona,
    branch: asciiBranch,
    status: "working",
    ahead: 5,
    behind: 2,
    meta: "Compatibility evidence",
    beaconPhase: 2,
  } as const;
  const ascii = renderFleetCli(
    { rows: [asciiRow], identityMode: "lossless", maxWidth: 60 },
    testTerminalCapabilities({ columns: 80, unicode: false }),
  );
  assertEquals(
    ascii,
    "Fleet\nAGENT            BRANCH              STATE         DRIFT\nTerminal contr…  agent/terminal-co…  working       +5 -2\n  Persona: Terminal contract coordination agent\n  Branch: agent/terminal-contract-coordination-with-complete-identity\n                                     -->-----\n  Compatibility evidence",
  );
  assertLosslessIdentity(ascii, "Persona", asciiPersona);
  assertLosslessIdentity(ascii, "Branch", asciiBranch);

  const coloured = renderFleetCli(
    { rows: [asciiRow], identityMode: "lossless", maxWidth: 60 },
    testTerminalCapabilities({
      colorDepth: "truecolor",
      columns: 80,
    }),
  );
  assert(coloured.includes(String.fromCharCode(27)));
  assertLosslessIdentity(coloured, "Persona", asciiPersona);
  assertLosslessIdentity(coloured, "Branch", asciiBranch);
  assertEquals(
    stripAnsi(coloured),
    stripAnsi(renderFleetCli(
      { rows: [asciiRow], identityMode: "lossless", maxWidth: 60 },
      testTerminalCapabilities({ columns: 80 }),
    )),
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
    "┌ [✓] Gate proof ──────────────────────────────────┐\n│ Branch: agent/cli-2b                             │\n│ Commit: abc1234                                  │\n│                                                  │\n│ Typecheck ............................... ✓ pass │\n│ Tests ............................... 310 ✓ pass │\n│ Publish ................................. – skip │\n│                                                  │\n│ All required checks passed                       │\n└──────────────────────────────────────────────────┘";
  for (
    const [columns, expected] of [
      [
        24,
        "┌ [✓] Gate proof ──────┐\n│ Branch: agent/cli-2b │\n│ Commit: abc1234      │\n│                      │\n│ Typecheck ... ✓ pass │\n│ Tests ... 310 ✓ pass │\n│ Publish ..... – skip │\n│                      │\n│ All required checks  │\n│ passed               │\n└──────────────────────┘",
      ],
      [52, standard],
      [
        80,
        "┌ [✓] Gate proof ──────────────────────────────────────────────────────────────┐\n│ Branch: agent/cli-2b                                                         │\n│ Commit: abc1234                                                              │\n│                                                                              │\n│ Typecheck ........................................................... ✓ pass │\n│ Tests ........................................................... 310 ✓ pass │\n│ Publish ............................................................. – skip │\n│                                                                              │\n│ All required checks passed                                                   │\n└──────────────────────────────────────────────────────────────────────────────┘",
      ],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
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
    "+ [+] Gate proof ----------------------------------+\n| Branch: agent/cli-2b                             |\n| Commit: abc1234                                  |\n|                                                  |\n| Typecheck ............................... + pass |\n| Tests ............................... 310 + pass |\n| Publish ................................. - skip |\n|                                                  |\n| All required checks passed                       |\n+--------------------------------------------------+",
  );
});

Deno.test("Receipt titles carry boxed pass and fail outcomes without a redundant body stamp", () => {
  const unicode = testTerminalCapabilities({ columns: 32 });
  const ascii = testTerminalCapabilities({ columns: 32, unicode: false });
  const pass = renderReceiptCli(
    { title: "Gate proof", stamp: "pass" },
    unicode,
  );
  const fail = renderReceiptCli(
    { title: "Gate proof", stamp: "fail" },
    unicode,
  );
  assertStringIncludes(pass, "┌ [✓] Gate proof ");
  assertStringIncludes(fail, "┌ [✕] Gate proof ");
  assertEquals(pass.includes("[PASS]"), false);
  assertEquals(fail.includes("[FAIL]"), false);
  assertStringIncludes(
    renderReceiptCli({ title: "Gate proof", stamp: "fail" }, ascii),
    "+ [x] Gate proof ",
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
    const capabilities = testTerminalCapabilities({ columns });
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
    "✓ Generate registry [done]\nMeta: 120ms\n──◮───── Run exact-frame tests [active]\n  Testing every capability level\n· Accept branch [queued]\n✕ Publish [failed]\n– Notify [skipped]";
  for (
    const [columns, expected] of [
      [
        24,
        "✓ Generate registry\n  [done]\nMeta: 120ms\n──◮───── Run exact-frame\n         tests [active]\n  Testing every\n  capability level\n· Accept branch [queued]\n✕ Publish [failed]\n– Notify [skipped]",
      ],
      [52, standard],
      [80, standard],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
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
    "+ Generate registry [done]\nMeta: 120ms\n-->----- Run exact-frame tests [active]\n  Testing every capability level\n. Accept branch [queued]\nx Publish [failed]\n- Notify [skipped]",
  );
});

Deno.test("Fleet and Worklog render representative beacon phases at every capability level", () => {
  for (
    const [phase, unicodeBeacon, asciiBeacon] of [
      [0, "◮───────", ">-------"],
      [2, "──◮─────", "-->-----"],
      [4, "────◮───", "---->---"],
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

Deno.test("Fleet and Worklog inherit a consumer activity motif", () => {
  const capabilities = testTerminalCapabilities({ columns: 60 });
  assertStringIncludes(
    renderFleetCli({
      rows: [{ persona: "Agent", status: "working", beaconPhase: 0 }],
      motif: TEST_TERMINAL_MOTIF,
    }, capabilities),
    "◉───────",
  );
  assertEquals(
    renderWorklogCli({
      entries: [{ label: "Active", status: "active", phase: 0 }],
      motif: TEST_TERMINAL_MOTIF,
    }, capabilities),
    "◉─────── Active [active]",
  );
});
