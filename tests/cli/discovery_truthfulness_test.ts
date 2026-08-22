import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import {
  type InteractionDelayScheduler,
  requestAutocomplete,
  requestSearch,
  requestSearchSelections,
} from "../../src/cli/interactive/mod.ts";
import type { InteractionEntry } from "../../src/cli/interactive/types.ts";
import { FakeTerminalIO } from "../../src/cli/interactive/testing.ts";

const choices = [
  { id: "one", label: "One", value: "one" },
  { id: "two", label: "Two", value: "two" },
] as const satisfies readonly InteractionEntry<string>[];

function paintedFrames(io: FakeTerminalIO): readonly string[] {
  return io.writes.flatMap((write) => {
    const eraseAt = write.indexOf("\x1b[J");
    const frame = write.startsWith("\x1b[1G") && eraseAt >= 0
      ? write.slice(eraseAt + "\x1b[J".length)
      : write;
    return /(?:┌|^\+-{3,}\+$)/mu.test(frame) ? [frame] : [];
  });
}

function lastFrame(io: FakeTerminalIO): string {
  return paintedFrames(io).at(-1) ?? "";
}

async function until(condition: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("condition never held");
}

interface DeferredCall {
  readonly query: string;
  readonly signal: AbortSignal;
  readonly resolve: (entries: readonly InteractionEntry<string>[]) => void;
  readonly reject: (error: unknown) => void;
}

function deferredProvider(): {
  readonly calls: DeferredCall[];
  readonly search: (
    query: string,
    signal: AbortSignal,
  ) => Promise<readonly InteractionEntry<string>[]>;
} {
  const calls: DeferredCall[] = [];
  return {
    calls,
    search: (query, signal) =>
      new Promise((resolve, reject) => {
        calls.push({ query, signal, resolve, reject });
      }),
  };
}

class ManualDelayScheduler implements InteractionDelayScheduler {
  readonly scheduled: Array<{
    readonly callback: () => void;
    readonly delayMs: number;
    cancelled: boolean;
  }> = [];

  delay(callback: () => void, delayMs: number): () => void {
    const entry = { callback, delayMs, cancelled: false };
    this.scheduled.push(entry);
    return () => {
      entry.cancelled = true;
    };
  }

  fireLast(): void {
    const entry = this.scheduled.at(-1);
    if (entry === undefined || entry.cancelled) {
      throw new Error("no live scheduled callback to fire");
    }
    entry.callback();
  }
}

Deno.test("a slow provider never delays the first frame and pending clears on resolution", async () => {
  const io = new FakeTerminalIO([], { columns: 40, holdOpen: true });
  const provider = deferredProvider();
  const request = requestSearch({
    label: "Slow",
    placeholder: "Type to search",
    search: provider.search,
  }, { io });
  await until(() => provider.calls.length === 1);
  assertStringIncludes(io.writes[1] ?? "", "[searching]");
  assertStringIncludes(io.writes[1] ?? "", "Searching…");
  assert(
    !(io.writes[1] ?? "").includes("No results."),
    "an unanswered query must never claim no results exist",
  );

  provider.calls[0]?.resolve(choices);
  await until(() => lastFrame(io).includes("One"));
  assertStringIncludes(lastFrame(io), "One");
  assert(!lastFrame(io).includes("Searching…"));

  io.enqueueKeys("enter", "enter");
  assertEquals(await request, "one");
  assertEquals(io.rawTransitions, [true, false]);
});

