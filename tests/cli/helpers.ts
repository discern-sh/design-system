import { assert, assertEquals } from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import { measureText } from "../../src/cli/text.ts";

/** Build deterministic capabilities for exact terminal-frame tests. */
export function testCapabilities(
  overrides: Partial<TerminalCapabilities> = {},
): TerminalCapabilities {
  return {
    ansiControl: true,
    colorDepth: "none",
    columns: 80,
    unicode: true,
    ...overrides,
  };
}

/** Assert exact bytes and guarantee every visible line fits its terminal. */
export function assertExactFrame(
  actual: string,
  expected: string,
  capabilities: TerminalCapabilities,
): void {
  assertEquals(actual, expected);
  for (const line of stripAnsi(actual).split("\n")) {
    assert(
      measureText(line) <= capabilities.columns,
      `${JSON.stringify(line)} is wider than ${capabilities.columns} columns`,
    );
  }
}

/** Assert a coloured frame's plaintext contract and visible width. */
export function assertStyledFrame(
  actual: string,
  expectedPlaintext: string,
  capabilities: TerminalCapabilities,
): void {
  assert(
    actual.includes(String.fromCharCode(27)),
    "frame emitted no ANSI styling",
  );
  assertExactFrame(stripAnsi(actual), expectedPlaintext, capabilities);
}
