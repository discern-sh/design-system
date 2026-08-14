import { assertEquals, assertStringIncludes } from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  renderTriangleActivityBeacon,
  renderTrianglePattern,
  renderTriangleProgressFrame,
  renderTriangleSectionRule,
  renderTriangleSpinnerFrame,
  renderTriangleWorkflowStepper,
} from "../../src/cli/triangles.ts";
import { measureText } from "../../src/cli/text.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testCapabilities,
} from "./helpers.ts";

const CAPABILITY_MATRIX_STEPS = [
  { label: "Done", status: "complete" },
  { label: "Work", status: "active", phase: 1 },
  { label: "Later", status: "pending" },
  { label: "Fail", status: "error" },
  { label: "Stop", status: "cancelled" },
] as const;

function renderCapabilityMatrix(
  capabilities: TerminalCapabilities,
): readonly string[] {
  return [
    renderTrianglePattern({ length: 4 }, capabilities),
    renderTriangleSpinnerFrame(0, capabilities),
    renderTriangleProgressFrame(
      { completed: 1, total: 2, width: 12 },
      capabilities,
    ),
    renderTriangleSectionRule("go", { width: 12 }, capabilities),
    renderTriangleWorkflowStepper(CAPABILITY_MATRIX_STEPS, capabilities),
    renderTriangleActivityBeacon({ width: 8, phase: 0 }, capabilities),
  ];
}

function assertCapabilityMatrix(
  actual: readonly string[],
  expected: readonly string[],
  capabilities: TerminalCapabilities,
  styled: boolean,
): void {
  assertEquals(actual.length, expected.length);
  for (const [index, frame] of actual.entries()) {
    const expectedFrame = expected[index];
    if (expectedFrame === undefined) {
      throw new Error(`missing capability-matrix frame ${index}`);
    }
    if (styled) {
      assertStyledFrame(frame, expectedFrame, capabilities);
    } else {
      assertExactFrame(frame, expectedFrame, capabilities);
    }
  }
}

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

Deno.test("section rules default to the strong embedded heading treatment", () => {
  const capabilities = testCapabilities({ columns: 17 });
  assertExactFrame(
    renderTriangleSectionRule("gate", { width: 16 }, capabilities),
    "━━ ◮ GATE ━━━━━━",
    capabilities,
  );
  assertExactFrame(
    renderTriangleSectionRule("gate", { width: 17 }, capabilities),
    "━━ ◮ GATE ━━━━━━━",
    capabilities,
  );
});

Deno.test("section rules expose strong underline and quiet sandwich treatments", () => {
  const unicode = testCapabilities({ columns: 16 });
  assertExactFrame(
    renderTriangleSectionRule(
      "gate",
      { width: 16, treatment: "underline" },
      unicode,
    ),
    "◮ GATE\n━━━━━━━━━━━━━━━━",
    unicode,
  );
  assertExactFrame(
    renderTriangleSectionRule(
      "gate",
      { width: 16, treatment: "sandwich" },
      unicode,
    ),
    "────────────────\n◮ GATE\n────────────────",
    unicode,
  );

  const ascii = testCapabilities({ columns: 16, unicode: false });
  assertExactFrame(
    renderTriangleSectionRule("gate", { width: 16 }, ascii),
    "== > GATE ======",
    ascii,
  );
  assertExactFrame(
    renderTriangleSectionRule(
      "gate",
      { width: 16, treatment: "underline" },
      ascii,
    ),
    "> GATE\n================",
    ascii,
  );
  assertExactFrame(
    renderTriangleSectionRule(
      "gate",
      { width: 16, treatment: "sandwich" },
      ascii,
    ),
    "----------------\n> GATE\n----------------",
    ascii,
  );
});

Deno.test("every section-rule treatment truncates long headings without overflow", () => {
  const label = "A deliberately long terminal section heading";
  for (const treatment of ["embedded", "underline", "sandwich"] as const) {
    for (const columns of [8, 16, 39, 80, 104]) {
      for (const unicode of [true, false]) {
        for (const colorDepth of ["truecolor", "none"] as const) {
          const capabilities = testCapabilities({
            columns,
            unicode,
            colorDepth,
          });
          const frame = stripAnsi(
            renderTriangleSectionRule(
              label,
              { width: columns, treatment },
              capabilities,
            ),
          );
          for (const line of frame.split("\n")) {
            assertEquals(measureText(line) <= columns, true);
          }
        }
      }
    }
  }
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
    " ◭  Done\n │\n[◭] Working\n │\n ·  Later\n │\n !  Failed\n │\n ×  Stopped",
    capabilities,
  );
});

Deno.test("workflow triangle direction follows completion status rather than list index or phase", () => {
  for (const unicode of [true, false]) {
    const capabilities = testCapabilities({ columns: 32, unicode });
    const completedMarker = unicode ? " ◭ " : " ^ ";
    for (const completedIndex of [0, 1, 2]) {
      const steps = Array.from({ length: 3 }, (_, index) => ({
        label: `Step ${index + 1}`,
        status: index === completedIndex
          ? "complete" as const
          : "pending" as const,
        ...(index === completedIndex ? { phase: index + 9 } : {}),
      }));
      const markerLine = renderTriangleWorkflowStepper(
        steps,
        capabilities,
      ).split("\n")[completedIndex * 2] ?? "";
      assertStringIncludes(stripAnsi(markerLine), completedMarker);
    }
  }
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

Deno.test("every triangle primitive degrades exactly across the capability matrix", () => {
  const unicodeFrames = [
    "◮⧩◭⧨",
    "◮",
    "[ 50%] ◮⧩...",
    "━━ ◮ GO ━━━━",
    " ◭  Done\n │\n[◭] Work\n │\n ·  Later\n │\n !  Fail\n │\n ×  Stop",
    "◮⧩◭⧨....",
  ];
  const asciiFrames = [
    ">v^<",
    ">",
    "[ 50%] >v...",
    "== > GO ====",
    " ^  Done\n |\n[^] Work\n |\n .  Later\n |\n !  Fail\n |\n x  Stop",
    ">v^<....",
  ];

  for (const unicode of [true, false]) {
    const expected = unicode ? unicodeFrames : asciiFrames;
    for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
      const capabilities = testCapabilities({
        colorDepth,
        columns: 30,
        unicode,
      });
      assertCapabilityMatrix(
        renderCapabilityMatrix(capabilities),
        expected,
        capabilities,
        true,
      );
    }
    const capabilities = testCapabilities({ columns: 30, unicode });
    assertCapabilityMatrix(
      renderCapabilityMatrix(capabilities),
      expected,
      capabilities,
      false,
    );
  }
});
