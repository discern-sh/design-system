import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  renderAgentAvatarCli,
  renderAgentMentionCli,
  renderAgentPersonaCli,
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
        columns: 32,
        unicode,
      });
      assertStyledFrame(render(capabilities), expected, capabilities);
    }
    const capabilities = testTerminalCapabilities({ columns: 32, unicode });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
}

Deno.test("Agent avatar renders exact widths, capability levels, sizes, and statuses", () => {
  const props = { name: "Release agent", status: "working" } as const;
  for (
    const [columns, expected] of [
      [12, "[RA] ● work…"],
      [32, "[RA] ● working"],
      [60, "[RA] ● working"],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderAgentAvatarCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    (capabilities) => renderAgentAvatarCli(props, capabilities),
    "[RA] ● working",
    "[RA] * working",
  );

  const capabilities = testTerminalCapabilities({ columns: 32 });
  for (
    const [status, expected] of [
      ["working", "[RA] ● working"],
      ["waiting", "[RA] ◌ waiting"],
      ["blocked", "[RA] ! blocked"],
      ["done", "[RA] ✓ done"],
      ["idle", "[RA] · idle"],
    ] as const
  ) {
    assertExactFrame(
      renderAgentAvatarCli({ name: "Release agent", status }, capabilities),
      expected,
      capabilities,
    );
  }
  assertExactFrame(
    renderAgentAvatarCli({ name: "Release agent", size: "xs" }, capabilities),
    "[R]",
    capabilities,
  );
});

Deno.test("Agent mention renders exact narrow, standard, wide, and capability frames", () => {
  const props = {
    name: "release",
    href: "https://example.test/agents/release",
  } as const;
  for (
    const [columns, expected] of [
      [12, "❯ @release …"],
      [32, "❯ @release <https://example.tes…"],
      [60, "❯ @release <https://example.test/agents/release>"],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderAgentMentionCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    (capabilities) => renderAgentMentionCli(props, capabilities),
    "❯ @release <https://example.tes…",
    "> @release <https://example.tes.",
  );
});

Deno.test("Agent persona renders exact narrow, standard, wide, and capability frames", () => {
  const props = {
    name: "Release agent",
    detail: "Runs publication gates",
    status: "working",
  } as const;
  const standard = "[RA] Release agent · working\n     Runs publication gates";
  for (
    const [columns, expected] of [
      [
        12,
        "[RA] Release\n     agent ·\n     working\n     Runs\n     publica\n     tion\n     gates",
      ],
      [32, standard],
      [60, standard],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderAgentPersonaCli(props, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    (capabilities) => renderAgentPersonaCli(props, capabilities),
    standard,
    "[RA] Release agent - working\n     Runs publication gates",
  );
});
