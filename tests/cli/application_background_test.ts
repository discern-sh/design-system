import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  type ActivitySteps,
  runTerminalApplication,
  type TerminalApplicationCommand,
  type TerminalApplicationCommandOutcome,
  type TerminalApplicationContext,
} from "../../src/cli/interactive/mod.ts";
import {
  FakeTerminalIO,
  ManualTerminalClock,
} from "../../src/cli/interactive/testing.ts";
import { applicationSession, settle } from "../fixtures/application-session.ts";
import { testView } from "../fixtures/application-views.ts";

function steps(label: string, state: "active" | "done"): ActivitySteps {
  return { startedAt: 0, steps: [{ id: "only", label, state }] };
}

/** A background operation the test drives step by step. */
function controlled() {
  let report: ((value: ActivitySteps) => void) | undefined;
  let signal: AbortSignal | undefined;
  let finish: (() => void) | undefined;
  let fail: ((error: unknown) => void) | undefined;
  const command: TerminalApplicationCommand = {
    kind: "background",
    id: "work",
    run: (send, aborted) => {
      report = send;
      signal = aborted;
      return new Promise<void>((resolve, reject) => {
        finish = resolve;
        fail = reject;
        aborted.addEventListener("abort", () => resolve());
      });
    },
  };
  return {
    command,
    report: (value: ActivitySteps) => report?.(value),
    signal: () => signal,
    finish: () => finish?.(),
    fail: (error: unknown) => fail?.(error),
  };
}

async function session(work: ReturnType<typeof controlled>) {
  const reports: string[] = [];
  const outcomes: TerminalApplicationCommandOutcome[] = [];
  let live: TerminalApplicationContext<string> | undefined;
  const handle = await applicationSession(testView(["a", "b"]), {
    options: {
      keymap: [
        { key: "b", action: "background" },
        { key: "f", action: "foreground" },
      ],
      start: (context) => {
        live = context;
      },
      onReport: (id, value) => {
        reports.push(`${id}:${value.steps[0]?.label ?? ""}`);
      },
      onCommandSettled: (_id, outcome) => {
        outcomes.push(outcome);
      },
    },
    onAction: (action) =>
      action === "background" ? work.command : action === "foreground"
        ? {
          kind: "foreground",
          run: () => work.report(steps("during", "active")),
        }
        : undefined,
  });
  return { ...handle, reports, outcomes, live: () => live };
}

Deno.test("a background command reports while the screen stays live and settles once", async () => {
  const work = controlled();
  const live = await session(work);
  live.io.enqueue("b");
  await settle();
  work.report(steps("first", "active"));
  work.report(steps("second", "active"));
  await settle();
  assertEquals(live.reports, ["work:second"], "reports coalesce to the newest");
  live.io.enqueue("j");
  await settle();
  work.finish();
  await settle();
  assertEquals(live.outcomes, [{ status: "completed" }]);
  await live.finish();
});

Deno.test("context.abort aborts one background command and reports it", async () => {
  const work = controlled();
  const live = await session(work);
  live.io.enqueue("b");
  await settle();
  live.live()?.abort("work");
  await settle();
  assertEquals(work.signal()?.aborted, true);
  assertEquals(live.outcomes, [{ status: "aborted" }]);
  live.live()?.abort("work");
  await live.finish();
});

Deno.test("a failing background command reports its error", async () => {
  const work = controlled();
  const live = await session(work);
  live.io.enqueue("b");
  await settle();
  const error = new Error("disk full");
  work.fail(error);
  await settle();
  assertEquals(live.outcomes, [{ status: "failed", error }]);
  await live.finish();
});

Deno.test("reports wait while a foreground operation owns the terminal", async () => {
  const work = controlled();
  const live = await session(work);
  live.io.enqueue("b");
  await settle();
  live.io.enqueue("f");
  await settle();
  assertEquals(
    live.reports,
    ["work:during"],
    "the report made during the handoff arrives once the screen returns",
  );
  await live.finish();
});

Deno.test("exit aborts background work and waits for it to settle", async () => {
  const work = controlled();
  const live = await session(work);
  live.io.enqueue("b");
  await settle();
  await live.finish();
  assertEquals(work.signal()?.aborted, true);
  assertEquals(live.outcomes, [], "nothing reaches the caller after the end");
});

Deno.test("a second background command with a running id fails the session", async () => {
  const work = controlled();
  const io = new FakeTerminalIO(["bb"], { holdOpen: true });
  const running = runTerminalApplication<string>({
    view: testView(["a"]),
    keymap: [{ key: "b", action: "background" }, { key: "q", action: "quit" }],
    onAction: (action) => action === "background" ? work.command : undefined,
  }, { io, clock: new ManualTerminalClock() });
  await assertRejects(() => running, TypeError, "already running");
  io.close();
  assert(work.signal()?.aborted === true, "the first is aborted at the end");
});
