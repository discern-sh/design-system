import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  renderMotifActivityBeacon,
  renderMotifDivider,
  renderMotifPattern,
  renderMotifProgressFrame,
  renderMotifSectionRule,
  renderMotifSpinnerFrame,
  renderMotifWorkflowStepper,
} from "../../src/cli/motifs.ts";
import {
  defineTerminalMotif,
  deriveTerminalMotif,
  DISCERN_TERMINAL_MOTIF,
  type TerminalMotif,
  type TerminalMotifDefinition,
} from "../../src/cli/motif.ts";
import { measureText } from "../../src/cli/text.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

const CAPABILITY_MATRIX_STEPS = [
  { label: "Done", status: "complete" },
  { label: "Work", status: "active", phase: 1 },
  { label: "Later", status: "pending" },
  { label: "Fail", status: "error" },
  { label: "Stop", status: "cancelled" },
] as const;

const VALID_MOTIF_DEFINITION: TerminalMotifDefinition = {
  unicode: {
    spinner: ["▴"],
    pattern: ["▴"],
    marker: "▴",
    status: { complete: "▴", incomplete: "▾" },
  },
  ascii: {
    spinner: ["*"],
    pattern: ["*"],
    marker: "*",
    status: { complete: "+", incomplete: "-" },
  },
};

const CUSTOM_TERMINAL_MOTIF = deriveTerminalMotif(
  DISCERN_TERMINAL_MOTIF,
  {
    unicode: {
      spinner: ["◴", "◷", "◶", "◵"],
      pattern: ["▵", "▹", "▿", "◃"],
      marker: "◉",
      status: { complete: "▵", incomplete: "▿" },
    },
    ascii: {
      spinner: ["1", "2", "3", "4"],
      pattern: ["a", "b"],
      marker: "?",
      status: { complete: "Y", incomplete: "N" },
    },
  },
);

async function terminalSourceFiles(directory: URL): Promise<URL[]> {
  const files: URL[] = [];
  for await (const entry of Deno.readDir(directory)) {
    const url = new URL(entry.name, directory);
    if (entry.isDirectory) {
      files.push(
        ...await terminalSourceFiles(new URL(`${entry.name}/`, directory)),
      );
    } else if (
      entry.isFile &&
      (directory.pathname.includes("/src/cli/") ||
        entry.name.endsWith(".cli.ts")) &&
      entry.name.endsWith(".ts")
    ) {
      files.push(url);
    }
  }
  return files;
}

