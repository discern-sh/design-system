import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  renderAgentHandoffCli,
  renderArtifactCardCli,
  renderArtifactTreeCli,
  renderDecisionRecordCli,
  renderRuleCli,
  renderTaskMetadataCli,
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
  for (const unicode of [true, false]) {
    const expected = unicode ? expectedUnicode : expectedAscii;
    for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
      const capabilities = testTerminalCapabilities({
        colorDepth,
        columns: 52,
        unicode,
      });
      assertStyledFrame(render(capabilities), expected, capabilities);
    }
    const capabilities = testTerminalCapabilities({ columns: 52, unicode });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
}

Deno.test("Agent handoff renders exact narrow, standard, wide, and capability frames", () => {
  const props = {
    title: "Review CLI frames",
    prompt: "Inspect exact frames and report semantic drift",
    description: "A self-contained review prompt",
  } as const;
  const standard =
    "┌ Handoff: Review CLI frames ──────────────────────┐\n│ A self-contained review prompt                   │\n│                                                  │\n│ Prompt:                                          │\n│ Inspect exact frames and report semantic drift   │\n└──────────────────────────────────────────────────┘";
  for (
    const [columns, expected] of [
      [
        24,
        "┌ Handoff: Review C… ──┐\n│ A self-contained     │\n│ review prompt        │\n│                      │\n│ Prompt:              │\n│ Inspect exact frames │\n│ and report semantic  │\n│ drift                │\n└──────────────────────┘",
      ],
      [52, standard],
      [
        80,
        "┌ Handoff: Review CLI frames ──────────────────────────────────────────────────┐\n│ A self-contained review prompt                                               │\n│                                                                              │\n│ Prompt:                                                                      │\n│ Inspect exact frames and report semantic drift                               │\n└──────────────────────────────────────────────────────────────────────────────┘",
      ],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderAgentHandoffCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    (capabilities) => renderAgentHandoffCli(props, capabilities),
    standard,
    "+ Handoff: Review CLI frames ----------------------+\n| A self-contained review prompt                   |\n|                                                  |\n| Prompt:                                          |\n| Inspect exact frames and report semantic drift   |\n+--------------------------------------------------+",
  );
});

Deno.test("Artifact card renders exact narrow, standard, wide, and capability frames", () => {
  const props = {
    name: "CLI registry",
    path: "src/generated/cli-renderers.ts",
    summary: "Public aliases from component metadata",
    ownership: "generated",
    provenance: "deno task codegen",
    source: "Component metadata",
  } as const;
  const standard =
    "┌ Artifact: CLI registry ──────────────────────────┐\n│ Public aliases from component metadata           │\n│                                                  │\n│ Path: src/generated/cli-renderers.ts             │\n│ Ownership: Generated                             │\n│ Provenance: deno task codegen                    │\n│ Source: Component metadata                       │\n└──────────────────────────────────────────────────┘";
  for (
    const [columns, expected] of [
      [
        24,
        "┌ Artifact: CLI reg… ──┐\n│ Public aliases from  │\n│ component metadata   │\n│                      │\n│ Path: cli-renderers… │\n│ Ownership: Generated │\n│ Provenance: deno     │\n│ task codegen         │\n│ Source: Component    │\n│ metadata             │\n└──────────────────────┘",
      ],
      [52, standard],
      [
        80,
        "┌ Artifact: CLI registry ──────────────────────────────────────────────────────┐\n│ Public aliases from component metadata                                       │\n│                                                                              │\n│ Path: src/generated/cli-renderers.ts                                         │\n│ Ownership: Generated                                                         │\n│ Provenance: deno task codegen                                                │\n│ Source: Component metadata                                                   │\n└──────────────────────────────────────────────────────────────────────────────┘",
      ],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderArtifactCardCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    (capabilities) => renderArtifactCardCli(props, capabilities),
    standard,
    "+ Artifact: CLI registry --------------------------+\n| Public aliases from component metadata           |\n|                                                  |\n| Path: src/generated/cli-renderers.ts             |\n| Ownership: Generated                             |\n| Provenance: deno task codegen                    |\n| Source: Component metadata                       |\n+--------------------------------------------------+",
  );
});

Deno.test("Artifact tree renders exact narrow, standard, wide, and capability frames", () => {
  const props = {
    label: "Command component",
    nodes: [{
      name: "command",
      kind: "directory",
      children: [
        { name: "command.cli.ts", kind: "file", annotation: "terminal" },
        { name: "command.tsx", kind: "file", annotation: "web" },
        { name: "command.meta.ts", kind: "file" },
      ],
    }],
  } as const;
  const standard =
    "Command component\n└─▱ command\n  ├─⌑ command.cli.ts — terminal\n  ├─⌑ command.tsx — web\n  └─⌑ command.meta.ts";
  for (
    const [columns, expected] of [
      [
        24,
        "Command component\n└─▱ command\n  ├─⌑ command.cli.ts — …\n  ├─⌑ command.tsx — web\n  └─⌑ command.meta.ts",
      ],
      [52, standard],
      [80, standard],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderArtifactTreeCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    (capabilities) => renderArtifactTreeCli(props, capabilities),
    standard,
    "Command component\n`-[d] command\n   |-[f] command.cli.ts - terminal\n   |-[f] command.tsx - web\n   `-[f] command.meta.ts",
  );
});

Deno.test("Decision record renders exact narrow, standard, wide, and capability frames", () => {
  const props = {
    identifier: "ADR-0002",
    title: "Keep CLI renderers React-free",
    status: "accepted",
    date: "2026-08-03",
    context: "Terminal consumers do not install React",
    decision: "Accept plain state and capabilities",
    consequences: "The CLI graph stays framework-neutral",
  } as const;
  const standard =
    "ADR-0002 · Keep CLI renderers React-free\nStatus: Accepted\nDate: 2026-08-03\nContext: Terminal consumers do not install React\nDecision: Accept plain state and capabilities\nConsequences: The CLI graph stays framework-neutral";
  for (
    const [columns, expected] of [
      [
        24,
        "ADR-0002 · Keep CLI\n           renderers\n           React-free\nStatus: Accepted\nDate: 2026-08-03\nContext: Terminal\n         consumers do\n         not install\n         React\nDecision: Accept plain\n          state and\n          capabilities\nConsequences: The CLI\n              graph\n              stays\n              framework-\n              neutral",
      ],
      [52, standard],
      [80, standard],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderDecisionRecordCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    (capabilities) => renderDecisionRecordCli(props, capabilities),
    standard,
    "ADR-0002 - Keep CLI renderers React-free\nStatus: Accepted\nDate: 2026-08-03\nContext: Terminal consumers do not install React\nDecision: Accept plain state and capabilities\nConsequences: The CLI graph stays framework-neutral",
  );
});

Deno.test("Rule renders exact narrow, standard, wide, and capability frames", () => {
  const props = {
    rule: "Never hand-edit generated surfaces",
    origin: "AGENTS.md",
    scope: "src/generated and styleguide/generated",
  } as const;
  const standard =
    "RULE\n  Never hand-edit generated surfaces\nOrigin: AGENTS.md\nScope: src/generated and styleguide/generated";
  for (
    const [columns, expected] of [
      [
        24,
        "RULE\n  Never hand-edit\n  generated surfaces\nOrigin: AGENTS.md\nScope: src/generated and\n       styleguide/genera\n       ted",
      ],
      [52, standard],
      [80, standard],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderRuleCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    (capabilities) => renderRuleCli(props, capabilities),
    standard,
    standard,
  );
});

Deno.test("Task metadata renders exact narrow, standard, wide, and capability frames", () => {
  const props = {
    outcome: "Workflow CLI parity",
    audience: "Design-system maintainers",
    prerequisites: "Wave 1 foundation",
    complexity: "Multi-component",
    fileEffects: "changes-files",
    retrySafety: "check-first",
    expectedState: "All owned CLI stances are decided",
  } as const;
  const standard =
    "Task overview\nOutcome: Workflow CLI parity\nFor: Design-system maintainers\nPrerequisites: Wave 1 foundation\nComplexity: Multi-component\nFile effects: Changes files\nRetry safety: Check current state before retrying\nEnd state: All owned CLI stances are decided";
  for (
    const [columns, expected] of [
      [
        24,
        "Task overview\nOutcome: Workflow CLI\n         parity\nFor: Design-system\n     maintainers\nPrerequisites:\n  Wave 1 foundation\nComplexity: Multi-compon\n            ent\nFile effects: Changes\n              files\nRetry safety: Check\n              current\n              state\n              before\n              retrying\nEnd state: All owned CLI\n           stances are\n           decided",
      ],
      [52, standard],
      [80, standard],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderTaskMetadataCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    (capabilities) => renderTaskMetadataCli(props, capabilities),
    standard,
    standard,
  );
});
