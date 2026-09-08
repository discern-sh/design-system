import { assertEquals, assertRejects } from "@std/assert";
import {
  InteractionCancelled,
  withRawTerminal,
} from "../../src/cli/interactive/mod.ts";
import {
  FakeTerminalIO,
  observeTerminalIO,
} from "../../src/cli/interactive/testing.ts";
import {
  adoptTerminalRead,
  filterTerminalReads,
  parkTerminalChunk,
} from "../../src/cli/interactive/read-broker.ts";

const bytes = (value: string) => new TextEncoder().encode(value);
class CancellableTerminal extends FakeTerminalIO {
  pending: {
    resolve: (chunk: Uint8Array) => void;
    reject: (error: unknown) => void;
  } | undefined;
  readCount = 0;
  cancellations = 0;
  override read(): Promise<Uint8Array> {
    this.readCount++;
    if (this.pending !== undefined) throw new Error("parallel read");
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject };
    });
  }
  deliver(value: string): void {
    const pending = this.pending;
    if (pending === undefined) throw new Error("no read to deliver");
    this.pending = undefined;
    pending.resolve(bytes(value));
  }
  cancelRead(): boolean {
    const pending = this.pending;
    if (pending === undefined) return false;
    this.pending = undefined;
    this.cancellations++;
    pending.reject(new InteractionCancelled("Released."));
    return true;
  }
}
Deno.test("raw ownership cancels native input through observers and retains queued bytes and filters", async () => {
  const source = new CancellableTerminal();
  const io = observeTerminalIO(source, () => {});
  let cancelled: Promise<void> | undefined;
  let filtered = 0;
  await withRawTerminal(io, () => {
    const lease = adoptTerminalRead(io);
    cancelled = assertRejects(() => lease.result, InteractionCancelled).then(
      () => {},
    );
    filterTerminalReads(io, {
      transform: (chunk) => {
        filtered++;
        return { chunk, done: false };
      },
    });
    parkTerminalChunk(io, bytes("kept"));
  });
  assertEquals(source.cancellations, 1);
  await cancelled;
  assertEquals(source.rawTransitions, [true, false]);
  const buffered = adoptTerminalRead(io);
  assertEquals(await buffered.result, bytes("kept"));
  buffered.release();
  const resumed = adoptTerminalRead(io);
  source.deliver("next");
  assertEquals(await resumed.result, bytes("next"));
  resumed.release();
  assertEquals(source.readCount, 2);
  assertEquals(filtered, 2);
});
Deno.test("returning ownership preserves a deferred read that already delivered input", async () => {
  const io = new CancellableTerminal();
  await withRawTerminal(io, async () => {
    const read = adoptTerminalRead(io);
    read.defer();
    io.deliver("late");
    await read.result;
  });
  assertEquals(io.cancellations, 0);
  const resumed = adoptTerminalRead(io);
  assertEquals(await resumed.result, bytes("late"));
  resumed.release();
  assertEquals(io.readCount, 1);
});
Deno.test("a native cancellation fault still restores modes and preserves the operation failure", async () => {
  class FailingCancellation extends FakeTerminalIO {
    calls = 0;
    cancelRead(): boolean {
      this.calls++;
      throw new Error("cancel failed");
    }
  }
  const io = new FailingCancellation();
  const original = new Error("provider failed");
  const error = await assertRejects(() =>
    withRawTerminal(io, () => {
      throw original;
    })
  );
  assertEquals(error === original, true);
  assertEquals(io.calls, 1);
  assertEquals(io.rawTransitions, [true, false]);
});
