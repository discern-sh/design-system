import { assertEquals, assertRejects } from "@std/assert";
import {
  HIDE_TERMINAL_CURSOR,
  SHOW_TERMINAL_CURSOR,
  withHiddenTerminalCursor,
  withRawTerminal,
} from "../../src/cli/interactive/lifecycle.ts";
import { denoTerminalSignals } from "../../src/cli/interactive/signals.ts";
import {
  FakeSignalSource,
  FakeTerminalIO,
} from "../../src/cli/interactive/testing.ts";

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
  assertEquals(io.rawTransitions, [true, false], "restoration must stay single");
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

Deno.test("the Deno signal source installs and removes real listeners cleanly", () => {
  let calls = 0;
  const unsubscribe = denoTerminalSignals.listen(() => {
    calls += 1;
  });
  unsubscribe();
  unsubscribe();
  assertEquals(calls, 0);
});
