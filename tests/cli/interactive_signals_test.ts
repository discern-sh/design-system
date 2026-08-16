import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  withDeterminateProgress,
  withSpinner,
} from "../../src/cli/interactive/activity.ts";
import { requestText } from "../../src/cli/interactive/basic-requests.ts";
import { InteractionCancelled } from "../../src/cli/interactive/errors.ts";
import {
  DISABLE_TERMINAL_MOUSE_BUTTON_TRACKING,
  DISABLE_TERMINAL_MOUSE_SGR_MODE,
  ENABLE_TERMINAL_MOUSE_BUTTON_TRACKING,
  ENABLE_TERMINAL_MOUSE_SGR_MODE,
  ENTER_TERMINAL_ALTERNATE_SCREEN,
  HIDE_TERMINAL_CURSOR,
  LEAVE_TERMINAL_ALTERNATE_SCREEN,
  SHOW_TERMINAL_CURSOR,
  withHiddenTerminalCursor,
  withRawTerminal,
} from "../../src/cli/interactive/lifecycle.ts";
import { denoTerminalSignals } from "../../src/cli/interactive/signals.ts";
import {
  FakeSignalSource,
  FakeTerminalIO,
} from "../../src/cli/interactive/testing.ts";

async function until(condition: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("condition never held");
}

Deno.test("SIGINT during a raw bracket restores raw mode and cursor before re-raising", async () => {
  const io = new FakeTerminalIO([], { columns: 40 });
  const signals = new FakeSignalSource();
  const result = await withRawTerminal(io, () => {
    assertEquals(signals.listenerCount, 1);
    signals.deliver();
    assertEquals(signals.raised, 1);
    assertEquals(io.rawTransitions, [true, false]);
    assertEquals(io.writes, [HIDE_TERMINAL_CURSOR, SHOW_TERMINAL_CURSOR]);
    assertEquals(signals.listenerCount, 0);
    return "survived";
  }, { signals });
  assertEquals(result, "survived");
  assertEquals(
    io.rawTransitions,
    [true, false],
    "restoration must stay single",
  );
  assertEquals(io.writes, [HIDE_TERMINAL_CURSOR, SHOW_TERMINAL_CURSOR]);
});

Deno.test("a pre-existing host listener survives the bracket and its delivery", async () => {
  const signals = new FakeSignalSource();
  let hostDeliveries = 0;
  const unsubscribeHost = signals.listen(() => {
    hostDeliveries += 1;
  });
  const io = new FakeTerminalIO([], { columns: 40 });
  await withHiddenTerminalCursor(io, () => {
    assertEquals(signals.listenerCount, 2);
    signals.deliver();
    return "done";
  }, { signals });
  assertEquals(hostDeliveries, 1);
  assertEquals(
    signals.listenerCount,
    1,
    "the host listener must survive the bracket",
  );
  assertEquals(signals.raised, 1);
  unsubscribeHost();
  assertEquals(signals.listenerCount, 0);
});

Deno.test("onInterrupt takes the signal instead of restore-and-re-raise", async () => {
  const io = new FakeTerminalIO([], { columns: 40 });
  const signals = new FakeSignalSource();
  let interrupts = 0;
  let cancel: () => void = () => {};
  const cancelled = new Promise<never>((_, reject) => {
    cancel = () => reject(new Error("operation cancelled"));
  });
  await assertRejects(
    () =>
      withRawTerminal(io, async () => {
        signals.deliver();
        assertEquals(interrupts, 1);
        assertEquals(io.rawTransitions, [true]);
        assertEquals(io.writes, [HIDE_TERMINAL_CURSOR]);
        assertEquals(signals.raised, 0);
        return await cancelled;
      }, {
        signals,
        onInterrupt: () => {
          interrupts += 1;
          cancel();
        },
      }),
    Error,
    "operation cancelled",
  );
  assertEquals(signals.raised, 0);
  assertEquals(io.rawTransitions, [true, false]);
  assertEquals(io.writes, [HIDE_TERMINAL_CURSOR, SHOW_TERMINAL_CURSOR]);
  assertEquals(signals.listenerCount, 0);
});

Deno.test("onSignalRestore runs before terminal restoration on the default path", async () => {
  const io = new FakeTerminalIO([], { columns: 40 });
  const signals = new FakeSignalSource();
  await withRawTerminal(io, () => {
    signals.deliver();
    return undefined;
  }, {
    signals,
    onSignalRestore: () => io.write("frame-ended\n"),
  });
  assertEquals(io.writes, [
    HIDE_TERMINAL_CURSOR,
    "frame-ended\n",
    SHOW_TERMINAL_CURSOR,
  ]);
  assertEquals(io.rawTransitions, [true, false]);
  assertEquals(signals.raised, 1);
});

