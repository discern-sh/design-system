import { renderDividerCli } from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testCapabilities,
} from "./helpers.ts";

Deno.test("Divider renders exact narrow, standard, wide, and capability-degraded rules", () => {
  for (
    const [columns, expected] of [
      [8, "◮⧩◭⧨◮⧩◭⧨"],
      [16, "◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨"],
      [24, "◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨"],
    ] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderDividerCli({ width: columns }, capabilities),
      expected,
      capabilities,
    );
  }
  const labelled = "◮⧩◭⧨◮ gate ◮⧨◭⧩◮";
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testCapabilities({ colorDepth, columns: 16 });
    assertStyledFrame(
      renderDividerCli({ label: "gate", width: 16 }, capabilities),
      labelled,
      capabilities,
    );
  }
  const ascii = testCapabilities({ columns: 16, unicode: false });
  assertExactFrame(
    renderDividerCli({ label: "gate", width: 16 }, ascii),
    ">v^<> gate ><^v>",
    ascii,
  );
});

Deno.test("Divider owns exact vertical, thick, phased, ribbon, field, weave, and ASCII treatments", () => {
  const unicode = testCapabilities({ columns: 8 });
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
  const ascii = testCapabilities({ columns: 8, unicode: false });
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
