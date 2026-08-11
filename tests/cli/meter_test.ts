import { renderMeterCli } from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testCapabilities,
} from "./helpers.ts";

const meter = (
  completed: number,
  status: "active" | "submitted" = "active",
) => ({
  kind: "determinate-progress" as const,
  label: "Upload",
  lifecycle: { status } as const,
  completed,
  total: 100,
});

Deno.test("Meter renders zero, quarter, and complete at narrow and standard widths", () => {
  for (
    const [width, expected] of [
      [12, [
        "Upload\n[  0%] .....",
        "Upload\n[ 25%] ◮....",
        "Upload\n[100%] ◮⧩◭⧨◮\n✓ Complete",
      ]],
      [20, [
        "Upload\n[  0%] .............",
        "Upload\n[ 25%] ◮⧩◭..........",
        "Upload\n[100%] ◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮\n✓ Complete",
      ]],
    ] as const
  ) {
    const capabilities = testCapabilities({ columns: width });
    for (const [index, completed] of [0, 25, 100].entries()) {
      assertExactFrame(
        renderMeterCli({
          ...meter(completed, completed === 100 ? "submitted" : "active"),
          width,
        }, capabilities),
        expected[index] ?? "",
        capabilities,
      );
    }
  }
});

Deno.test("Meter uses exact ASCII progress and every colour capability", () => {
  for (const width of [12, 20]) {
    const capabilities = testCapabilities({ columns: width, unicode: false });
    assertExactFrame(
      renderMeterCli({ ...meter(25), width }, capabilities),
      width === 12 ? "Upload\n[ 25%] >...." : "Upload\n[ 25%] >v^..........",
      capabilities,
    );
  }
  const wide = testCapabilities({ columns: 40 });
  assertExactFrame(
    renderMeterCli({ ...meter(25), width: 40 }, wide),
    "Upload\n[ 25%] ◮⧩◭⧨◮⧩◭⧨.........................",
    wide,
  );
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testCapabilities({ colorDepth, columns: 20 });
    assertStyledFrame(
      renderMeterCli({ ...meter(25), width: 20 }, capabilities),
      "Upload\n[ 25%] ◮⧩◭..........",
      capabilities,
    );
  }
});

Deno.test("Meter renders validation and cancellation lifecycle frames", () => {
  const capabilities = testCapabilities({ columns: 20 });
  assertExactFrame(
    renderMeterCli({
      ...meter(25),
      lifecycle: { status: "validation-error", message: "Quota exceeded" },
      width: 20,
    }, capabilities),
    "Upload\n[ 25%] ◮⧩◭..........\n! Quota exceeded",
    capabilities,
  );
  assertExactFrame(
    renderMeterCli({
      ...meter(25),
      lifecycle: { status: "cancelled", reason: "Stopped" },
      width: 20,
    }, capabilities),
    "Upload\n[ 25%] ◮⧩◭..........\n× Stopped",
    capabilities,
  );
});
