import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  renderCommandCli,
  renderCommandGroupCli,
  renderDestructiveActionNoticeCli,
  renderDiagnosticCli,
  renderRetryNoticeCli,
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
        columns: 48,
        unicode,
      });
      assertStyledFrame(render(capabilities), expected, capabilities);
    }
    const capabilities = testCapabilities({ columns: 48, unicode });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
}

Deno.test("Command renders exact narrow, standard, wide, and capability frames", () => {
  const props = {
    command: "deno task verify",
    workingDirectory: "/workspace/design-system",
    expectedResult: "All configured checks pass",
    failureNote: "Fix the first diagnostic",
  } as const;
  for (
    const [columns, expected] of [
      [
        20,
        "Run in: design-syst…\nRun: deno task\n     verify\n✓ Expect: All\n          configured\n          checks\n          pass\n! If this fails:\n  Fix the first\n  diagnostic",
      ],
      [
        48,
        "Run in: /workspace/design-system\nRun: deno task verify\n✓ Expect: All configured checks pass\n! If this fails: Fix the first diagnostic",
      ],
      [
        80,
        "Run in: /workspace/design-system\nRun: deno task verify\n✓ Expect: All configured checks pass\n! If this fails: Fix the first diagnostic",
      ],
    ] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderCommandCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  const expected =
    "Run in: /workspace/design-system\nRun: deno task verify\n✓ Expect: All configured checks pass\n! If this fails: Fix the first diagnostic";
  assertCapabilityLevels(
    (capabilities) => renderCommandCli(props, capabilities),
    expected,
    expected.replace("✓", "+"),
  );
});

Deno.test("Command suggestions use explicit action grammar and never begin like shell history", () => {
  const command = "deno task verify --filter terminal";
  for (const unicode of [true, false]) {
    for (
      const colorDepth of [
        "truecolor",
        "ansi256",
        "ansi16",
        "none",
      ] as const
    ) {
      const capabilities = testCapabilities({
        columns: 52,
        colorDepth,
        unicode,
      });
      const rendered = stripAnsi(renderCommandCli({ command }, capabilities));
      assert(!/^\s*\$\s/u.test(rendered));
      assertEquals(rendered, `Run: ${command}`);
    }
  }
  const narrow = stripAnsi(renderCommandCli(
    { command },
    testCapabilities({
      columns: 20,
    }),
  ));
  assertEquals(
    narrow,
    "Run: deno task\n     verify --filter\n     terminal",
  );
  assertStringIncludes(narrow, "\n     verify");
});

Deno.test("Command group renders exact narrow, standard, wide, and capability frames", () => {
  const props = {
    title: "Release commands",
    items: [
      { label: "Dry run", command: "deno publish --dry-run" },
      {
        label: "Publish",
        command: "deno publish",
        expectedResult: "Version is available",
      },
    ],
  } as const;
  const standard =
    "Release commands\n\n1. Dry run\n   Run: deno publish --dry-run\n\n2. Publish\n   Run: deno publish\n   ✓ Expect: Version is available";
  for (
    const [columns, expected] of [
      [
        20,
        "Release commands\n\n1. Dry run\n   Run: deno publish\n        --dry-run\n\n2. Publish\n   Run: deno publish\n   ✓ Expect:\n     Version is\n     available",
      ],
      [48, standard],
      [80, standard],
    ] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderCommandGroupCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    (capabilities) => renderCommandGroupCli(props, capabilities),
    standard,
    standard.replace("✓", "+"),
  );
});

Deno.test("Diagnostic renders exact narrow, standard, wide, and capability frames", () => {
  const props = {
    title: "Type check failed",
    impact: "The public CLI export cannot be consumed",
    correction: "Export the missing renderer type",
    path: "src/generated/cli-renderers.ts",
    line: 12,
    column: 4,
    reproductionCommand: "deno task typecheck",
  } as const;
  const standard =
    "FAILURE: Type check failed\nWhy: The public CLI export cannot be consumed\nAt: src/generated/cli-renderers.ts:12:4\nReproduce: $ deno task typecheck\nFix: Export the missing renderer type";
  for (
    const [columns, expected] of [
      [
        20,
        "FAILURE: Type check\n         failed\nWhy: The public CLI\n     export cannot\n     be consumed\nAt: cli-render…:12:4\nReproduce:\n  $ deno task\n  typecheck\nFix: Export the\n     missing\n     renderer type",
      ],
      [48, standard],
      [80, standard],
    ] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderDiagnosticCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    (capabilities) => renderDiagnosticCli(props, capabilities),
    standard,
    standard,
  );
});

Deno.test("Destructive action notice renders exact narrow, standard, wide, and capability frames", () => {
  const props = {
    label: "Delete the active worktree",
    scope: "agent/cli-2b",
    impact: "Uncommitted changes are lost",
    authority: "Repository owner",
    recovery: "No automatic recovery",
    tone: "danger",
  } as const;
  const standard =
    "DANGER: Delete the active worktree\nScope: agent/cli-2b\nImpact: Uncommitted changes are lost\nAuthority: Repository owner\nRecovery: No automatic recovery";
  for (
    const [columns, expected] of [
      [
        20,
        "DANGER: Delete the\n        active\n        worktree\nScope: agent/cli-2b\nImpact: Uncommitted\n        changes are\n        lost\nAuthority:\n  Repository owner\nRecovery: No\n          automatic\n          recovery",
      ],
      [48, standard],
      [80, standard],
    ] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderDestructiveActionNoticeCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    (capabilities) => renderDestructiveActionNoticeCli(props, capabilities),
    standard,
    standard,
  );
});

Deno.test("Retry notice renders exact narrow, standard, wide, and capability frames", () => {
  const props = {
    safeToRetry: false,
    reason: "The remote publication may already have completed",
    label: "Check JSR first",
  } as const;
  const standard =
    "! Do not retry — Check JSR first\n  The remote publication may already have\n  completed";
  for (
    const [columns, expected] of [
      [
        20,
        "! Do not retry —\n  Check JSR first\n  The remote\n  publication may\n  already have\n  completed",
      ],
      [48, standard],
      [
        80,
        "! Do not retry — Check JSR first\n  The remote publication may already have completed",
      ],
    ] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderRetryNoticeCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    (capabilities) => renderRetryNoticeCli(props, capabilities),
    standard,
    "! Do not retry - Check JSR first\n  The remote publication may already have\n  completed",
  );
});
