import { renderDividerCli } from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

Deno.test("Divider renders exact narrow, standard, wide, and capability-degraded rules", () => {
  for (
    const [columns, expected] of [
      [8, "╶─ ◮ ──╴"],
      [16, "╶───── ◮ ──────╴"],
      [24, "╶───────── ◮ ──────────╴"],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderDividerCli({ width: columns }, capabilities),
      expected,
      capabilities,
    );
  }
  const labelled = "━━ ◮ GATE ━━━━━━";
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testTerminalCapabilities({ colorDepth, columns: 16 });
    assertStyledFrame(
      renderDividerCli({ label: "gate", width: 16 }, capabilities),
      labelled,
      capabilities,
    );
  }
  const ascii = testTerminalCapabilities({ columns: 16, unicode: false });
  assertExactFrame(
    renderDividerCli({ label: "gate", width: 16 }, ascii),
    "== > GATE ======",
    ascii,
  );
});

Deno.test("Divider owns exact leading-marker ribbon, phased vertical, and ASCII treatments", () => {
  const unicode = testTerminalCapabilities({ columns: 8 });
  assertExactFrame(
    renderDividerCli(
      { treatment: "ribbon", length: 8, width: 8 },
      unicode,
    ),
    "◮  ─────",
    unicode,
  );
  assertExactFrame(
    renderDividerCli(
      {
        treatment: "ribbon",
        orientation: "vertical",
        length: 4,
        phase: 1,
        width: 8,
      },
      unicode,
    ),
    "⧩\n◭\n⧨\n◮",
    unicode,
  );
  const ascii = testTerminalCapabilities({ columns: 8, unicode: false });
  assertExactFrame(
    renderDividerCli(
      {
        treatment: "ribbon",
        orientation: "vertical",
        length: 4,
        phase: 1,
        width: 8,
      },
      ascii,
    ),
    "v\n^\n<\n>",
    ascii,
  );
});