Deno.test("typing during provider flight stays live and discards superseded resolutions", async () => {
  const io = new FakeTerminalIO([], { columns: 40, holdOpen: true });
  const provider = deferredProvider();
  const request = requestSearch({
    label: "Fleet",
    search: provider.search,
  }, { io });
  await until(() => provider.calls.length === 1);

  io.enqueue("a");
  await until(() => provider.calls.length === 2);
  io.enqueue("b");
  await until(() => provider.calls.length === 3);
  assertEquals(
    provider.calls.map(({ query }) => query),
    ["", "a", "ab"],
    "an in-flight provider call must never block further edits",
  );
  assertStringIncludes(
    lastFrame(io),
    "ab▌",
    "the query editor must keep painting while a provider call is in flight",
  );
  assertStringIncludes(lastFrame(io), "[searching]");

  provider.calls[2]?.resolve([
    { id: "current", label: "CurrentRow", value: "current" },
  ]);
  await until(() => lastFrame(io).includes("CurrentRow"));
  provider.calls[1]?.resolve([
    { id: "stale", label: "StaleRow", value: "stale" },
  ]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert(
    !io.output().includes("StaleRow"),
    "a resolution superseded by a newer query must never paint",
  );
  assert(!lastFrame(io).includes("[searching]"));

  io.enqueueKeys("enter", "enter");
  assertEquals(await request, "current");
});

Deno.test("superseded and finished provider calls receive an abort signal", async () => {
  const io = new FakeTerminalIO([], { columns: 40, holdOpen: true });
  const provider = deferredProvider();
  const request = requestSearch({
    label: "Abort",
    search: provider.search,
  }, { io });
  await until(() => provider.calls.length === 1);
  assertEquals(provider.calls[0]?.signal.aborted, false);

  io.enqueue("x");
  await until(() => provider.calls.length === 2);
  assertEquals(
    provider.calls[0]?.signal.aborted,
    true,
    "a superseded provider call must be offered cancellation",
  );
  assertEquals(provider.calls[1]?.signal.aborted, false);

  io.enqueueKeys("escape");
  await assertRejects(() => request);
  assertEquals(
    provider.calls[1]?.signal.aborted,
    true,
    "ending the request must abort the in-flight provider call",
  );
  assertEquals(io.rawTransitions, [true, false]);
});

Deno.test("an abort-honouring provider's stale rejection never faults the request", async () => {
  const io = new FakeTerminalIO([], { columns: 40, holdOpen: true });
  const calls: DeferredCall[] = [];
  const request = requestSearch<string>({
    label: "Cancelling",
    search: (query, signal) =>
      new Promise((resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
        );
        calls.push({ query, signal, resolve, reject });
      }),
  }, { io });
  await until(() => calls.length === 1);
  io.enqueue("a");
  await until(() => calls.length === 2);

  calls[1]?.resolve([{ id: "kept", label: "Kept", value: "kept" }]);
  await until(() => lastFrame(io).includes("Kept"));
  io.enqueueKeys("enter", "enter");
  assertEquals(await request, "kept");
});

Deno.test("a failing provider faults the interaction with full restoration", async () => {
  const rejecting = new FakeTerminalIO([], { columns: 40, holdOpen: true });
  await assertRejects(
    () =>
      requestSearch({
        label: "Broken",
        search: () => Promise.reject(new Error("provider broke")),
      }, { io: rejecting }),
    Error,
    "provider broke",
  );
  assertEquals(rejecting.rawTransitions, [true, false]);

  const throwing = new FakeTerminalIO([], { columns: 40, holdOpen: true });
  await assertRejects(
    () =>
      requestSearch({
        label: "Invalid",
        search: () => [
          { id: "dup", label: "One", value: 1 },
          { id: "dup", label: "Two", value: 2 },
        ],
      }, { io: throwing }),
    TypeError,
    "repeated",
  );
  assertEquals(throwing.rawTransitions, [true, false]);
});

Deno.test("debounce coalesces rapid edits through the injectable scheduler", async () => {
  const io = new FakeTerminalIO([], { columns: 40, holdOpen: true });
  const scheduler = new ManualDelayScheduler();
  const seen: string[] = [];
  const request = requestSearch({
    label: "Paced",
    debounceMs: 150,
    scheduler,
    search: (query) => {
      seen.push(query);
      return choices.filter(({ label }) =>
        label.toLocaleLowerCase().includes(query.toLocaleLowerCase())
      );
    },
  }, { io });
  await until(() => seen.length === 1);
  assertEquals(seen, [""], "the initial provider call is not debounced");

  io.enqueue("t");
  await until(() => scheduler.scheduled.length === 1);
  io.enqueue("w");
  await until(() => scheduler.scheduled.length === 2);
  io.enqueue("o");
  await until(() => scheduler.scheduled.length === 3);
  assertEquals(seen, [""], "edits inside the debounce window issue no call");
  assertEquals(
    scheduler.scheduled.map(({ cancelled }) => cancelled),
    [true, true, false],
    "every restarted debounce window cancels the one before it",
  );
  assertEquals(scheduler.scheduled.map(({ delayMs }) => delayMs), [
    150,
    150,
    150,
  ]);
  assertStringIncludes(
    lastFrame(io),
    "[searching]",
    "the debounce window itself is pending truth",
  );

  scheduler.fireLast();
  assertEquals(seen, ["", "two"]);
  await until(() =>
    lastFrame(io).includes("Two") && !lastFrame(io).includes("[searching]")
  );
  io.enqueueKeys("enter", "enter");
  assertEquals(await request, "two");
});

