import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  BEGIN_SYNCHRONIZED_UPDATE,
  DEFAULT_TERMINAL_PAINT_OPTIONS,
  END_SYNCHRONIZED_UPDATE,
  ERASE_TERMINAL_DISPLAY,
  ERASE_TERMINAL_LINE,
  HOME_TERMINAL_CURSOR,
  type TerminalPaintOptions,
  terminalPaintOptions,
  terminalRowCursor,
  TerminalScreenPainter,
} from "../../src/cli/interactive/painter.ts";
import {
  decodeTerminalStateReport,
  encodeTerminalStateReport,
  TERMINAL_STATE_REPORT_PREFIX,
} from "../../src/cli/interactive/state-report.ts";
import {
  captureTerminalFrame,
  FakeTerminalIO,
  ManualTerminalClock,
  settledTerminalFrame,
} from "../../src/cli/interactive/testing.ts";

const size = { columns: 12, rows: 4 };

function frame(...rows: readonly string[]): string {
  return rows.map((row) => row.padEnd(size.columns)).join("\n");
}

function painterFor(
  options: Partial<TerminalPaintOptions> = {},
  terminal = size,
): {
  readonly io: FakeTerminalIO;
  readonly clock: ManualTerminalClock;
  readonly painter: TerminalScreenPainter;
} {
  const io = new FakeTerminalIO([], terminal);
  const clock = new ManualTerminalClock();
  return {
    io,
    clock,
    painter: new TerminalScreenPainter(io, () => clock.now(), options),
  };
}

const first = frame("Title", "  one", "  two", "Footer");
const moved = frame("Title", "> one", "  two", "Footer");

Deno.test("the first paint is one synchronized keyframe and an unchanged frame writes nothing", () => {
  const { io, painter } = painterFor();
  const painted = painter.paint({ frame: first, size });
  assertEquals(painted.status, "painted");
  assertEquals(io.writes, [
    `${BEGIN_SYNCHRONIZED_UPDATE}${ERASE_TERMINAL_DISPLAY}${HOME_TERMINAL_CURSOR}${
      first.split("\n").join("\r\n")
    }${END_SYNCHRONIZED_UPDATE}`,
  ]);
  assertEquals(painter.paint({ frame: first, size }), { status: "unchanged" });
  assertEquals(io.writes.length, 1);
});

Deno.test("a changed frame rewrites exactly its changed rows at absolute positions", () => {
  const { io, painter } = painterFor();
  painter.paint({ frame: first, size });
  const painted = painter.paint({ frame: moved, size });
  assertEquals(painted, {
    status: "painted",
    kind: "rows",
    rows: 1,
    bytes: new TextEncoder().encode(io.writes[1]!).length,
  });
  assertEquals(
    io.writes[1],
    `${BEGIN_SYNCHRONIZED_UPDATE}${terminalRowCursor(2)}${ERASE_TERMINAL_LINE}${
      moved.split("\n")[1]
    }${END_SYNCHRONIZED_UPDATE}`,
  );
  assertEquals(settledTerminalFrame(io.output(), size), moved);
});

Deno.test("geometry, layer, and the keyframe interval each force a keyframe; idle screens stay unpainted", () => {
  const { io, clock, painter } = painterFor();
  const kinds: string[] = [];
  const paint = (value: string, layer?: string): void => {
    const painted = painter.paint({
      frame: value,
      size,
      ...(layer === undefined ? {} : { layer }),
    });
    kinds.push(painted.status === "painted" ? painted.kind : painted.status);
  };
  paint(first);
  paint(moved);
  paint(moved, "sheet");
  paint(first, "sheet");
  clock.advance(DEFAULT_TERMINAL_PAINT_OPTIONS.keyframeEveryMs);
  paint(first, "sheet");
  paint(moved, "sheet");
  paint(first, "sheet");
  assertEquals(kinds, [
    "keyframe",
    "rows",
    "keyframe",
    "rows",
    "unchanged",
    "keyframe",
    "rows",
  ]);
  io.resize(12, 5);
  const taller = `${first}\n${" ".repeat(12)}`;
  const resized = painter.paint({
    frame: taller,
    size: { columns: 12, rows: 5 },
    layer: "sheet",
  });
  assertEquals(resized.status === "painted" && resized.kind, "keyframe");
  assertEquals(
    settledTerminalFrame(io.output(), { columns: 12, rows: 5 }),
    taller,
  );
});

