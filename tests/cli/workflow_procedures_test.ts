import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  renderBranchChoiceCli,
  renderPrerequisiteListCli,
  renderProcedureCli,
  renderProcedureStepCli,
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

Deno.test("Branch choice renders exact narrow, standard, wide, and capability frames", () => {
  const props = {
    title: "Choose next",
    choices: [
      { label: "Gate passes", path: "Accept the worktree" },
      { label: "Gate fails", path: "Fix diagnostics" },
    ],
  } as const;
  const standard =
    "Choose next\n1. Gate passes → Accept the worktree\n2. Gate fails → Fix diagnostics";
  for (
    const [columns, expected] of [
      [
        24,
        "Choose next\n1. Gate passes → Accept\n   the worktree\n2. Gate fails → Fix\n   diagnostics",
      ],
      [52, standard],
      [80, standard],
    ] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderBranchChoiceCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    (capabilities) => renderBranchChoiceCli(props, capabilities),
    standard,
    "Choose next\n1. Gate passes -> Accept the worktree\n2. Gate fails -> Fix diagnostics",
  );
});

Deno.test("Prerequisite list renders exact narrow, standard, wide, and capability frames", () => {
  const props = {
    items: [
      { requirement: "Deno 2", state: "satisfied" },
      { requirement: "Clean worktree", state: "required" },
      {
        requirement: "Landing grant",
        state: "unresolved",
        detail: "Wait for owner authority",
      },
    ],
  } as const;
  const standard =
    "Before you start\n✓ Deno 2 [Satisfied]\n• Clean worktree [Required]\n! Landing grant [Unresolved]\n  Wait for owner authority";
  for (
    const [columns, expected] of [
      [
        24,
        "Before you start\n✓ Deno 2 [Satisfied]\n• Clean worktree\n  [Required]\n! Landing grant\n  [Unresolved]\n  Wait for owner\n  authority",
      ],
      [52, standard],
      [80, standard],
    ] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderPrerequisiteListCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    (capabilities) => renderPrerequisiteListCli(props, capabilities),
    standard,
    "Before you start\n+ Deno 2 [Satisfied]\n* Clean worktree [Required]\n! Landing grant [Unresolved]\n  Wait for owner authority",
  );
});

Deno.test("Procedure renders exact narrow, standard, wide, and every semantic step state", () => {
  const props = {
    title: "Ship the wave",
    description: "Complete every owned CLI renderer",
    prerequisites: [{ requirement: "Wave 1", state: "satisfied" }],
    steps: [
      { title: "Implemented", status: "complete" },
      { title: "Run gate", status: "active", phase: 2 },
      { title: "Land", status: "pending" },
      { title: "Rejected", status: "error" },
      { title: "Stopped", status: "cancelled" },
    ],
    completion: "The branch is on main",
  } as const;
  const standard =
    "Ship the wave\n  Complete every owned CLI renderer\n\nBefore you start\n✓ Wave 1 [Satisfied]\n\n◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩ Steps ⧩◮⧨◭⧩◮⧨◭⧩◮⧨◭⧩◮⧨◭⧩◮⧨◭⧩◮⧨\n ◭  Implemented\n │\n[⧨] Run gate\n │\n ·  Land\n │\n !  Rejected\n │\n ×  Stopped\n\nDone when: The branch is on main";
  for (
    const [columns, expected] of [
      [
        24,
        "Ship the wave\n  Complete every owned\n  CLI renderer\n\nBefore you start\n✓ Wave 1 [Satisfied]\n\n◮⧩◭⧨◮⧩◭⧨ Steps ⧨◭⧩◮⧨◭⧩◮⧨\n ◭  Implemented\n │\n[⧨] Run gate\n │\n ·  Land\n │\n !  Rejected\n │\n ×  Stopped\n\nDone when: The branch is\n           on main",
      ],
      [52, standard],
      [
        80,
        "Ship the wave\n  Complete every owned CLI renderer\n\nBefore you start\n✓ Wave 1 [Satisfied]\n\n◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨ Steps ⧨◭⧩◮⧨◭⧩◮⧨◭⧩◮⧨◭⧩◮⧨◭⧩◮⧨◭⧩◮⧨◭⧩◮⧨◭⧩◮⧨◭⧩◮⧨\n ◭  Implemented\n │\n[⧨] Run gate\n │\n ·  Land\n │\n !  Rejected\n │\n ×  Stopped\n\nDone when: The branch is on main",
      ],
    ] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderProcedureCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    (capabilities) => renderProcedureCli(props, capabilities),
    standard,
    "Ship the wave\n  Complete every owned CLI renderer\n\nBefore you start\n+ Wave 1 [Satisfied]\n\n>v^<>v^<>v^<>v^<>v^<>v Steps v><^v><^v><^v><^v><^v><\n ^  Implemented\n |\n[<] Run gate\n |\n .  Land\n |\n !  Rejected\n |\n x  Stopped\n\nDone when: The branch is on main",
  );
});

Deno.test("Procedure step renders exact widths, capability levels, statuses, and active phases", () => {
  const props = {
    title: "Run the gate",
    status: "active",
    phase: 2,
    action: "Verify the committed tree",
    command: { command: "discern done" },
    expectedResult: { value: "The full gate passes" },
    completionCriterion: "A proof is recorded",
  } as const;
  const standard =
    "[⧨] Run the gate\n  Verify the committed tree\n  Run: discern done\n  ✓ You should see\n    The full gate passes\nComplete when: A proof is recorded";
  for (
    const [columns, expected] of [
      [
        24,
        "[⧨] Run the gate\n  Verify the committed\n  tree\n  Run: discern done\n  ✓ You should see\n    The full gate passes\nComplete when:\n  A proof is recorded",
      ],
      [52, standard],
      [80, standard],
    ] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderProcedureStepCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    (capabilities) => renderProcedureStepCli(props, capabilities),
    standard,
    "[<] Run the gate\n  Verify the committed tree\n  Run: discern done\n  + You should see\n    The full gate passes\nComplete when: A proof is recorded",
  );

  const capabilities = testCapabilities({ columns: 52 });
  const states = [
    ["pending", " ·  Run gate\n  Verify tree"],
    ["active", "[⧨] Run gate\n  Verify tree"],
    ["complete", " ◭  Run gate\n  Verify tree"],
    ["error", " !  Run gate\n  Verify tree"],
    ["cancelled", " ×  Run gate\n  Verify tree"],
  ] as const;
  for (const [status, expected] of states) {
    assertExactFrame(
      renderProcedureStepCli(
        { title: "Run gate", status, phase: 2, action: "Verify tree" },
        capabilities,
      ),
      expected,
      capabilities,
    );
  }

  for (
    const [phase, unicodeMarker, asciiMarker] of [
      [0, "[◮]", "[>]"],
      [2, "[⧨]", "[<]"],
    ] as const
  ) {
    assertCapabilityLevels(
      (frameCapabilities) =>
        renderProcedureStepCli(
          {
            title: "Active",
            status: "active",
            phase,
            action: "Working",
          },
          frameCapabilities,
        ),
      `${unicodeMarker} Active\n  Working`,
      `${asciiMarker} Active\n  Working`,
    );
  }
});