Deno.test("a failing caller restoration never blocks terminal restoration", async () => {
  const io = new FakeTerminalIO([], { columns: 40 });
  const signals = new FakeSignalSource();
  await withHiddenTerminalCursor(io, () => {
    signals.deliver();
    return 1;
  }, {
    signals,
    onSignalRestore: () => {
      throw new Error("caller cleanup failed");
    },
  });
  assertEquals(io.writes, [HIDE_TERMINAL_CURSOR, SHOW_TERMINAL_CURSOR]);
  assertEquals(signals.raised, 1);
});

Deno.test("withRawTerminal can hold raw mode without touching the cursor", async () => {
  const io = new FakeTerminalIO([], { columns: 40 });
  const signals = new FakeSignalSource();
  const value = await withRawTerminal(io, () => "sensed", {
    signals,
    hideCursor: false,
  });
  assertEquals(value, "sensed");
  assertEquals(io.writes, []);
  assertEquals(io.rawTransitions, [true, false]);
});

Deno.test("mouse tracking enters and restores in one exact terminal order", async () => {
  const io = new FakeTerminalIO([], { columns: 40 });
  const value = await withRawTerminal(io, () => "tracked", {
    alternateScreen: true,
    mouseTracking: true,
  });
  assertEquals(value, "tracked");
  assertEquals(io.rawTransitions, [true, false]);
  assertEquals(io.writes, [
    ENTER_TERMINAL_ALTERNATE_SCREEN,
    ENABLE_TERMINAL_MOUSE_BUTTON_TRACKING,
    ENABLE_TERMINAL_MOUSE_SGR_MODE,
    HIDE_TERMINAL_CURSOR,
    DISABLE_TERMINAL_MOUSE_SGR_MODE,
    DISABLE_TERMINAL_MOUSE_BUTTON_TRACKING,
    SHOW_TERMINAL_CURSOR,
    LEAVE_TERMINAL_ALTERNATE_SCREEN,
  ]);
});

Deno.test("an explicit mouse capability refusal leaves the keyboard bracket untouched", async () => {
  const io = new FakeTerminalIO([], {
    columns: 40,
    mouseTracking: false,
  });
  await withRawTerminal(io, () => undefined, { mouseTracking: true });
  assertEquals(io.writes, [HIDE_TERMINAL_CURSOR, SHOW_TERMINAL_CURSOR]);
  assertEquals(io.rawTransitions, [true, false]);
});

Deno.test("partial mouse entry cleans only completed modes and preserves the entry error", async () => {
  const entryError = new Error("SGR mouse enable failed");
  class PartialMouseFailure extends FakeTerminalIO {
    override write(value: string): void {
      if (value === ENABLE_TERMINAL_MOUSE_SGR_MODE) throw entryError;
      if (value === DISABLE_TERMINAL_MOUSE_BUTTON_TRACKING) {
        throw new Error("button cleanup failed");
      }
      super.write(value);
    }
  }
  const io = new PartialMouseFailure([], { columns: 40 });
  assertEquals(
    await withRawTerminal(io, () => undefined, {
      alternateScreen: true,
      mouseTracking: true,
    }).catch((error) => error),
    entryError,
  );
  assertEquals(io.writes, [
    ENTER_TERMINAL_ALTERNATE_SCREEN,
    ENABLE_TERMINAL_MOUSE_BUTTON_TRACKING,
    LEAVE_TERMINAL_ALTERNATE_SCREEN,
  ]);
  assertEquals(io.rawTransitions, [true, false]);
});

Deno.test("a cursor-free raw bracket restores only raw mode under SIGINT", async () => {
  const io = new FakeTerminalIO([], { columns: 40 });
  const signals = new FakeSignalSource();
  await withRawTerminal(io, () => {
    signals.deliver();
    return 0;
  }, { signals, hideCursor: false });
  assertEquals(io.writes, []);
  assertEquals(io.rawTransitions, [true, false]);
  assertEquals(signals.raised, 1);
});

