import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { stripAnsi } from "../../src/cli/mod.ts";
import {
  type ApplicationActivity,
  InteractionCancelled,
  nestTerminalApplication,
  runTerminalApplication,
  type TerminalApplicationCommand,
  type TerminalApplicationContext,
  type TerminalApplicationObservation,
  type TerminalApplicationOptions,
  type TerminalApplicationState,
  type TerminalApplicationView,
} from "../../src/cli/interactive/mod.ts";
import {
  encodeTerminalKeys,
  FakeTerminalIO,
  ManualTerminalClock,
  settledTerminalFrame,
} from "../../src/cli/interactive/testing.ts";
import { settle } from "../fixtures/application-session.ts";
import { testView } from "../fixtures/application-views.ts";

/** A small view for the nested application, whose `x` returns. */
function nestedView(title = "Nested"): TerminalApplicationView<string> {
  return {
    ...testView(["n1", "n2", "n3"], { body: "list" }),
    header: { leading: [{ text: title, role: "title" }] },
    footer: {
      left: [{ key: "enter", label: "Open" }],
      right: [{ key: "x", label: "Return" }],
    },
  };
}

interface NestedRun {
  readonly io: FakeTerminalIO;
  readonly running: Promise<TerminalApplicationState>;
  readonly exits: TerminalApplicationState[];
  readonly hostActions: string[];
  readonly nestedActions: string[];
  readonly observations: TerminalApplicationObservation[];
  readonly host: () => TerminalApplicationContext<string> | undefined;
  readonly text: () => string;
}

/** A host whose `m` opens a nested application, and whose `q` exits. */
async function nestedRun(
  nested: Partial<TerminalApplicationOptions<string>> = {},
  host: Partial<TerminalApplicationOptions<string>> = {},
): Promise<NestedRun> {
  const io = new FakeTerminalIO([], { holdOpen: true });
  const exits: TerminalApplicationState[] = [];
  const hostActions: string[] = [];
  const nestedActions: string[] = [];
  const observations: TerminalApplicationObservation[] = [];
  let hostContext: TerminalApplicationContext<string> | undefined;
  const running = runTerminalApplication<string>({
    view: testView(["a", "b", "c"]),
    ...host,
    keymap: [
      { key: "q", action: "quit" },
      { key: "m", action: "manual" },
      ...(host.keymap ?? []),
    ],
    start: (context) => {
      hostContext = context;
      return host.start?.(context);
    },
    onAction: (action, context, source): TerminalApplicationCommand | void => {
      hostActions.push(action);
      if (action === "quit") return { kind: "exit" };
      if (action === "manual") {
        return nestTerminalApplication<string>({
          view: nestedView(),
          ...nested,
          keymap: [{ key: "x", action: "return" }, ...(nested.keymap ?? [])],
          onAction: (inner, innerContext, innerSource) => {
            nestedActions.push(inner);
            if (inner === "return") return { kind: "exit" };
            return nested.onAction?.(inner, innerContext, innerSource);
          },
        }, (state) => exits.push(state));
      }
      return host.onAction?.(action, context, source);
    },
  }, {
    io,
    clock: new ManualTerminalClock(),
    observe: (observation) => observations.push(observation),
  });
  await settle();
  return {
    io,
    running,
    exits,
    hostActions,
    nestedActions,
    observations,
    host: () => hostContext,
    text: () => stripAnsi(settledTerminalFrame(io.output(), io.size())),
  };
}

Deno.test("a nested application runs on the same screen and returns to its opener", async () => {
  const run = await nestedRun();
  const down = encodeTerminalKeys("down");
  run.io.enqueue(down);
  await settle();
  assertEquals(run.host()?.state.lists.items?.selectedId, "b");
  run.io.enqueue("m");
  await settle();
  assertStringIncludes(run.text(), "Nested");
  const opened = run.io.output().length;
  run.io.enqueue(down + down);
  await settle();
  assertEquals(
    run.host()?.state.lists.items?.selectedId,
    "b",
    "keys reach the nested application, not its opener",
  );
  run.io.enqueue("x");
  await settle();
  assertEquals(run.exits.length, 1);
  assertEquals(run.exits[0]?.lists.items?.selectedId, "n3");
  assertStringIncludes(run.text(), "Studio");
  assert(
    !run.io.output().slice(opened).includes("\x1b[?1049l"),
    "the screen is never released while the nested application runs",
  );
  run.io.enqueue(down);
  await settle();
  assertEquals(
    run.host()?.state.lists.items?.selectedId,
    "c",
    "the opener resumes exactly where it was",
  );
  run.io.enqueue("q");
  const state = await run.running;
  run.io.close();
  assertEquals(state.lists.items?.selectedId, "c");
  assertEquals(run.nestedActions, ["return"]);
});

