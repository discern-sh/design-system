import { assertEquals, assertThrows } from "@std/assert";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import type { ActivityLogCliProps } from "../../src/components/workflow/activity-log/activity-log.cli.ts";
import { renderActivityLogCli } from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

const streaming: ActivityLogCliProps = {
  kind: "activity-log",
  label: "Build styles",
  lifecycle: { status: "active" },
  phase: 1,
  stable: [{ text: "Tokens held", tone: "note" }],
  tail: ["one", "two words that will wrap on narrow", "  indented detail"],
  partial: "three now",
  tailRows: 3,
  hint: "Ctrl+C stops.",
};

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

Deno.test("Activity log renders exact narrow, standard, wide, and capability frames", () => {
  for (
    const [columns, expected] of [
      [
        16,
        "◓ Build styles\n◮ Tokens held\n│   indented\n│   detail\n│ three now\nCtrl+C stops.",
      ],
      [
        40,
        "◓ Build styles\n◮ Tokens held\n│ two words that will wrap on narrow\n│   indented detail\n│ three now\nCtrl+C stops.",
      ],
      [
        80,
        "◓ Build styles\n◮ Tokens held\n│ two words that will wrap on narrow\n│   indented detail\n│ three now\nCtrl+C stops.",
      ],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderActivityLogCli(streaming, capabilities),
      expected,
      capabilities,
    );
  }
  assertCapabilityLevels(
    (capabilities) => renderActivityLogCli(streaming, capabilities),
    "◓ Build styles\n◮ Tokens held\n│ two words that will wrap on narrow\n│   indented detail\n│ three now\nCtrl+C stops.",
    "< Build styles\n> Tokens held\n| two words that will wrap on narrow\n|   indented detail\n| three now\nCtrl+C stops.",
  );
});

function without(
  props: ActivityLogCliProps,
  ...keys: readonly ("partial" | "hint")[]
): ActivityLogCliProps {
  const copy: Record<string, unknown> = { ...props };
  for (const key of keys) delete copy[key];
  return copy as unknown as ActivityLogCliProps;
}

Deno.test("Activity log tail rows stay reserved while the stream is empty", () => {
  const capabilities = testTerminalCapabilities({ columns: 40 });
  assertExactFrame(
    renderActivityLogCli({
      ...without(streaming, "partial"),
      stable: [],
      tail: [],
      tailRows: 4,
    }, capabilities),
    "◓ Build styles\n│\n│\n│\n│\nCtrl+C stops.",
    capabilities,
  );
});

Deno.test("Activity log windows the last rows after width wrapping", () => {
  const capabilities = testTerminalCapabilities({ columns: 16 });
  const rendered = renderActivityLogCli(
    { ...streaming, stable: [] },
    capabilities,
  );
  assertExactFrame(
    rendered,
    "◓ Build styles\n│   indented\n│   detail\n│ three now\nCtrl+C stops.",
    capabilities,
  );
});

Deno.test("Activity log completion and cancellation frames stay exact", () => {
  const summary: ActivityLogCliProps = {
    kind: "activity-log",
    label: "Build styles",
    lifecycle: { status: "submitted" },
    phase: 3,
    stable: [
      { text: "Tokens held", tone: "success" },
      { text: "One warning kept", tone: "warning" },
    ],
    tail: [],
    tailRows: 0,
  };
  const cancelled: ActivityLogCliProps = {
    ...summary,
    lifecycle: { status: "cancelled", reason: "Cancelled." },
    stable: [{ text: "Tokens held", tone: "success" }],
  };
  assertCapabilityLevels(
    (capabilities) => renderActivityLogCli(summary, capabilities),
    "◮ Build styles\n✓ Tokens held\n! One warning kept\n",
    "> Build styles\n+ Tokens held\n! One warning kept\n",
  );
  assertCapabilityLevels(
    (capabilities) => renderActivityLogCli(cancelled, capabilities),
    "× Build styles\n✓ Tokens held\nCancelled.",
    "x Build styles\n+ Tokens held\nCancelled.",
  );
});

Deno.test("Activity log footer row is reserved without a hint", () => {
  const capabilities = testTerminalCapabilities({ columns: 40 });
  const rendered = renderActivityLogCli({
    ...without(streaming, "partial", "hint"),
    stable: [],
    tail: ["only"],
    tailRows: 1,
  }, capabilities);
  assertEquals(rendered, "◓ Build styles\n│ only\n");
  assertEquals(rendered.split("\n").length, 3);
});

Deno.test("Activity log rejects geometry-breaking inputs", () => {
  const capabilities = testTerminalCapabilities({ columns: 40 });
  assertThrows(
    () =>
      renderActivityLogCli({ ...streaming, label: "two\nlines" }, capabilities),
    TypeError,
    "control-free",
  );
  assertThrows(
    () => renderActivityLogCli({ ...streaming, tailRows: -1 }, capabilities),
    TypeError,
    "non-negative",
  );
  assertThrows(
    () =>
      renderActivityLogCli(
        { ...streaming, tail: ["fine", "broken\u0007line"] },
        capabilities,
      ),
    TypeError,
    "tail line 2",
  );
  assertThrows(
    () =>
      renderActivityLogCli(
        { ...streaming, partial: "zero\u200bwidth" },
        capabilities,
      ),
    TypeError,
    "partial line",
  );
});
