import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  requestAutocomplete,
  requestConfirmation,
  requestMaskedText,
  requestSearch,
  requestSelection,
  requestSelections,
  requestText,
  requestTextarea,
} from "../../src/cli/interactive/mod.ts";
import type { InteractionEntry } from "../../src/cli/interactive/types.ts";
import {
  assertExactFrame,
  FakeTerminalIO,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

const FIRST_COLUMN = "\x1b[1G";
const ERASE_TO_END = "\x1b[J";

const groupedChoices: readonly InteractionEntry<string>[] = Array.from(
  { length: 4 },
  (_, group) => [
    {
      kind: "group-heading" as const,
      id: `group-${group}`,
      label: `Group ${group + 1}`,
    },
    ...Array.from({ length: 4 }, (_, item) => ({
      id: `choice-${group}-${item}`,
      label: `Choice ${group + 1}.${item + 1}`,
      value: `${group}-${item}`,
    })),
  ],
).flat();

function frameRows(frame: string): number {
  return frame === "" ? 0 : frame.split("\n").length;
}

function paintedFrames(io: FakeTerminalIO): readonly string[] {
  return io.writes.flatMap((write) => {
    const eraseAt = write.indexOf(ERASE_TO_END);
    const frame = write.startsWith(FIRST_COLUMN) && eraseAt >= 0
      ? write.slice(eraseAt + ERASE_TO_END.length)
      : write;
    return /\[(?:active|searching|error|submitted|cancelled)\]/u.test(frame)
      ? [frame.endsWith("\n") ? frame.slice(0, -1) : frame]
      : [];
  });
}

/** The furthest any replacement sequence climbed above the cursor row. */
function highestCursorClimb(io: FakeTerminalIO): number {
  return io.writes.reduce((highest, write) => {
    let furthest = highest;
    for (const chunk of write.split("\x1b")) {
      const climb = chunk.match(/^\[(\d+)A/u);
      if (climb !== null) furthest = Math.max(furthest, Number(climb[1]));
    }
    return furthest;
  }, 0);
}

Deno.test("a zero or absent reservation preserves today's frames byte-for-byte", async () => {
  const outputs: string[] = [];
  for (const reservedRows of [undefined, 0] as const) {
    const io = new FakeTerminalIO(["\x1b[B", "\r"], { columns: 42, rows: 12 });
    assertEquals(
      await requestSelection({
        label: "Reserved",
        choices: groupedChoices,
        visibleCount: 16,
        ...(reservedRows === undefined ? {} : { reservedRows }),
      }, { io }),
      "0-1",
    );
    outputs.push(io.output());
  }
  assertEquals(outputs[0], outputs[1]);
});

Deno.test("a reservation keeps a full-budget list out of the caller's header band", async () => {
  const io = new FakeTerminalIO(["\x1b[B", "\x1b[B", "\r"], {
    columns: 42,
    rows: 12,
  });
  io.write("Board header\nStream 2A\nStream 2B\nStream 3A\n");
  assertEquals(
    await requestSelection({
      label: "Reserved",
      choices: groupedChoices,
      visibleCount: 16,
      reservedRows: 4,
    }, { io }),
    "0-2",
  );
  const budget = 12 - 4;
  for (const frame of paintedFrames(io)) {
    assert(
      frameRows(frame) <= budget,
      `a frame of ${frameRows(frame)} rows entered the 4-row header band`,
    );
  }
  assert(
    highestCursorClimb(io) <= budget - 1,
    `a repaint climbed ${highestCursorClimb(io)} rows toward the header band`,
  );
  assertExactFrame(
    io.writes[2] ?? "",
    "Reserved [active]\n┌────────────────────────────────────────┐\n│                                        │\n│━━ ▲ GROUP 1 ━━━━━━━━━━━━━━━━━━━━━━━━━━━│\n│› [●] Choice 1.1                        │\n│  [ ] Choice 1.2                        │\n└────────────── ↓ 14 more ───────────────┘\n",
    testTerminalCapabilities({ columns: 42 }),
  );
});

Deno.test("the reservation follows viewport shrink and regrow", async () => {
  const io = new FakeTerminalIO([], { columns: 42, rows: 16 });
  io.enqueueKeys("down");
  io.enqueueResize(42, 12);
  io.enqueueKeys("down");
  io.enqueueResize(42, 16);
  io.enqueueKeys("down", "enter");

  const sizes: number[] = [];
  const originalWrite = io.write.bind(io);
  io.write = (value: string) => {
    sizes.push(io.size().rows);
    originalWrite(value);
  };
  assertEquals(
    await requestSelection({
      label: "Resizing reservation",
      choices: groupedChoices,
      visibleCount: 16,
      reservedRows: 4,
    }, { io }),
    "0-3",
  );
  const frames = io.writes.flatMap((write, index) => {
    const eraseAt = write.indexOf(ERASE_TO_END);
    const frame = write.startsWith(FIRST_COLUMN) && eraseAt >= 0
      ? write.slice(eraseAt + ERASE_TO_END.length)
      : write;
    return /\[(?:active|submitted)\]/u.test(frame)
      ? [{ frame, rows: sizes[index] ?? 0 }]
      : [];
  });
  assert(frames.some(({ rows }) => rows === 12), "the shrink never applied");
  assert(frames.some(({ rows }) => rows === 16), "the regrow never applied");
  for (const { frame, rows } of frames) {
    assert(
      frameRows(frame) <= rows - 4,
      `rendered ${
        frameRows(frame)
      } rows into a ${rows}-row terminal holding a 4-row reservation`,
    );
  }
});

Deno.test("every request kind honors the caller's reservation", async () => {
  const budgetted: ReadonlyArray<
    readonly [string, (io: FakeTerminalIO) => Promise<unknown>]
  > = [
    [
      "text",
      (io) => requestText({ label: "Text", reservedRows: 12 }, { io }),
    ],
    [
      "masked",
      (io) => requestMaskedText({ label: "Masked", reservedRows: 12 }, { io }),
    ],
    [
      "confirm",
      (io) =>
        requestConfirmation({ label: "Confirm", reservedRows: 12 }, { io }),
    ],
    [
      "select",
      (io) =>
        requestSelection({
          label: "Select",
          choices: groupedChoices,
          visibleCount: 16,
          reservedRows: 12,
        }, { io }),
    ],
    [
      "multiselect",
      (io) =>
        requestSelections({
          label: "Multi",
          choices: groupedChoices,
          visibleCount: 16,
          reservedRows: 12,
        }, { io }),
    ],
    [
      "search",
      (io) =>
        requestSearch({
          label: "Search",
          search: () => groupedChoices,
          visibleCount: 16,
          reservedRows: 12,
        }, { io }),
    ],
    [
      "autocomplete",
      (io) =>
        requestAutocomplete({
          label: "Auto",
          suggestions: ["one", "two"],
          reservedRows: 12,
        }, { io }),
    ],
    [
      "textarea",
      (io) =>
        requestTextarea({ label: "Notes", rows: 12, reservedRows: 12 }, { io }),
    ],
  ];
  for (const [kind, run] of budgetted) {
    const io = new FakeTerminalIO(
      kind === "textarea" ? ["\x04"] : kind === "search" ? ["\r", "\r"] : [
        "\r",
      ],
      { columns: 42, rows: 20 },
    );
    await run(io);
    for (const frame of paintedFrames(io)) {
      assert(
        frameRows(frame) <= 8,
        `${kind} rendered ${
          frameRows(frame)
        } rows into an 8-row remainder below a 12-row reservation`,
      );
    }
  }
});

Deno.test("an unsatisfiable reservation degrades exactly like a too-short viewport", async () => {
  const io = new FakeTerminalIO(["\r"], { columns: 42, rows: 6 });
  await assertRejects(
    () =>
      requestSelection({
        label: "Unsatisfiable",
        choices: groupedChoices,
        reservedRows: 10,
      }, { io }),
    TypeError,
    "cannot hold a coherent interaction frame",
  );
  assertEquals(io.rawTransitions, [true, false]);

  const invalid = new FakeTerminalIO(["\r"], { columns: 42, rows: 20 });
  for (const reservedRows of [-1, 2.5]) {
    await assertRejects(
      () =>
        requestText({ label: "Invalid reservation", reservedRows }, {
          io: invalid,
        }),
      TypeError,
      "reserved rows",
    );
  }
  assertEquals(invalid.rawTransitions, []);
  assertEquals(invalid.writes, []);
});
