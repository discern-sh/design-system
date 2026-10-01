import { assertEquals, assertThrows } from "@std/assert";
import { styleText } from "../../src/cli/ansi.ts";
import {
  BEGIN_SYNCHRONIZED_UPDATE,
  END_SYNCHRONIZED_UPDATE,
  ERASE_TERMINAL_DISPLAY,
  ERASE_TERMINAL_LINE,
  HOME_TERMINAL_CURSOR,
  type TerminalPaintOptions,
  terminalRowCursor,
  TerminalScreenPainter,
} from "../../src/cli/interactive/painter.ts";
import { replayTerminalFrame } from "../../src/cli/interactive/replay-testing.ts";
import { encodeTerminalStateReport } from "../../src/cli/interactive/state-report.ts";
import {
  captureTerminalFrame,
  FakeTerminalIO,
  ManualTerminalClock,
  settledTerminalFrame,
} from "../../src/cli/interactive/testing.ts";

const size = { columns: 10, rows: 3 };
const caps = {
  colorDepth: "truecolor" as const,
  columns: size.columns,
  unicode: true,
};

/** Deterministic pseudo-random sequence, so the property run is reproducible. */
function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

function row(next: () => number, columns: number): string {
  const words = ["one", "two", "◐", "✓", "→ x", "go"];
  const text = `${words[Math.floor(next() * words.length)]} ${
    Math.floor(next() * 100)
  }`.padEnd(columns).slice(0, columns);
  return next() < 0.5 ? styleText(text, { bold: true }, caps) : text;
}

Deno.test("every painter output replays to the latest frame under every paint option", () => {
  const options: readonly Partial<TerminalPaintOptions>[] = [
    {},
    { synchronized: false },
    { rowDiff: false },
    { synchronized: false, rowDiff: false },
    { keyframeEveryMs: 1 },
  ];
  for (const [optionIndex, option] of options.entries()) {
    for (let seed = 1; seed <= 25; seed += 1) {
      const next = random(seed * 31 + optionIndex);
      const io = new FakeTerminalIO([], size);
      const clock = new ManualTerminalClock();
      const painter = new TerminalScreenPainter(io, () => clock.now(), option);
      let current = { ...size };
      let rows = Array.from({ length: current.rows }, () => " ".repeat(10));
      for (let paint = 0; paint < 30; paint += 1) {
        clock.advance(Math.floor(next() * 3));
        if (next() < 0.1) {
          current = { columns: 10, rows: 2 + Math.floor(next() * 3) };
          io.resize(current.columns, current.rows);
          rows = Array.from({ length: current.rows }, () => row(next, 10));
        } else {
          rows = rows.map((value) => next() < 0.3 ? row(next, 10) : value);
        }
        const report = next() < 0.5 ? { selectedItemId: `item-${paint}` } : {};
        painter.paint({
          frame: rows.join("\n"),
          size: current,
          ...(next() < 0.2 ? { layer: `layer-${paint % 2}` } : {}),
          report,
        });
        const transcript = io.output();
        const replayed = replayTerminalFrame(transcript, current);
        assertEquals(replayed.frame, rows.join("\n"));
        assertEquals(replayed.state, report);
        assertEquals(replayed.end, transcript.length);
        // A PTY may expand LF into CR LF; the settled frame must not change.
        assertEquals(
          replayTerminalFrame(transcript.replaceAll("\n", "\r\n"), current)
            .frame,
          rows.join("\n"),
        );
      }
    }
  }
});

const blank = " ".repeat(10);
const rows = ["Title     ", "> one     ", "Footer    "];
const keyframe =
  `${BEGIN_SYNCHRONIZED_UPDATE}${ERASE_TERMINAL_DISPLAY}${HOME_TERMINAL_CURSOR}${
    rows.join("\r\n")
  }${END_SYNCHRONIZED_UPDATE}`;
const rowWrite = (index: number, value: string): string =>
  `${terminalRowCursor(index)}${ERASE_TERMINAL_LINE}${value}`;
const diff = (index: number, value: string): string =>
  `${BEGIN_SYNCHRONIZED_UPDATE}${
    rowWrite(index, value)
  }${END_SYNCHRONIZED_UPDATE}`;

