import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { stripAnsi } from "../../src/cli/mod.ts";
import {
  InteractionCancelled,
  runTerminalApplication,
  type TerminalApplicationCommand,
  type TerminalApplicationContext,
  type TerminalApplicationOptions,
  type TerminalApplicationView,
} from "../../src/cli/interactive/mod.ts";
import {
  captureTerminalFrame,
  FakeSignalSource,
  FakeTerminalIO,
} from "../../src/cli/interactive/testing.ts";
import {
  BEGIN_SYNCHRONIZED_UPDATE,
  ERASE_TERMINAL_DISPLAY,
} from "../../src/cli/interactive/painter.ts";
import { applicationSession, settle } from "../fixtures/application-session.ts";
import { testView } from "../fixtures/application-views.ts";

const quit = {
  keymap: [{ key: "q", action: "quit" }],
} as const;

/** A lone Escape decodes once the key reader's continuation window passes. */
async function pressEscape(io: FakeTerminalIO): Promise<void> {
  io.enqueueKeys("escape");
  await new Promise((resolve) => setTimeout(resolve, 150));
  await settle();
}

function exitOn(
  action: string,
): TerminalApplicationCommand | undefined {
  return action === "quit" ? { kind: "exit" } : undefined;
}

Deno.test("callbacks follow the package's own transition in a fixed order, and their updates apply before the next key", async () => {
  const calls: string[] = [];
  let view = testView(["a", "b"], {
    message: { id: "tip", runs: [{ text: "Tip" }], dismiss: { onKey: true } },
  });
  const io = new FakeTerminalIO(["\x1b[Bx\r", "q"]);
  await runTerminalApplication({
    view,
    keymap: [...quit.keymap, { key: "x", action: "retarget" }],
    onSelectionChange: (_list, item) => calls.push(`change:${item}`),
    onDismiss: (target, via, context) => {
      calls.push(`dismiss:${target.message}:${via}`);
      const { message: _message, ...rest } = view;
      view = rest;
      context.update(view);
    },
    onAction: (action, context, source) => {
      calls.push(`action:${action}:${source}`);
      if (action === "retarget") {
        // A content change made here governs the very next key.
        const body = view.body;
        if (body.kind !== "master-detail") throw new Error("unexpected body");
        const [group] = body.list.groups;
        if (group === undefined) throw new Error("no group");
        view = {
          ...view,
          body: {
            ...body,
            list: {
              ...body.list,
              groups: [{
                ...group,
                items: group.items.map((item) => ({
                  ...item,
                  primary: `changed:${item.id}`,
                })),
              }],
            },
          },
        };
        context.update(view);
      }
      return exitOn(action);
    },
  }, { io });
  assertEquals(calls, [
    "change:a",
    "change:b",
    "dismiss:tip:key",
    "action:retarget:key",
    "action:changed:b:enter",
    "action:quit:key",
  ]);
});

Deno.test("selection moves from asynchronous updates are reported, then the new selection", async () => {
  const calls: string[] = [];
  const live = await applicationSession(testView(["a", "b", "c"]), {
    options: {
      onSelectionMoved: (_list, item, move) =>
        calls.push(`moved:${item}:${JSON.stringify(move)}`),
      onSelectionChange: (_list, item) => calls.push(`change:${item}`),
    },
  });
  live.io.enqueueKeys("down");
  await settle();
  live.clock.advance(10_000);
  live.context().update(testView(["a", "c"]));
  await settle();
  assertEquals(calls, [
    "change:a",
    "change:b",
    'moved:b:{"kind":"removed","replacement":"c"}',
    "change:c",
  ]);
  assertEquals((await live.finish()).lists.items?.selectedId, "c");
});

