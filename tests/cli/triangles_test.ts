import { assertEquals } from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import {
  renderTriangleActivityBeacon,
  renderTrianglePattern,
  renderTriangleProgressFrame,
  renderTriangleSectionRule,
  renderTriangleSpinnerFrame,
  renderTriangleWorkflowStepper,
} from "../../src/cli/triangles.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testCapabilities,
} from "./helpers.ts";

Deno.test("triangle patterns preserve horizontal, vertical, thick, phase, and direction contracts", () => {
  const capabilities = testCapabilities({ columns: 20 });
  assertExactFrame(
    renderTrianglePattern({ length: 4 }, capabilities),
    "◮⧩◭⧨",
    capabilities,
  );
  assertExactFrame(
    renderTrianglePattern({ length: 4, direction: "reverse" }, capabilities),
    "⧨◭⧩◮",
    capabilities,
  );
  assertExactFrame(
    renderTrianglePattern({ length: 4, thickness: 3 }, capabilities),
    "◮⧩◭⧨\n⧨◮⧩◭\n◮⧩◭⧨",
    capabilities,
  );
  assertExactFrame(
    renderTrianglePattern(
      { length: 4, thickness: 2, orientation: "vertical" },
      capabilities,
    ),
    "◮⧩\n⧩◭\n◭⧨\n⧨◮",
    capabilities,
  );
});

Deno.test("all spinner phases preserve their Unicode and ASCII orders", () => {
  const unicode = testCapabilities();
  const ascii = testCapabilities({ unicode: false });
  assertEquals(
    [0, 1, 2, 3, 4].map((phase) => renderTriangleSpinnerFrame(phase, unicode)),
    ["◮", "◭", "⧨", "⧩", "◮"],
  );
  assertEquals(
    [0, 1, 2, 3, 4].map((phase) => renderTriangleSpinnerFrame(phase, ascii)),
    [">", "^", "<", "v", ">"],
  );
});

Deno.test("progress frames are exact at zero, partial, complete, and ASCII degradation", () => {
  const unicode = testCapabilities({ columns: 15 });
  assertExactFrame(
    renderTriangleProgressFrame({ completed: 0, total: 4, width: 15 }, unicode),
    "[  0%] ........",
    unicode,
  );
  assertExactFrame(
    renderTriangleProgressFrame({ completed: 1, total: 4, width: 15 }, unicode),
    "[ 25%] ◮⧩......",
    unicode,
  );
  assertExactFrame(
    renderTriangleProgressFrame({ completed: 4, total: 4, width: 15 }, unicode),
    "[100%] ◮⧩◭⧨◮⧩◭⧨",
    unicode,
  );
  const ascii = testCapabilities({ columns: 12, unicode: false });
  assertExactFrame(
    renderTriangleProgressFrame({ completed: 1, total: 2, width: 12 }, ascii),
    "[ 50%] >v...",
    ascii,
  );
});

Deno.test("labeled section rules reflect their triangle arms at varied widths", () => {
  const capabilities = testCapabilities({ columns: 17 });
  assertExactFrame(
    renderTriangleSectionRule("gate", { width: 16 }, capabilities),
    "◮⧩◭⧨◮ gate ◮⧨◭⧩◮",
    capabilities,
  );
  assertExactFrame(
    renderTriangleSectionRule("gate", { width: 17 }, capabilities),
    "◮⧩◭⧨◮ gate ◮⧨◭⧩◮⧨",
    capabilities,
  );
});

Deno.test("workflow stepper renders every semantic step state", () => {
  const capabilities = testCapabilities({ columns: 30 });
  assertExactFrame(
    renderTriangleWorkflowStepper([
      { label: "Done", status: "complete" },
      { label: "Working", status: "active", phase: 1 },
      { label: "Later", status: "pending" },
      { label: "Failed", status: "error" },
      { label: "Stopped", status: "cancelled" },
    ], capabilities),
    "◮ Done\n│\n[◭] Working\n│\n· Later\n│\n! Failed\n│\n× Stopped",
    capabilities,
  );
});

Deno.test("activity beacon preserves every phase in its out-and-back journey", () => {
  const capabilities = testCapabilities({ columns: 8 });
  assertEquals(
    Array.from(
      { length: 8 },
      (_, phase) =>
        renderTriangleActivityBeacon({ width: 8, phase }, capabilities),
    ),
    [
      "◮⧩◭⧨....",
      ".⧩◭⧨◮...",
      "..◭⧨◮⧩..",
      "...⧨◮⧩◭.",
      "....◮⧩◭⧨",
      "...⧩◭⧨◮.",
      "..◭⧨◮⧩..",
      ".⧨◮⧩◭...",
    ],
  );
  assertExactFrame(
    renderTriangleActivityBeacon(
      { width: 8, phase: 0, direction: "reverse" },
      capabilities,
    ),
    "....⧨◭⧩◮",
    capabilities,
  );
});

Deno.test("triangle motifs emit exact plaintext under every colour depth", () => {
  const expected = "◮⧩◭⧨";
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testCapabilities({ colorDepth, columns: 4 });
    assertStyledFrame(
      renderTrianglePattern({ length: 4 }, capabilities),
      expected,
      capabilities,
    );
  }
  const none = testCapabilities({ columns: 4 });
  assertExactFrame(renderTrianglePattern({ length: 4 }, none), expected, none);
  assertEquals(stripAnsi(renderTrianglePattern({ length: 4 }, none)), expected);
});
