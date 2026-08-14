import { renderDividerCli } from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

Deno.test("Divider renders exact narrow, standard, wide, and capability-degraded rules", () => {
  for (
    const [columns, expected] of [
      [8, "◮⧩◭⧨◮⧩◭⧨"],
      [16, "◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨"],
      [24, "◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨"],
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

Deno.test("Divider owns exact vertical, thick, phased, ribbon, field, weave, and ASCII treatments", () => {
  const unicode = testTerminalCapabilities({ columns: 8 });
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
    "⧩◭\n◭⧨\n⧨◮\n◮⧩",
    unicode,
  );
  assertExactFrame(
    renderDividerCli(
      {
        treatment: "field",
        length: 4,
        thickness: 3,
        phase: 2,
        width: 8,
      },
      unicode,
    ),
    "◭⧨◮⧩\n⧩◭⧨◮\n◭⧨◮⧩",
    unicode,
  );
  const ascii = testTerminalCapabilities({ columns: 8, unicode: false });
  assertExactFrame(
    renderDividerCli(
      { treatment: "weave", length: 8, width: 8 },
      ascii,
    ),
    "^v><^v><\n<^v><^v>\n^v><^v><\n<^v><^v>",
    ascii,
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
      ascii,
    ),
    "v^\n^<\n<>\n>v",
    ascii,
  );
});