function renderCapabilityMatrix(
  capabilities: TerminalCapabilities,
): readonly string[] {
  return [
    renderMotifPattern({ length: 4 }, capabilities),
    renderMotifSpinnerFrame(0, capabilities),
    renderMotifProgressFrame(
      { completed: 1, total: 2, width: 12 },
      capabilities,
    ),
    renderMotifSectionRule("go", { width: 12 }, capabilities),
    renderMotifWorkflowStepper(CAPABILITY_MATRIX_STEPS, capabilities),
    renderMotifActivityBeacon({ width: 8, phase: 0 }, capabilities),
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

Deno.test("terminal motif factories validate, freeze, and derive semantic roles", () => {
  const defined = defineTerminalMotif(VALID_MOTIF_DEFINITION);
  assertEquals(Object.isFrozen(defined), true);
  assertEquals(Object.isFrozen(defined.unicode), true);
  assertEquals(Object.isFrozen(defined.unicode.spinner), true);
  assertEquals(Object.isFrozen(defined.unicode.status), true);

  assertEquals(DISCERN_TERMINAL_MOTIF.unicode.spinner, [
    "◐",
    "◓",
    "◑",
    "◒",
  ]);
  assertEquals(CUSTOM_TERMINAL_MOTIF.unicode.marker, "◉");
  assertEquals(DISCERN_TERMINAL_MOTIF.unicode.marker, "◮");
  assertEquals(DISCERN_TERMINAL_MOTIF.unicode.status, {
    complete: "▲",
    incomplete: "△",
  });
});

Deno.test("terminal motif definitions admit narrow-A glyphs and reject unsafe classes", () => {
  const withUnicodeSpinner = (glyphs: readonly string[]) => ({
    ...VALID_MOTIF_DEFINITION,
    unicode: {
      ...VALID_MOTIF_DEFINITION.unicode,
      spinner: glyphs,
    },
  });
  assertThrows(
    () => defineTerminalMotif(withUnicodeSpinner([])),
    TypeError,
    "at least one glyph",
  );
  assertThrows(
    () => defineTerminalMotif(withUnicodeSpinner(["AB"])),
    TypeError,
    "one Unicode scalar",
  );
  assertThrows(
    () => defineTerminalMotif(withUnicodeSpinner(["\u0301"])),
    TypeError,
    "non-combining",
  );
  const ambiguous = defineTerminalMotif(
    withUnicodeSpinner(["◐", "◑", "△"]),
  );
  assertEquals(ambiguous.unicode.spinner, ["◐", "◑", "△"]);
  assertEquals(ambiguous.unicode.spinner.map(measureText), [1, 1, 1]);
  assertThrows(
    () => defineTerminalMotif(withUnicodeSpinner(["界"])),
    TypeError,
    "one terminal cell",
  );
  assertThrows(
    () => defineTerminalMotif(withUnicodeSpinner(["😀"])),
    TypeError,
    "one terminal cell",
  );
  assertThrows(
    () =>
      defineTerminalMotif({
        ...VALID_MOTIF_DEFINITION,
        ascii: { ...VALID_MOTIF_DEFINITION.ascii, marker: " " },
      }),
    TypeError,
    "printable non-space ASCII",
  );
  assertThrows(
    () =>
      renderMotifPattern({
        length: 1,
        motif: VALID_MOTIF_DEFINITION as unknown as TerminalMotif,
      }, testTerminalCapabilities()),
    TypeError,
    "must be created by defineTerminalMotif",
  );
});

Deno.test("the discern glyph repertoire has one production authority", async () => {
  const roots = [
    new URL("../../src/cli/", import.meta.url),
    new URL("../../src/components/", import.meta.url),
  ];
  const leaks: string[] = [];
  for (const root of roots) {
    for (const source of await terminalSourceFiles(root)) {
      if (source.pathname.endsWith("/src/cli/motif.ts")) continue;
      const text = await Deno.readTextFile(source);
      for (
        const glyph of ["◮", "◭", "⧩", "⧨", "◓", "◑", "◒", "▲", "△"]
      ) {
        if (text.includes(glyph)) {
          leaks.push(`${source.pathname}: ${glyph}`);
        }
      }
    }
  }
  assertEquals(leaks, []);
});

Deno.test("one custom motif reaches every semantic renderer role", () => {
  const unicode = testTerminalCapabilities({ columns: 20 });
  const ascii = testTerminalCapabilities({ columns: 20, unicode: false });
  const motif = CUSTOM_TERMINAL_MOTIF;
  assertEquals(
    [0, 1, 2, 3].map((phase) =>
      renderMotifSpinnerFrame(phase, unicode, { motif })
    ),
    ["◴", "◷", "◶", "◵"],
  );
  assertEquals(
    renderMotifPattern({ length: 4, motif }, unicode),
    "▵▹▿◃",
  );
  assertStringIncludes(
    renderMotifSectionRule("custom", { width: 20, motif }, unicode),
    "▵ CUSTOM",
  );
  assertEquals(
    renderMotifWorkflowStepper(
      [
        { label: "Done", status: "complete" },
        { label: "Moving", status: "active", phase: 1 },
        { label: "Pending", status: "pending" },
      ],
      unicode,
      { motif },
    ),
    " ▵  Done\n │\n[◷] Moving\n │\n ▿  Pending",
  );
  assertEquals(
    renderMotifDivider({ width: 9, motif }, unicode),
    "╶── ◉ ──╴",
  );
  assertEquals(
    renderMotifProgressFrame(
      { completed: 1, total: 2, width: 12, motif },
      unicode,
    ),
    "[ 50%] ━━◉──",
  );
  assertEquals(
    renderMotifActivityBeacon({ width: 8, phase: 0, motif }, unicode),
    "◉───────",
  );
  assertEquals(
    renderMotifSpinnerFrame(2, ascii, { motif }),
    "3",
  );
  assertEquals(
    renderMotifActivityBeacon({ width: 8, phase: 0, motif }, ascii),
    "?-------",
  );
});

Deno.test("motif divider keeps one centred marker across widths and repertoires", () => {
  const unicode = testTerminalCapabilities({ columns: 20 });
  for (
    const [width, expected] of [
      [1, "◮"],
      [2, "◮╴"],
      [3, "╶◮╴"],
      [4, "╶◮─╴"],
      [5, "╶ ◮ ╴"],
      [9, "╶── ◮ ──╴"],
    ] as const
  ) {
    assertExactFrame(renderMotifDivider({ width }, unicode), expected, unicode);
  }
  const ascii = testTerminalCapabilities({ columns: 9, unicode: false });
  assertExactFrame(renderMotifDivider({ width: 9 }, ascii), "--- > ---", ascii);
  const styled = testTerminalCapabilities({
    columns: 9,
    colorDepth: "truecolor",
  });
  assertStyledFrame(
    renderMotifDivider({ width: 9 }, styled),
    "╶── ◮ ──╴",
    styled,
  );
});

Deno.test("motif patterns preserve horizontal, vertical, phase, and direction contracts", () => {
  const capabilities = testTerminalCapabilities({ columns: 20 });
  assertExactFrame(
    renderMotifPattern({ length: 4 }, capabilities),
    "◮⧩◭⧨",
    capabilities,
  );
  assertExactFrame(
    renderMotifPattern({ length: 4, direction: "reverse" }, capabilities),
    "⧨◭⧩◮",
    capabilities,
  );
  assertExactFrame(
    renderMotifPattern({ length: 4, orientation: "vertical" }, capabilities),
    "◮\n⧩\n◭\n⧨",
    capabilities,
  );
});

Deno.test("all spinner phases preserve their Unicode and ASCII orders", () => {
  const unicode = testTerminalCapabilities();
  const ascii = testTerminalCapabilities({ unicode: false });
  assertEquals(
    [0, 1, 2, 3, 4].map((phase) => renderMotifSpinnerFrame(phase, unicode)),
    ["◐", "◓", "◑", "◒", "◐"],
  );
  assertEquals(
    [0, 1, 2, 3, 4].map((phase) => renderMotifSpinnerFrame(phase, ascii)),
    ["^", "<", "v", ">", "^"],
  );
});

Deno.test("progress frames are exact at zero, partial, complete, and ASCII degradation", () => {
  const unicode = testTerminalCapabilities({ columns: 15 });
  assertExactFrame(
    renderMotifProgressFrame({ completed: 0, total: 4, width: 15 }, unicode),
    "[  0%] ◮───────",
    unicode,
  );
  assertExactFrame(
    renderMotifProgressFrame({ completed: 1, total: 4, width: 15 }, unicode),
    "[ 25%] ━◮──────",
    unicode,
  );
  assertExactFrame(
    renderMotifProgressFrame({ completed: 4, total: 4, width: 15 }, unicode),
    "[100%] ━━━━━━━◮",
    unicode,
  );
  const ascii = testTerminalCapabilities({ columns: 12, unicode: false });
  assertExactFrame(
    renderMotifProgressFrame({ completed: 1, total: 2, width: 12 }, ascii),
    "[ 50%] ==>--",
    ascii,
  );
});

Deno.test("section rules default to the strong embedded heading treatment", () => {
  const capabilities = testTerminalCapabilities({ columns: 17 });
  assertExactFrame(
    renderMotifSectionRule("gate", { width: 16 }, capabilities),
    "━━ ◮ GATE ━━━━━━",
    capabilities,
  );
  assertExactFrame(
    renderMotifSectionRule("gate", { width: 17 }, capabilities),
    "━━ ◮ GATE ━━━━━━━",
    capabilities,
  );
});

Deno.test("section rules expose strong underline and quiet sandwich treatments", () => {
  const unicode = testTerminalCapabilities({ columns: 16 });
  assertExactFrame(
    renderMotifSectionRule(
      "gate",
      { width: 16, treatment: "underline" },
      unicode,
    ),
    "◮ GATE\n━━━━━━━━━━━━━━━━",
    unicode,
  );
  assertExactFrame(
    renderMotifSectionRule(
      "gate",
      { width: 16, treatment: "sandwich" },
      unicode,
    ),
    "────────────────\n◮ GATE\n────────────────",
    unicode,
  );

  const ascii = testTerminalCapabilities({ columns: 16, unicode: false });
  assertExactFrame(
    renderMotifSectionRule("gate", { width: 16 }, ascii),
    "== > GATE ======",
    ascii,
  );
  assertExactFrame(
    renderMotifSectionRule(
      "gate",
      { width: 16, treatment: "underline" },
      ascii,
    ),
    "> GATE\n================",
    ascii,
  );
  assertExactFrame(
    renderMotifSectionRule(
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
          const capabilities = testTerminalCapabilities({
            columns,
            unicode,
            colorDepth,
          });
          const frame = stripAnsi(
            renderMotifSectionRule(
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
  const capabilities = testTerminalCapabilities({ columns: 30 });
  assertExactFrame(
    renderMotifWorkflowStepper([
      { label: "Done", status: "complete" },
      { label: "Working", status: "active", phase: 1 },
      { label: "Later", status: "pending" },
      { label: "Failed", status: "error" },
      { label: "Stopped", status: "cancelled" },
    ], capabilities),
    " ▲  Done\n │\n[◓] Working\n │\n △  Later\n │\n !  Failed\n │\n ×  Stopped",
    capabilities,
  );
});

Deno.test("workflow motif status follows completion status rather than list index or phase", () => {
  for (const unicode of [true, false]) {
    const capabilities = testTerminalCapabilities({ columns: 32, unicode });
    const completedMarker = unicode ? " ▲ " : " ^ ";
    for (const completedIndex of [0, 1, 2]) {
      const steps = Array.from({ length: 3 }, (_, index) => ({
        label: `Step ${index + 1}`,
        status: index === completedIndex
          ? "complete" as const
          : "pending" as const,
        ...(index === completedIndex ? { phase: index + 9 } : {}),
      }));
      const markerLine = renderMotifWorkflowStepper(
        steps,
        capabilities,
      ).split("\n")[completedIndex * 2] ?? "";
      assertStringIncludes(stripAnsi(markerLine), completedMarker);
    }
  }
});

Deno.test("activity beacon preserves every phase on its out-and-back rail", () => {
  const capabilities = testTerminalCapabilities({ columns: 8 });
  assertEquals(
    Array.from(
      { length: 14 },
      (_, phase) =>
        renderMotifActivityBeacon({ width: 8, phase }, capabilities),
    ),
    [
      "◮───────",
      "─◮──────",
      "──◮─────",
      "───◮────",
      "────◮───",
      "─────◮──",
      "──────◮─",
      "───────◮",
      "──────◮─",
      "─────◮──",
      "────◮───",
      "───◮────",
      "──◮─────",
      "─◮──────",
    ],
  );
  assertExactFrame(
    renderMotifActivityBeacon(
      { width: 8, phase: 0, direction: "reverse" },
      capabilities,
    ),
    "───────◮",
    capabilities,
  );
});

Deno.test("every motif primitive degrades exactly across the capability matrix", () => {
  const unicodeFrames = [
    "◮⧩◭⧨",
    "◐",
    "[ 50%] ━━◮──",
    "━━ ◮ GO ━━━━",
    " ▲  Done\n │\n[◓] Work\n │\n △  Later\n │\n !  Fail\n │\n ×  Stop",
    "◮───────",
  ];
  const asciiFrames = [
    ">v^<",
    "^",
    "[ 50%] ==>--",
    "== > GO ====",
    " ^  Done\n |\n[<] Work\n |\n v  Later\n |\n !  Fail\n |\n x  Stop",
    ">-------",
  ];

  for (const unicode of [true, false]) {
    const expected = unicode ? unicodeFrames : asciiFrames;
    for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
      const capabilities = testTerminalCapabilities({
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
    const capabilities = testTerminalCapabilities({ columns: 30, unicode });
    assertCapabilityMatrix(
      renderCapabilityMatrix(capabilities),
      expected,
      capabilities,
      false,
    );
  }
});