Deno.test("opening and closing a nested application each paint a keyframe", async () => {
  const run = await nestedRun();
  run.io.enqueue("m");
  await settle();
  run.io.enqueue("x");
  await settle();
  run.io.enqueue("q");
  await run.running;
  run.io.close();
  assertEquals(
    run.observations.filter((observation) => observation.paint === "keyframe")
      .length,
    3,
    "the first frame, the nested frame, and the frame back",
  );
});

Deno.test("an opener's reports wait while a nested application runs", async () => {
  const reports: string[] = [];
  let send: ((steps: ApplicationActivity) => void) | undefined;
  const run = await nestedRun({}, {
    keymap: [{ key: "b", action: "background" }],
    onAction: (action) =>
      action === "background"
        ? {
          kind: "background",
          id: "work",
          run: (report, signal) => {
            send = report;
            return new Promise<void>((resolve) =>
              signal.addEventListener("abort", () => resolve())
            );
          },
        }
        : undefined,
    onReport: (_id, steps) => reports.push(steps.steps[0]?.label ?? ""),
  });
  run.io.enqueue("b");
  await settle();
  run.io.enqueue("m");
  await settle();
  const step = (label: string): ApplicationActivity => ({
    startedAt: 0,
    steps: [{ id: "only", label, state: "active" }],
  });
  send?.(step("first"));
  send?.(step("second"));
  await settle();
  assertEquals(reports, [], "nothing reaches the opener while it is covered");
  run.io.enqueue("x");
  await settle();
  assertEquals(reports, ["second"], "the newest report arrives on return");
  run.io.enqueue("q");
  await run.running;
  run.io.close();
});

Deno.test("an unbound Ctrl+C in a nested application closes it and reaches the opener", async () => {
  const run = await nestedRun({}, {
    keymap: [{ key: "ctrl-c", action: "interrupted" }],
  });
  run.io.enqueue("m");
  await settle();
  run.io.enqueue("\x03");
  await settle();
  assertEquals(run.exits.length, 1, "the nested application closed");
  assertEquals(run.hostActions, ["manual", "interrupted"]);
  assertStringIncludes(run.text(), "Studio");
  run.io.enqueue("q");
  await run.running;
  run.io.close();
});

Deno.test("Ctrl+C with no binding anywhere cancels the whole session", async () => {
  const run = await nestedRun();
  run.io.enqueue("m");
  await settle();
  run.io.enqueue("\x03");
  await assertRejects(() => run.running, InteractionCancelled);
  run.io.close();
  assertEquals(run.exits.length, 1);
  assertEquals(run.io.rawTransitions.at(-1), false);
});

Deno.test("a nested application's foreground handoff returns to it", async () => {
  let ran = false;
  const run = await nestedRun({
    keymap: [{ key: "f", action: "foreground" }],
    onAction: (action) =>
      action === "foreground"
        ? {
          kind: "foreground",
          run: () => {
            ran = true;
          },
        }
        : undefined,
  });
  run.io.enqueue("m");
  await settle();
  run.io.enqueue("f");
  await settle();
  assert(ran);
  assertStringIncludes(run.text(), "Nested", "the nested application resumes");
  run.io.enqueue("xq");
  await run.running;
  run.io.close();
});

Deno.test("closing a nested application aborts its background work and its subscription", async () => {
  let signal: AbortSignal | undefined;
  let cleaned = false;
  const run = await nestedRun({
    keymap: [{ key: "b", action: "background" }],
    start: () => () => {
      cleaned = true;
    },
    onAction: (action) =>
      action === "background"
        ? {
          kind: "background",
          id: "work",
          run: (_report, aborted) => {
            signal = aborted;
            return new Promise<void>((resolve) =>
              aborted.addEventListener("abort", () => resolve())
            );
          },
        }
        : undefined,
  });
  run.io.enqueue("m");
  await settle();
  run.io.enqueue("b");
  await settle();
  assertEquals(signal?.aborted, false);
  run.io.enqueue("x");
  await settle();
  assertEquals(signal?.aborted, true);
  assert(cleaned, "the nested application's start cleanup ran");
  run.io.enqueue("q");
  await run.running;
  run.io.close();
});

Deno.test("a nested exit with an epilogue fails the session", async () => {
  const run = await nestedRun({
    keymap: [{ key: "e", action: "epilogue" }],
    onAction: (action) =>
      action === "epilogue" ? { kind: "exit", epilogue: ["Done"] } : undefined,
  });
  run.io.enqueue("m");
  await settle();
  run.io.enqueue("e");
  await assertRejects(() => run.running, TypeError, "no epilogue");
  run.io.close();
});

Deno.test("a nested view that breaks a rule fails the action that returned it", () => {
  assertThrows(
    () =>
      nestTerminalApplication<string>({
        view: {
          ...nestedView(),
          footer: { left: [{ key: "z", label: "Nothing" }] },
        },
      }),
    TypeError,
  );
});