Deno.test("an update still in flight leaves the previous settled frame", () => {
  const settled = keyframe + diff(2, "> two     ");
  const expected = ["Title     ", "> two     ", "Footer    "].join("\n");
  assertEquals(settledTerminalFrame(settled, size), expected);
  const inFlight = `${settled}${BEGIN_SYNCHRONIZED_UPDATE}${
    rowWrite(2, "> thr")
  }`;
  assertEquals(settledTerminalFrame(inFlight, size), expected);
  const keyframeInFlight =
    `${settled}${BEGIN_SYNCHRONIZED_UPDATE}${ERASE_TERMINAL_DISPLAY}${HOME_TERMINAL_CURSOR}Tit`;
  assertEquals(settledTerminalFrame(keyframeInFlight, size), expected);
  assertThrows(
    () =>
      settledTerminalFrame(
        `${BEGIN_SYNCHRONIZED_UPDATE}${ERASE_TERMINAL_DISPLAY}${HOME_TERMINAL_CURSOR}Tit`,
        size,
      ),
    TypeError,
    "no complete keyframe",
  );
});

Deno.test("capture requires a paint after the requested offset and returns its report", () => {
  const reported = `${BEGIN_SYNCHRONIZED_UPDATE}${
    encodeTerminalStateReport({ listId: "items", selectedItemId: "one" })
  }${keyframe.slice(BEGIN_SYNCHRONIZED_UPDATE.length)}`;
  const transcript = `earlier output${reported}`;
  const capture = captureTerminalFrame(transcript, size);
  assertEquals(capture.state, { listId: "items", selectedItemId: "one" });
  assertEquals(capture.text, rows.join("\n"));
  assertEquals(
    captureTerminalFrame(transcript, size, { paintedAfter: 3 }).frame,
    rows.join("\n"),
  );
  assertThrows(
    () =>
      captureTerminalFrame(transcript, size, {
        paintedAfter: transcript.length,
      }),
    TypeError,
    "not after",
  );
  const later = transcript + diff(2, "> two     ");
  assertEquals(
    captureTerminalFrame(later, size, { paintedAfter: transcript.length })
      .text.split("\n")[1],
    "> two     ",
  );
});

Deno.test("restoration ends the session; a later session replays from its own keyframe", () => {
  const child = "\x1b[?25h\x1b[?1049lchild output\r\nmore\r\n";
  assertEquals(
    settledTerminalFrame(keyframe + diff(1, "Changed   ") + child, size)
      .split("\n")[0],
    "Changed   ",
  );
  const resumed = `${keyframe}${child}\x1b[?1049h\x1b[?25l${
    keyframe.replace("Title     ", "Resumed   ")
  }${diff(3, "Done      ")}`;
  assertEquals(
    settledTerminalFrame(resumed, size),
    ["Resumed   ", "> one     ", "Done      "].join("\n"),
  );
});

Deno.test("replay rejects every byte outside the paint grammar", () => {
  const invalid: readonly (readonly [string, string])[] = [
    ["cursor movement in a row", keyframe + diff(2, "\x1b[3Aone      ")],
    ["relative cursor control", `${keyframe}\x1b[2A`],
    ["stray text after a paint", `${keyframe}stray`],
    ["a row below the viewport", keyframe + diff(4, blank)],
    ["row zero", keyframe + diff(0, blank)],
    ["a row write without erase", `${keyframe}\x1b[2;1Hrow       `],
    ["a column other than the first", `${keyframe}\x1b[2;3H\x1b[2Krow`],
    [
      "a nested synchronized update",
      `${keyframe}${BEGIN_SYNCHRONIZED_UPDATE}${BEGIN_SYNCHRONIZED_UPDATE}`,
    ],
    ["an update without a paint", `${keyframe}${END_SYNCHRONIZED_UPDATE}`],
    ["a line break in a row write", keyframe + diff(2, "one\r\ntwo")],
    [
      "too many keyframe rows",
      `${ERASE_TERMINAL_DISPLAY}${HOME_TERMINAL_CURSOR}${
        [...rows, blank].join("\r\n")
      }`,
    ],
    ["too few keyframe rows", `${keyframe}`.replace("\r\nFooter    ", "")],
    ["a row narrower than the viewport", keyframe + diff(2, "short")],
    ["an open style", keyframe + diff(2, "\x1b[1mopen      ")],
    ["a tab inside a row", keyframe + diff(2, "one\ttwo   ")],
    ["a carriage return inside a row", keyframe + diff(2, "one\rtwo   ")],
    [
      "a malformed report",
      keyframe +
      `${BEGIN_SYNCHRONIZED_UPDATE}\x1b]7719;{nope\x1b\\${END_SYNCHRONIZED_UPDATE}`,
    ],
  ];
  for (const [name, transcript] of invalid) {
    assertThrows(
      () => settledTerminalFrame(transcript, size),
      TypeError,
      undefined,
      name,
    );
  }
});