Deno.test("bindings that collide with navigation, repeat, or type in a field throw before the terminal changes", async () => {
  const invalid: TerminalApplicationOptions<string>["keymap"][] = [
    [{ key: "enter", action: "x" }],
    [{ key: "/", action: "x" }],
    [{ key: "space", action: "x" }],
    [{ key: "shift+down", action: "x" }],
    [{ key: "n", action: "x" }, { key: "n", action: "y" }],
    [{ key: "a", action: "x", inFields: true }],
    [{ key: "ctrl+a", action: "x", inFields: true }],
    [{ key: "left", action: "x", inFields: true }],
    [{ key: "not a key", action: "x" }],
  ];
  for (const keymap of invalid) {
    const io = new FakeTerminalIO([]);
    await assertRejects(
      () =>
        runTerminalApplication({
          view: testView(),
          ...(keymap === undefined ? {} : { keymap }),
        }, { io }),
      TypeError,
    );
    assertEquals(io.writes, [], JSON.stringify(keymap));
    assertEquals(io.rawTransitions, []);
  }
  const vi = new FakeTerminalIO([]);
  await assertRejects(
    () =>
      runTerminalApplication({
        view: testView(),
        viKeys: true,
        keymap: [{ key: "j", action: "x" }],
      }, { io: vi }),
    TypeError,
  );
});

Deno.test("field bindings fire while the filter owns input; plain bindings wait", async () => {
  const actions: string[] = [];
  const io = new FakeTerminalIO(["/n\x0bk\rk", "q"]);
  const state = await runTerminalApplication({
    view: testView(["one", "two"], { filter: true }),
    keymap: [
      ...quit.keymap,
      { key: "ctrl+k", action: "palette", inFields: true },
      { key: "k", action: "plain" },
    ],
    onAction: (action) => {
      actions.push(action);
      return exitOn(action);
    },
  }, { io });
  assertEquals(actions, ["palette", "plain", "quit"]);
  assertEquals(state.lists.items?.filter, "nk");
});

Deno.test("Escape never exits; a bound Escape runs only when nothing else closes", async () => {
  const actions: string[] = [];
  const io = new FakeTerminalIO([], { holdOpen: true });
  const running = runTerminalApplication({
    view: testView(["a", "b"], { filter: true }),
    keymap: [...quit.keymap, { key: "escape", action: "back" }],
    onAction: (action) => {
      actions.push(action);
      return exitOn(action);
    },
  }, { io });
  await settle();
  io.enqueue("/a");
  await settle();
  await pressEscape(io);
  assertEquals(actions, [], "Escape cleared the filter");
  io.enqueue(" ");
  await settle();
  await pressEscape(io);
  assertEquals(actions, [], "Escape left zoom");
  await pressEscape(io);
  assertEquals(actions, ["back"]);
  io.enqueue("q");
  const state = await running;
  io.close();
  assertEquals(state.lists.items?.zoomed, false);
});

Deno.test("Ctrl+C cancels after restoration unless a binding claims it", async () => {
  const io = new FakeTerminalIO(["\x03"]);
  await assertRejects(
    () => runTerminalApplication({ view: testView() }, { io }),
    InteractionCancelled,
  );
  assertEquals(io.rawTransitions.at(-1), false);
  const bound = new FakeTerminalIO(["\x03"]);
  const actions: string[] = [];
  await runTerminalApplication({
    view: testView(),
    keymap: [{ key: "ctrl-c", action: "quit" }],
    onAction: (action) => {
      actions.push(action);
      return exitOn(action);
    },
  }, { io: bound });
  assertEquals(actions, ["quit"]);
});

Deno.test("foreground work prints its handoff after restoration and resumes the same place", async () => {
  const io = new FakeTerminalIO(["\x1b[B\x1b[B\r", "q"], { rows: 24 });
  let foreground = 0;
  let written = "";
  const state = await runTerminalApplication({
    view: testView(["a", "b", "c"]),
    ...quit,
    onAction: (action, context) => {
      if (action !== "open:c") return exitOn(action);
      return {
        kind: "foreground",
        handoff: [{ text: "Opening Item c · exit it to come back" }],
        run: () => {
          foreground++;
          written = io.output();
          assertEquals(io.rawTransitions.at(-1), false);
          assertEquals(io.resizeListenerCount, 0);
          assertEquals(context.state.lists.items?.selectedId, "c");
        },
      };
    },
  }, { io });
  assertEquals(foreground, 1);
  assert(
    written.indexOf("Opening Item c") > written.lastIndexOf("\x1b[?1049l"),
    "the handoff line follows the released screen",
  );
  assertEquals(io.rawTransitions, [true, false, true, false]);
  assertEquals(state.lists.items?.selectedId, "c");
  assertEquals(io.resizeListenerCount, 0);
});