Deno.test("paint options remove synchronization or diffing without changing the settled frame", () => {
  for (
    const options of [
      { synchronized: false },
      { rowDiff: false },
      { synchronized: false, rowDiff: false },
    ] as const
  ) {
    const { io, painter } = painterFor(options);
    painter.paint({ frame: first, size });
    const painted = painter.paint({ frame: moved, size });
    assertEquals(
      painted.status === "painted" && painted.kind,
      options.rowDiff === false ? "keyframe" : "rows",
    );
    assertEquals(
      io.writes.every((write) => write.startsWith(BEGIN_SYNCHRONIZED_UPDATE)),
      options.synchronized !== false,
    );
    assertEquals(settledTerminalFrame(io.output(), size), moved);
  }
  assertThrows(
    () => terminalPaintOptions({ keyframeEveryMs: 0 }),
    TypeError,
    "keyframe interval",
  );
  assertThrows(
    () => terminalPaintOptions({ keyframeEveryMs: Number.NaN }),
    TypeError,
  );
});

Deno.test("every written row is validated before anything reaches the terminal", () => {
  for (
    const invalid of [
      frame("Title", "\x1b[1mopen", "  two", "Footer"),
      frame("Title", `${"x".repeat(13)}`, "  two", "Footer"),
      frame("Title", "two rows"),
    ]
  ) {
    const fresh = painterFor();
    assertThrows(
      () => fresh.painter.paint({ frame: invalid, size }),
      TypeError,
    );
    assertEquals(fresh.io.writes, []);
    const diffed = painterFor();
    diffed.painter.paint({ frame: first, size });
    assertThrows(
      () => diffed.painter.paint({ frame: invalid, size }),
      TypeError,
    );
    assertEquals(diffed.io.writes.length, 1);
  }
});

Deno.test("a frame rendered for stale geometry is refused without writing", () => {
  const { io, painter } = painterFor();
  io.resize(20, 4);
  assertEquals(painter.paint({ frame: first, size }), { status: "resized" });
  assertEquals(io.writes, []);
});

Deno.test("a failed write leaves the screen unknown, so the next paint is a keyframe", () => {
  let failing = true;
  class FlakyIO extends FakeTerminalIO {
    override write(value: string): void {
      if (failing && value.includes(terminalRowCursor(2))) {
        throw new Error("write failed");
      }
      super.write(value);
    }
  }
  const io = new FlakyIO([], size);
  const painter = new TerminalScreenPainter(io, () => 0);
  painter.paint({ frame: first, size });
  assertThrows(() => painter.paint({ frame: moved, size }), Error);
  failing = false;
  const painted = painter.paint({ frame: moved, size });
  assertEquals(painted.status === "painted" && painted.kind, "keyframe");
});

Deno.test("state reports lead their paint, and a changed report repaints alone", () => {
  const { io, painter } = painterFor();
  painter.paint({ frame: first, size, report: { selectedItemId: "one" } });
  assert(
    io.writes[0]!.startsWith(
      `${BEGIN_SYNCHRONIZED_UPDATE}${
        encodeTerminalStateReport({ selectedItemId: "one" })
      }${ERASE_TERMINAL_DISPLAY}`,
    ),
  );
  assertEquals(
    painter.paint({ frame: first, size, report: { selectedItemId: "one" } }),
    { status: "unchanged" },
  );
  const reported = painter.paint({
    frame: first,
    size,
    report: { selectedItemId: "two", zoomed: false },
  });
  assertEquals(reported.status === "painted" && reported.rows, 0);
  assertEquals(
    io.writes[1],
    `${BEGIN_SYNCHRONIZED_UPDATE}${
      encodeTerminalStateReport({ selectedItemId: "two", zoomed: false })
    }${END_SYNCHRONIZED_UPDATE}`,
  );
  const capture = captureTerminalFrame(io.output(), size);
  assertEquals(capture.frame, first);
  assertEquals(capture.state, { selectedItemId: "two", zoomed: false });
});

Deno.test("state reports carry only flat scalar fields and round-trip through the private OSC", () => {
  const report = {
    topLayerId: "sheet",
    focusedControlId: "confirm",
    listId: "items",
    selectedItemId: "a\x1b]b\u0007",
    zoomed: true,
    revision: 3,
  };
  const encoded = encodeTerminalStateReport({ ...report, absent: undefined });
  assert(encoded.startsWith(TERMINAL_STATE_REPORT_PREFIX));
  assert(encoded.endsWith("\x1b\\"));
  const payload = encoded.slice(TERMINAL_STATE_REPORT_PREFIX.length, -2);
  assert(
    !payload.includes("\x07") && !payload.includes("\x1b"),
    "controls are escaped inside JSON",
  );
  assertEquals(decodeTerminalStateReport(payload), report);
  for (const invalid of ["[]", "null", "{", '{"nested":{}}', '{"n":null}']) {
    assertThrows(() => decodeTerminalStateReport(invalid), TypeError);
  }
  assertThrows(
    () => encodeTerminalStateReport({ count: Number.POSITIVE_INFINITY }),
    TypeError,
  );
});