Deno.test("an edit supersedes provider work before its debounce window elapses", async () => {
  const io = new FakeTerminalIO([], { columns: 40, holdOpen: true });
  const scheduler = new ManualDelayScheduler();
  const provider = deferredProvider();
  const request = requestSearch({
    label: "Paced race",
    debounceMs: 150,
    scheduler,
    search: provider.search,
  }, { io });
  await until(() => provider.calls.length === 1);

  io.enqueue("x");
  await until(() => scheduler.scheduled.length === 1);
  const abortedBeforeDelay = provider.calls[0]?.signal.aborted;
  provider.calls[0]?.resolve([
    { id: "stale", label: "StaleDuringDebounce", value: "stale" },
  ]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
  const stalePainted = io.output().includes("StaleDuringDebounce");
  const pendingStayedTrue = lastFrame(io).includes("[searching]");

  scheduler.fireLast();
  await until(() => provider.calls.length === 2);
  provider.calls[1]?.resolve([
    { id: "current", label: "CurrentAfterDebounce", value: "current" },
  ]);
  await until(() => lastFrame(io).includes("CurrentAfterDebounce"));
  io.enqueueKeys("enter", "enter");
  assertEquals(await request, "current");

  assertEquals(
    abortedBeforeDelay,
    true,
    "the query edit, not the later provider call, supersedes old work",
  );
  assertEquals(
    stalePainted,
    false,
    "a provider resolving inside the debounce window must never paint",
  );
  assertEquals(
    pendingStayedTrue,
    true,
    "stale settlement must not clear pending truth for the newer query",
  );
});

Deno.test("debounced autocomplete also rejects a stale in-flight suggestion", async () => {
  const io = new FakeTerminalIO([], { columns: 40, holdOpen: true });
  const scheduler = new ManualDelayScheduler();
  const calls: Array<{
    readonly query: string;
    readonly signal: AbortSignal;
    readonly resolve: (suggestions: readonly string[]) => void;
  }> = [];
  const request = requestAutocomplete({
    label: "Shell",
    debounceMs: 150,
    scheduler,
    suggestions: (query, signal) =>
      new Promise((resolve) => calls.push({ query, signal, resolve })),
  }, { io });
  await until(() => calls.length === 1);

  io.enqueue("s");
  await until(() => scheduler.scheduled.length === 1);
  const abortedBeforeDelay = calls[0]?.signal.aborted;
  calls[0]?.resolve(["staleghost"]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
  const stalePainted = io.output().includes("taleghost");

  scheduler.fireLast();
  await until(() => calls.length === 2);
  calls[1]?.resolve(["shell"]);
  await until(() => lastFrame(io).includes("s▌hell"));
  io.enqueueKeys("tab", "enter");
  assertEquals(await request, "shell");

  assertEquals(abortedBeforeDelay, true);
  assertEquals(
    stalePainted,
    false,
    "the shared provider authority must protect a different result shape",
  );
});

Deno.test("debounced search multiselection shares edit-time supersession", async () => {
  const io = new FakeTerminalIO([], { columns: 40, holdOpen: true });
  const scheduler = new ManualDelayScheduler();
  const provider = deferredProvider();
  const request = requestSearchSelections({
    label: "Tags",
    debounceMs: 150,
    scheduler,
    search: provider.search,
  }, { io });
  await until(() => provider.calls.length === 1);

  io.enqueue("x");
  await until(() => scheduler.scheduled.length === 1);
  const abortedBeforeDelay = provider.calls[0]?.signal.aborted;
  provider.calls[0]?.resolve([
    { id: "stale", label: "StaleMultiselect", value: "stale" },
  ]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
  const stalePainted = io.output().includes("StaleMultiselect");

  scheduler.fireLast();
  await until(() => provider.calls.length === 2);
  provider.calls[1]?.resolve([
    { id: "current", label: "CurrentMultiselect", value: "current" },
  ]);
  await until(() => lastFrame(io).includes("CurrentMultiselect"));
  io.enqueueKeys("escape");
  await assertRejects(() => request);

  assertEquals(abortedBeforeDelay, true);
  assertEquals(stalePainted, false);
});

Deno.test("autocomplete providers gain the same pending, discard, and pacing truth", async () => {
  const io = new FakeTerminalIO([], { columns: 40, holdOpen: true });
  const pending: Array<{
    readonly query: string;
    readonly resolve: (suggestions: readonly string[]) => void;
  }> = [];
  const request = requestAutocomplete({
    label: "Shell",
    suggestions: (query) =>
      new Promise((resolve) => {
        pending.push({ query, resolve });
      }),
  }, { io });
  await until(() => pending.length === 1);
  assertStringIncludes(io.writes[1] ?? "", "[searching]");

  io.enqueue("z");
  await until(() => pending.length === 2);
  assertStringIncludes(lastFrame(io), "z▌");

  pending[1]?.resolve(["zsh"]);
  await until(() => lastFrame(io).includes("z▌sh"));
  pending[0]?.resolve(["bash"]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert(
    !io.output().includes("bash"),
    "a superseded suggestion resolution must never paint",
  );
  assert(!lastFrame(io).includes("[searching]"));

  io.enqueueKeys("tab", "enter");
  assertEquals(await request, "zsh");
  assertEquals(io.rawTransitions, [true, false]);
});