Deno.test("an exit command prints its epilogue after the screen is released", async () => {
  const io = new FakeTerminalIO(["q"]);
  await runTerminalApplication({
    view: testView(),
    ...quit,
    onAction: () => ({ kind: "exit", epilogue: ["Ran 2 jobs", "Done"] }),
  }, { io });
  const output = io.output();
  assert(
    output.endsWith("Ran 2 jobs\nDone\n"),
    JSON.stringify(output.slice(-40)),
  );
  assert(output.indexOf("Ran 2 jobs") > output.lastIndexOf("\x1b[?1049l"));
});

Deno.test("an action returning anything but a command fails after restoration", async () => {
  const io = new FakeTerminalIO(["\r"]);
  await assertRejects(
    () =>
      runTerminalApplication({
        view: testView(),
        onAction: () => ({ kind: "handled" }) as never,
      }, { io }),
    TypeError,
    "foreground or exit",
  );
  assertEquals(io.rawTransitions.at(-1), false);
});

Deno.test("callbacks that never settle fail instead of spinning", async () => {
  const io = new FakeTerminalIO([], { holdOpen: true });
  const failure = runTerminalApplication({
    view: testView(["a", "b"]),
    onSelectionChange: (list, item, context) => {
      context.select(list, item === "a" ? "b" : "a");
    },
  }, { io }).catch((error) => error);
  const error = await failure;
  io.close();
  assert(error instanceof TypeError, String(error));
  assertStringIncludes(error.message, "did not settle");
  assertEquals(io.rawTransitions.at(-1), false);
});

Deno.test("background updates coalesce while input stays in order, without restarting providers", async () => {
  const io = new FakeTerminalIO([], { holdOpen: true });
  let context: TerminalApplicationContext<string> | undefined;
  let starts = 0, stops = 0;
  const running = runTerminalApplication({
    view: testView(),
    ...quit,
    onAction: exitOn,
    start: (live) => {
      context = live;
      starts++;
      return () => {
        stops++;
      };
    },
  }, { io });
  await settle();
  io.enqueueKeys("down");
  await settle();
  for (let n = 0; n < 50; n++) context?.update(testView(["c", "b", "a"]));
  io.enqueue("\x1b[Bq");
  const result = await running;
  assertEquals(result.lists.items?.selectedId, "c");
  assertEquals(starts, 1);
  assertEquals(stops, 1);
  assert(
    io.writes.filter((write) => write.startsWith(BEGIN_SYNCHRONIZED_UPDATE))
      .length <= 5,
  );
  io.close();
});

Deno.test("cancel, EOF, abort, provider, render and foreground faults restore terminal ownership", async () => {
  for (
    const fault of [
      "cancel",
      "eof",
      "abort",
      "provider",
      "render",
      "foreground",
    ] as const
  ) {
    const io = new FakeTerminalIO(
      fault === "cancel" ? ["\x03"] : fault === "foreground" ? ["\r"] : [],
      { holdOpen: fault === "abort" || fault === "provider" },
    );
    const abort = new AbortController();
    const view: TerminalApplicationView<string> = fault === "render"
      ? {
        header: { leading: [{ text: "Fault" }] },
        body: {
          kind: "reading",
          id: "text",
          content: {
            render: () => {
              throw new Error("render failed");
            },
          } as never,
        },
        footer: { left: [] },
      }
      : testView();
    await assertRejects(
      () =>
        runTerminalApplication({
          view,
          start: (context) => {
            if (fault === "provider") {
              context.fail(new Error("provider failed"));
            }
            if (fault === "abort") abort.abort();
          },
          onAction: () => ({
            kind: "foreground",
            run: () => {
              throw new Error("foreground failed");
            },
          }),
        }, { io, abortSignal: abort.signal }),
      ["cancel", "eof", "abort"].includes(fault) ? InteractionCancelled : Error,
    );
    assertEquals(io.rawTransitions.at(-1), false, fault);
    assertEquals(io.resizeListenerCount, 0);
    assert(io.output().includes("\x1b[?1049l"));
    io.close();
  }
});

