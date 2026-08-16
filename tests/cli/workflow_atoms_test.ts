import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  renderExpectedResultCli,
  renderFileChangeCli,
  renderOwnershipBadgeCli,
  renderPathReferenceCli,
  renderRawOutputCli,
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
        columns: 40,
        unicode,
      });
      assertStyledFrame(render(capabilities), expected, capabilities);
    }
    const capabilities = testTerminalCapabilities({ columns: 40, unicode });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
}

Deno.test("Path reference renders exact narrow, standard, wide, and capability frames", () => {
  const props = {
    path: "src/components/workflow/command/command.cli.ts",
  } as const;
  for (
    const [columns, expected] of [
      [16, "…/command.cli.ts"],
      [40, "src/components/workflow/…/command.cli.ts"],
      [80, "src/components/workflow/command/command.cli.ts"],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderPathReferenceCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    (capabilities) => renderPathReferenceCli(props, capabilities),
    "src/components/workflow/…/command.cli.ts",
    "src/components/workflo.../command.cli.ts",
  );
});

Deno.test("Ownership badge renders exact narrow, standard, wide, and capability frames", () => {
  const props = { ownership: "project-owned" } as const;
  for (
    const [columns, expected] of [
      [10, "[Project…]"],
      [16, "[Project-owned]"],
      [80, "[Project-owned]"],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderOwnershipBadgeCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    (capabilities) => renderOwnershipBadgeCli(props, capabilities),
    "[Project-owned]",
    "[Project-owned]",
  );
});

Deno.test("Expected result renders exact narrow, standard, wide, and capability frames", () => {
  const props = {
    value: "The generated renderer registry contains every decided component",
    variant: "state",
  } as const;
  for (
    const [columns, expected] of [
      [
        16,
        "→ You should see\n  The generated\n  renderer\n  registry\n  contains every\n  decided\n  component",
      ],
      [
        40,
        "→ You should see\n  The generated renderer registry\n  contains every decided component",
      ],
      [
        80,
        "→ You should see\n  The generated renderer registry contains every decided component",
      ],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderExpectedResultCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    (capabilities) => renderExpectedResultCli(props, capabilities),
    "→ You should see\n  The generated renderer registry\n  contains every decided component",
    "> You should see\n  The generated renderer registry\n  contains every decided component",
  );
});

Deno.test("Raw output renders exact narrow, standard, wide, and capability frames", () => {
  const props = {
    output: "error: unexpected token at generated registry",
  } as const;
  for (
    const [columns, expected] of [
      [
        16,
        "▾ Raw output\n  error:\n  unexpected\n  token at\n  generated\n  registry",
      ],
      [40, "▾ Raw output\n  error: unexpected token at generated\n  registry"],
      [80, "▾ Raw output\n  error: unexpected token at generated registry"],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderRawOutputCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    (capabilities) => renderRawOutputCli(props, capabilities),
    "▾ Raw output\n  error: unexpected token at generated\n  registry",
    "v Raw output\n  error: unexpected token at generated\n  registry",
  );
});

Deno.test("File change renders exact narrow, standard, wide, and capability frames", () => {
  const props = {
    path: "src/generated/cli-renderers.ts",
    disposition: "generated",
    magnitude: { added: 24, removed: 3 },
  } as const;
  for (
    const [columns, expected] of [
      [16, "◇ Generated cli…\n  +24 -3"],
      [40, "◇ Generated src…/cli-renderers.ts +24 -3"],
      [80, "◇ Generated src/generated/cli-renderers.ts +24 -3"],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderFileChangeCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    (capabilities) => renderFileChangeCli(props, capabilities),
    "◇ Generated src…/cli-renderers.ts +24 -3",
    "* Generated s.../cli-renderers.ts +24 -3",
  );
});
