import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  type SpinnerScheduler,
  withActivityLog,
} from "../../src/cli/interactive/activity.ts";
import {
  HIDE_TERMINAL_CURSOR,
  SHOW_TERMINAL_CURSOR,
} from "../../src/cli/interactive/lifecycle.ts";
import {
  assertStyledFrame,
  FakeSignalSource,
  FakeTerminalIO,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";
import { TEST_TERMINAL_MOTIF } from "./motif_fixture.ts";

class ManualScheduler implements SpinnerScheduler {
  #callback: (() => void) | undefined;
  stopped = 0;
  repeat(callback: () => void): () => void {
    this.#callback = callback;
    return () => {
      this.stopped += 1;
      this.#callback = undefined;
    };
  }
  tick(): void {
    this.#callback?.();
  }
}

function replacePrefix(previousLines: number): string {
  return `\x1b[1G\x1b[${previousLines - 1}A\x1b[J`;
}

Deno.test("a slow producer streams partial updates into committed exact frames", async () => {
  const io = new FakeTerminalIO([], { columns: 40, rows: 24 });
  const scheduler = new ManualScheduler();
  await withActivityLog(
    { label: "Weave styles", tailRows: 2, io, scheduler },
    (log) => {
      assertEquals(log.label, "Weave styles");
      log.append("alpha");
      scheduler.tick();
      log.updatePartial("beta grows");
      scheduler.tick();
      log.append("beta");
      scheduler.tick();
      log.finish();
    },
  );
  assertEquals(io.writes, [
    HIDE_TERMINAL_CURSOR,
    "◐ Weave styles\n└─│\n  │\n",
    `${replacePrefix(4)}◓ Weave styles\n└─│ alpha\n  │\n`,
    `${replacePrefix(4)}◑ Weave styles\n└─│ alpha\n  │ beta grows\n`,
    `${replacePrefix(4)}◒ Weave styles\n└─│ alpha\n  │ beta\n`,
    `${replacePrefix(4)}◮ Weave styles\n`,
    "\n",
    SHOW_TERMINAL_CURSOR,
  ]);
  assertEquals(scheduler.stopped, 1);
});

Deno.test("the activity driver carries a consumer motif through live and stable rows", async () => {
  const io = new FakeTerminalIO([], { columns: 40, rows: 24 });
  const scheduler = new ManualScheduler();
  await withActivityLog(
    {
      label: "Build styles",
      tailRows: 1,
      io,
      scheduler,
      motif: TEST_TERMINAL_MOTIF,
    },
    (log) => {
      log.pin("Context held", "note");
      log.append("one");
      scheduler.tick();
      log.finish();
    },
  );
  assertEquals(io.writes.slice(1), [
    "◴ Build styles\n└─│\n",
    `${replacePrefix(3)}◷ Build styles\n▸ Context held\n└─│ one\n`,
    `${replacePrefix(4)}◉ Build styles\n▸ Context held\n`,
    "\n",
    SHOW_TERMINAL_CURSOR,
  ]);
});

Deno.test("a fast producer coalesces into one repaint per tick showing the last rows", async () => {
  const io = new FakeTerminalIO([], { columns: 40, rows: 24 });
  const scheduler = new ManualScheduler();
  await withActivityLog(
    { label: "Weave styles", tailRows: 2, io, scheduler },
    (log) => {
      for (let line = 1; line <= 30; line += 1) log.append(`line ${line}`);
      scheduler.tick();
      log.finish();
    },
  );
  assertEquals(io.writes.length, 6);
  assertEquals(
    io.writes[2],
    `${replacePrefix(4)}◓ Weave styles\n└─│ line 29\n  │ line 30\n`,
  );
});

Deno.test("pinned stable lines persist while the tail scrolls beneath them", async () => {
  const io = new FakeTerminalIO([], { columns: 40, rows: 24 });
  const scheduler = new ManualScheduler();
  await withActivityLog(
    { label: "Run checks", tailRows: 2, io, scheduler },
    (log) => {
      log.append("fmt starting");
      scheduler.tick();
      log.pin("Format held", "success");
      log.append("lint starting");
      log.append("lint retried");
      scheduler.tick();
      log.pin("Lint warned once", "warning");
      log.append("tests starting");
      scheduler.tick();
      log.finish({ mode: "summary" });
    },
  );
  assertEquals(io.writes.slice(3), [
    `${
      replacePrefix(4)
    }◑ Run checks\n✓ Format held\n└─│ lint starting\n  │ lint retried\n`,
    `${
      replacePrefix(5)
    }◒ Run checks\n✓ Format held\n! Lint warned once\n└─│ lint retried\n  │ tests starting\n`,
    `${replacePrefix(6)}◮ Run checks\n✓ Format held\n! Lint warned once\n`,
    "\n",
    SHOW_TERMINAL_CURSOR,
  ]);
});

Deno.test("the result completion collapses the live frame to one toned line", async () => {
  const io = new FakeTerminalIO([], { columns: 40, rows: 24 });
  const scheduler = new ManualScheduler();
  await withActivityLog(
    { label: "Weave styles", tailRows: 2, io, scheduler },
    (log) => {
      log.append("alpha");
      scheduler.tick();
      log.finish({ mode: "result", tone: "success", text: "Styles woven" });
    },
  );
  assertEquals(io.writes.slice(3), [
    `${replacePrefix(4)}✓ Styles woven`,
    "\n",
    SHOW_TERMINAL_CURSOR,
  ]);
});

Deno.test("a viewport shrink strands the old region and refits; regrowth restores the request", async () => {
  const io = new FakeTerminalIO([], { columns: 40, rows: 10 });
  const scheduler = new ManualScheduler();
  await withActivityLog(
    { label: "Weave styles", tailRows: 6, io, scheduler },
    (log) => {
      log.append("alpha");
      io.resize(40, 5);
      scheduler.tick();
      io.resize(40, 24);
      scheduler.tick();
      log.finish();
    },
  );
  assertEquals(io.writes.slice(1), [
    "◐ Weave styles\n└─│\n  │\n  │\n  │\n  │\n  │\n",
    "\n",
    "◓ Weave styles\n└─│ alpha\n  │\n  │\n",
    `${replacePrefix(5)}◑ Weave styles\n└─│ alpha\n  │\n  │\n  │\n  │\n  │\n`,
    `${replacePrefix(8)}◮ Weave styles\n`,
    "\n",
    SHOW_TERMINAL_CURSOR,
  ]);
});

Deno.test("a viewport below the minimum frame degrades to the append-only feed", async () => {
  const io = new FakeTerminalIO([], { columns: 40, rows: 10 });
  const scheduler = new ManualScheduler();
  await withActivityLog(
    { label: "Weave styles", tailRows: 2, io, scheduler },
    (log) => {
      log.pin("Held before the squeeze", "success");
      scheduler.tick();
      io.resize(40, 2);
      log.pin("Pinned unseen", "note");
      scheduler.tick();
      log.append("after the switch");
      log.finish();
    },
  );
  assertEquals(scheduler.stopped, 2);
  assertEquals(io.writes.slice(3), [
    "\n",
    "▸ Pinned unseen\n",
    "│ after the switch\n",
    SHOW_TERMINAL_CURSOR,
  ]);
});

Deno.test("an injected SIGINT mid-stream leaves the stable summary and re-raises", async () => {
  const io = new FakeTerminalIO([], { columns: 40, rows: 24 });
  const signals = new FakeSignalSource();
  const scheduler = new ManualScheduler();
  const value = await withActivityLog(
    { label: "Weave styles", tailRows: 2, io, signals, scheduler },
    (log) => {
      log.pin("Format held", "success");
      log.append("lint running");
      log.updatePartial("half a line");
      scheduler.tick();
      signals.deliver();
      assertEquals(signals.raised, 1);
      assertEquals(scheduler.stopped, 1, "the animation must stop first");
      assertEquals(io.writes.slice(-3), [
        `${replacePrefix(5)}× Weave styles\n✓ Format held\nCancelled.`,
        "\n",
        SHOW_TERMINAL_CURSOR,
      ]);
      return "survived";
    },
  );
  assertEquals(value, "survived");
  assertEquals(
    io.writes.filter((write) => write === SHOW_TERMINAL_CURSOR).length,
    1,
    "restoration must run exactly once",
  );
});

Deno.test("a caller-supplied onInterrupt receives SIGINT instead of the summary path", async () => {
  const io = new FakeTerminalIO([], { columns: 40, rows: 24 });
  const signals = new FakeSignalSource();
  const scheduler = new ManualScheduler();
  let interrupted = 0;
  await withActivityLog({
    label: "Weave styles",
    tailRows: 2,
    io,
    signals,
    scheduler,
    onInterrupt: () => {
      interrupted += 1;
    },
  }, (log) => {
    log.append("alpha");
    signals.deliver();
    log.finish();
  });
  assertEquals(interrupted, 1);
  assertEquals(signals.raised, 0);
});

Deno.test("a non-interactive terminal renders the same feed append-only", async () => {
  const io = new FakeTerminalIO([], {
    columns: 40,
    interactive: false,
    ansiControl: false,
  });
  const scheduler = new ManualScheduler();
  await withActivityLog(
    { label: "Weave styles", tailRows: 2, io, scheduler, hint: "Live only." },
    (log) => {
      log.append("alpha");
      log.updatePartial("beta in progress");
      log.updatePartial("beta nearly done");
      log.append("beta");
      log.pin("Alpha held", "success");
      log.relabel("Publish styles");
      log.append("gamma");
      log.updatePartial("delta never committed");
      log.finish();
    },
  );
  assertEquals(io.writes, [
    "◮ WEAVE STYLES\n",
    "│ alpha\n",
    "│ beta\n",
    "✓ Alpha held\n",
    "◮ PUBLISH STYLES\n",
    "│ gamma\n",
    "│ delta never committed\n",
  ]);
  assertEquals(scheduler.stopped, 0, "no animation is ever scheduled");
});

Deno.test("a refused painter without ANSI control appends from the first fact", async () => {
  const io = new FakeTerminalIO([], { columns: 40, ansiControl: false });
  const scheduler = new ManualScheduler();
  await withActivityLog(
    { label: "Weave styles", tailRows: 2, io, scheduler },
    (log) => {
      log.append("alpha");
      log.finish({ mode: "result", tone: "note", text: "One fact out" });
    },
  );
  assertEquals(io.writes, [
    "◮ WEAVE STYLES\n",
    "│ alpha\n",
    "▸ One fact out\n",
  ]);
});

Deno.test("ASCII terminals keep the same journey in the fallback repertoire", async () => {
  const io = new FakeTerminalIO([], { columns: 40, rows: 24, unicode: false });
  const scheduler = new ManualScheduler();
  await withActivityLog(
    { label: "Weave styles", tailRows: 2, io, scheduler },
    (log) => {
      log.append("alpha");
      log.pin("Held", "success");
      scheduler.tick();
      log.finish();
    },
  );
  assertEquals(io.writes.slice(1), [
    "^ Weave styles\n`-|\n  |\n",
    `${replacePrefix(4)}< Weave styles\n+ Held\n\`-| alpha\n  |\n`,
    `${replacePrefix(5)}> Weave styles\n+ Held\n`,
    "\n",
    SHOW_TERMINAL_CURSOR,
  ]);
});

Deno.test("colour depth styles the same visible frame without moving a cell", async () => {
  const io = new FakeTerminalIO([], {
    columns: 40,
    rows: 24,
    colorDepth: "truecolor",
  });
  const scheduler = new ManualScheduler();
  await withActivityLog(
    { label: "Weave styles", tailRows: 2, io, scheduler },
    (log) => {
      log.append("alpha");
      log.pin("Held", "success");
      scheduler.tick();
      log.finish();
    },
  );
  const capabilities = testTerminalCapabilities({
    columns: 40,
    colorDepth: "truecolor",
  });
  assert(io.writes[2] !== undefined);
  assertStyledFrame(
    io.writes[2].slice(replacePrefix(4).length),
    "◓ Weave styles\n✓ Held\n└─│ alpha\n  │\n",
    capabilities,
  );
});

Deno.test("streamed text is sanitised to the display repertoire", async () => {
  const io = new FakeTerminalIO([], {
    columns: 60,
    interactive: false,
    ansiControl: false,
  });
  await withActivityLog({ label: "Ingest", tailRows: 2, io }, (log) => {
    log.append("\x1b[31mred\x1b[0m text");
    log.append("10%\r50%\r100%");
    log.append("progress done\r");
    log.append("a\tstop");
    log.append("zero​widthbell");
    log.append("keep \x1b7state");
    log.append("");
    log.finish();
  });
  assertEquals(io.writes.slice(1), [
    "│ red text\n",
    "│ 100%\n",
    "│ progress done\n",
    "│ a       stop\n",
    "│ zerowidthbell\n",
    "│ keep state\n",
    "│\n",
  ]);
});

Deno.test("producer misuse throws instead of corrupting the feed", async () => {
  const io = new FakeTerminalIO([], { columns: 40, interactive: false });
  await assertRejects(
    () =>
      withActivityLog({ label: "Misuse", io }, (log) => {
        log.append("two\nlines");
      }),
    TypeError,
    "one line at a time",
  );
  const finished = new FakeTerminalIO([], { columns: 40, interactive: false });
  await assertRejects(
    () =>
      withActivityLog({ label: "Misuse", io: finished }, (log) => {
        log.finish();
        log.append("late fact");
      }),
    TypeError,
    "has finished",
  );
  const doubled = new FakeTerminalIO([], { columns: 40, interactive: false });
  await assertRejects(
    () =>
      withActivityLog({ label: "Misuse", io: doubled }, (log) => {
        log.finish();
        log.finish();
      }),
    TypeError,
    "has finished",
  );
  const badPin = new FakeTerminalIO([], { columns: 40, interactive: false });
  await assertRejects(
    () =>
      withActivityLog({ label: "Misuse", io: badPin }, (log) => {
        log.pin("  padded  ", "success");
      }),
    TypeError,
    "trimmed",
  );
  await assertRejects(
    () => withActivityLog({ label: "Misuse", tailRows: 0, io }, () => {}),
    TypeError,
    "positive safe integer",
  );
});

Deno.test("an operation fault clears the incomplete live frame and rethrows", async () => {
  const io = new FakeTerminalIO([], { columns: 40, rows: 24 });
  const scheduler = new ManualScheduler();
  await assertRejects(
    () =>
      withActivityLog(
        { label: "Weave styles", tailRows: 2, io, scheduler },
        (log) => {
          log.append("alpha");
          scheduler.tick();
          throw new Error("provider fell over");
        },
      ),
    Error,
    "provider fell over",
  );
  assertEquals(io.writes.slice(-2), [
    "\x1b[1G\x1b[3A\x1b[J",
    SHOW_TERMINAL_CURSOR,
  ]);
  assertEquals(scheduler.stopped, 1);
});

Deno.test("relabel presents the new headline on the next tick", async () => {
  const io = new FakeTerminalIO([], { columns: 40, rows: 24 });
  const scheduler = new ManualScheduler();
  await withActivityLog(
    { label: "First name", tailRows: 2, io, scheduler },
    (log) => {
      scheduler.tick();
      log.relabel("Second name");
      assertEquals(log.label, "Second name");
      scheduler.tick();
      log.finish();
    },
  );
  assertEquals(
    io.writes[3],
    `${replacePrefix(4)}◑ Second name\n└─│\n  │\n`,
  );
});