Deno.test("application refuses unsupported terminals before mutating modes", async () => {
  for (const options of [{ interactive: false }, { ansiControl: false }]) {
    const io = new FakeTerminalIO([], options);
    await assertRejects(() =>
      runTerminalApplication({ view: testView() }, { io })
    );
    assertEquals(io.rawTransitions, []);
    assertEquals(io.writes, []);
  }
});

Deno.test("application signal restoration stops subscriptions and resize listeners exactly once", async () => {
  const io = new FakeTerminalIO([], { holdOpen: true });
  const signals = new FakeSignalSource();
  let stops = 0;
  const running = runTerminalApplication({
    view: testView(),
    start: () => () => {
      stops++;
    },
  }, { io, signals }).catch((error) => error);
  await settle();
  signals.deliver();
  assertEquals(signals.raised, 1);
  assertEquals(signals.listenerCount, 0);
  assertEquals(io.resizeListenerCount, 0);
  assertEquals(io.rawTransitions, [true, false]);
  assertEquals(stops, 1);
  io.close();
  assert(await running instanceof InteractionCancelled);
  assertEquals(stops, 1);
});

Deno.test("application transport failures preserve the primary fault through cleanup", async () => {
  for (const mode of ["read", "write", "resize-listener"] as const) {
    const failure = new Error(mode);
    class FaultIO extends FakeTerminalIO {
      override async read() {
        if (mode === "read") throw failure;
        return await super.read();
      }
      override write(value: string) {
        if (mode === "write" && value.includes(ERASE_TERMINAL_DISPLAY)) {
          throw failure;
        }
        super.write(value);
      }
      override listenResize(listener: () => void) {
        if (mode === "resize-listener") throw failure;
        return super.listenResize(listener);
      }
    }
    const io = new FaultIO([]);
    const error = await runTerminalApplication({
      view: testView(),
      start: () => () => {
        throw new Error("cleanup");
      },
    }, { io }).catch((error) => error);
    assertEquals(error, failure);
    assertEquals(io.rawTransitions.at(-1), false);
    assertEquals(io.resizeListenerCount, 0);
  }
});

Deno.test("below the minimum size bindings still run while navigation waits", async () => {
  const io = new FakeTerminalIO(["\x1b[B\rq"], { columns: 24, rows: 6 });
  const actions: string[] = [];
  const state = await runTerminalApplication({
    view: testView(["a", "b"]),
    ...quit,
    onAction: (action) => {
      actions.push(action);
      return exitOn(action);
    },
  }, { io });
  assertEquals(actions, ["quit"]);
  assertEquals(state.lists.items?.selectedId, "a");
  assertStringIncludes(
    stripAnsi(captureTerminalFrame(io.output(), io.size()).frame),
    "Too small",
  );
});

Deno.test("a large collection navigates and paints only its visible slice", async () => {
  const items = Array.from({ length: 10_000 }, (_, index) => String(index));
  const io = new FakeTerminalIO(["\x1b[B".repeat(100), "q"], {
    columns: 40,
    rows: 20,
  });
  const state = await runTerminalApplication({
    view: testView(items, { body: "list" }),
    ...quit,
    onAction: exitOn,
  }, { io });
  assertEquals(state.lists.items?.selectedId, "100");
  const frame = stripAnsi(captureTerminalFrame(io.output(), io.size()).frame);
  assertStringIncludes(frame, "Item 100");
  assertStringIncludes(frame, "↓ 9");
});

Deno.test("keys typed after a foreground handoff wait for the application's return", async () => {
  const io = new FakeTerminalIO(["\r\x1b[Bq"]);
  let foreground = 0;
  const state = await runTerminalApplication({
    view: testView(["a", "b"]),
    ...quit,
    onAction: (action) =>
      action === "open:a"
        ? {
          kind: "foreground",
          run: () => {
            foreground++;
          },
        }
        : exitOn(action),
  }, { io });
  assertEquals(foreground, 1);
  assertEquals(state.lists.items?.selectedId, "b");
});