Deno.test("FakeSignalSource listeners unsubscribe idempotently and deliver in order", () => {
  const signals = new FakeSignalSource();
  const order: string[] = [];
  const first = signals.listen(() => order.push("first"));
  const second = signals.listen(() => order.push("second"));
  signals.deliver();
  assertEquals(order, ["first", "second"]);
  first();
  first();
  assertEquals(signals.listenerCount, 1);
  signals.deliver();
  assertEquals(order, ["first", "second", "second"]);
  second();
  assertEquals(signals.listenerCount, 0);
  signals.deliver();
  assertEquals(order, ["first", "second", "second"]);
  assertEquals(signals.raised, 0);
});

Deno.test("an injected SIGINT mid-spinner clears the frame and restores the cursor", async () => {
  const io = new FakeTerminalIO([], { columns: 24 });
  const signals = new FakeSignalSource();
  let stopped = 0;
  const result = await withSpinner({
    label: "Weave",
    io,
    signals,
    scheduler: {
      repeat() {
        return () => {
          stopped += 1;
        };
      },
    },
  }, () => {
    signals.deliver();
    assertEquals(signals.raised, 1);
    assertEquals(stopped, 1, "the spinner animation must stop first");
    assertEquals(io.writes.at(-2), "\x1b[1G\x1b[J", "the frame must clear");
    assertEquals(io.writes.at(-1), SHOW_TERMINAL_CURSOR);
    return "spun";
  });
  assertEquals(result, "spun");
  assertEquals(
    io.writes.filter((write) => write === SHOW_TERMINAL_CURSOR).length,
    1,
    "restoration must run exactly once",
  );
  assertEquals(stopped, 2, "the normal path re-stops idempotently");
});

Deno.test("an injected SIGINT mid-progress clears the incomplete frame first", async () => {
  const io = new FakeTerminalIO([], { columns: 20 });
  const signals = new FakeSignalSource();
  await withDeterminateProgress({
    label: "Work",
    total: 4,
    io,
    signals,
  }, (progress) => {
    progress.advance();
    signals.deliver();
    assertEquals(signals.raised, 1);
    assertEquals(io.writes.at(-2), "\x1b[1G\x1b[1A\x1b[J");
    assertEquals(io.writes.at(-1), SHOW_TERMINAL_CURSOR);
    return undefined;
  });
  assertEquals(
    io.writes.filter((write) => write === SHOW_TERMINAL_CURSOR).length,
    1,
  );
});

Deno.test("an externally delivered SIGINT mid-request cancels truthfully and restores", async () => {
  const io = new FakeTerminalIO([], { columns: 32, holdOpen: true });
  const signals = new FakeSignalSource();
  const pending = requestText({ label: "Name" }, { io, signals })
    .catch((error) => error);
  await until(() => io.writes.some((write) => write.includes("[active]")));
  signals.deliver();
  assertEquals(signals.raised, 1);
  assertEquals(io.rawTransitions, [true, false]);
  assertEquals(io.writes.at(-1), SHOW_TERMINAL_CURSOR);
  assert(io.output().includes("[cancelled]"));
  assert(io.output().includes("Cancelled."));
  io.close();
  const outcome = await pending;
  assert(outcome instanceof InteractionCancelled);
  assertEquals(
    io.writes.filter((write) => write === SHOW_TERMINAL_CURSOR).length,
    1,
    "the EOF path after the fake re-raise must not restore again",
  );
});

Deno.test("spinner onInterrupt cancels through the caller instead of dying", async () => {
  const io = new FakeTerminalIO([], { columns: 24 });
  const signals = new FakeSignalSource();
  let cancel: () => void = () => {};
  const cancelled = new Promise<never>((_, reject) => {
    cancel = () => reject(new InteractionCancelled("Interrupted."));
  });
  const outcome = await withSpinner({
    label: "Weave",
    io,
    signals,
    onInterrupt: () => cancel(),
    scheduler: { repeat: () => () => {} },
  }, async () => {
    signals.deliver();
    return await cancelled;
  }).catch((error) => error);
  assert(outcome instanceof InteractionCancelled);
  assertEquals(signals.raised, 0);
  assertEquals(io.writes.at(-1), SHOW_TERMINAL_CURSOR);
  assertEquals(
    io.writes.filter((write) => write === SHOW_TERMINAL_CURSOR).length,
    1,
  );
  assertEquals(signals.listenerCount, 0);
});

Deno.test("the Deno signal source installs and removes real listeners cleanly", () => {
  let calls = 0;
  const unsubscribe = denoTerminalSignals.listen(() => {
    calls += 1;
  });
  unsubscribe();
  unsubscribe();
  assertEquals(calls, 0);
});
