import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import {
  createCliBlock,
  measureText,
  renderMarkdownCli,
  stripAnsi,
} from "../../src/cli/mod.ts";
import {
  InteractionCancelled,
  renderTerminalApplication,
  runTerminalApplication,
  type TerminalApplicationContext,
  type TerminalApplicationView,
  transitionTerminalApplication,
  updateTerminalApplication,
} from "../../src/cli/interactive/mod.ts";
import {
  FakeSignalSource,
  FakeTerminalIO,
} from "../../src/cli/interactive/testing.ts";

const reading = createCliBlock(renderMarkdownCli, {
  source: Array.from(
    { length: 50 },
    (_, i) => `Paragraph ${i}. A short piece of text for reading.`,
  ).join("\n\n"),
});
function view(ids = ["a", "b", "c"]): TerminalApplicationView<string> {
  return {
    title: "Projects",
    tip: "Tab opens the reading pane.",
    regions: [
      {
        kind: "choices",
        id: "list",
        title: "Items",
        entries: ids.map((id) => ({
          id,
          label: `Item ${id}`,
          value: id,
          indicator: { content: "+", tone: "success" },
          status: { content: "Ready", tone: "success" },
          description: "A little supporting detail.",
          disabled: id === "b",
        })),
      },
      { kind: "reading", id: "read", title: "Guide", content: reading },
    ],
  };
}

Deno.test("application region frames fit every geometry, repertoire, and appearance through repeated resize", () => {
  for (const colorDepth of ["none", "truecolor"] as const) {
    for (const unicode of [true, false]) {
      for (const theme of ["light", "dark"] as const) {
        let state = updateTerminalApplication(view());
        for (
          const [columns, rows] of [
            [80, 24],
            [120, 30],
            [60, 50],
            [40, 20],
            [80, 13],
            [20, 5],
            [120, 30],
            [32, 10],
          ]
        ) {
          for (const focus of [0, 1]) {
            state = { ...state, focusedRegionId: focus ? "read" : "list" };
            const io = new FakeTerminalIO([], {
              columns: columns!,
              rows: rows!,
              colorDepth,
              unicode,
            });
            const rendered = renderTerminalApplication(
              state,
              io.size(),
              io.capabilities(),
              { theme, appearance: { accent: 220 } },
            );
            state = rendered.state;
            assertEquals(rendered.frame.split("\n").length, rows);
            for (const line of rendered.frame.split("\n")) {
              assert(measureText(line) <= columns!);
            }
            assertStringIncludes(
              stripAnsi(rendered.frame),
              columns! < 32 ? "Resize" : focus ? "Guide" : "Items",
            );
          }
        }
      }
    }
  }
});

Deno.test("live rows retain identity on reorder and disability, then choose the removal successor", () => {
  let state = updateTerminalApplication(view());
  state =
    transitionTerminalApplication(state, { kind: "named", name: "down" }).state;
  assertEquals(state.positions.list?.selectedId, "b");
  assertEquals(
    transitionTerminalApplication(state, { kind: "named", name: "enter" })
      .action,
    undefined,
  );
  state = updateTerminalApplication(view(["c", "a", "b"]), state);
  assertEquals(state.positions.list?.selectedId, "b");
  state = updateTerminalApplication(view(["c", "a"]), state);
  assertEquals(state.positions.list?.selectedId, "a");
  state = updateTerminalApplication(view([]), state);
  assertEquals(state.positions.list?.selectedId, undefined);
});

Deno.test("owned runtime restores modes across foreground work without losing buffered keys or reading scroll", async () => {
  const io = new FakeTerminalIO(["\x1b[B\x1b[B\r", "\t\x1b[6~", "q"], {
    rows: 24,
  });
  let foreground = 0;
  const result = await runTerminalApplication({
    view: view(),
    onAction: (action, context) => {
      assertEquals(action.itemId, "c");
      return {
        kind: "foreground",
        run: () => {
          foreground++;
          assertEquals(io.rawTransitions.at(-1), false);
          assertEquals(io.resizeListenerCount, 0);
          assertEquals(context.state.positions.list?.selectedId, "c");
        },
      };
    },
    onKey: (key) =>
      key.kind === "text" && key.text === "q" ? { kind: "exit" } : undefined,
  }, { io });
  assertEquals(foreground, 1);
  assertEquals(io.rawTransitions, [true, false, true, false]);
  assertEquals(result.positions.list?.selectedId, "c");
  assert((result.positions.read?.scrollOffset ?? 0) > 0);
  assertEquals(io.resizeListenerCount, 0);
});

Deno.test("background updates coalesce while input remains in order, without restarting providers", async () => {
  const io = new FakeTerminalIO([], { holdOpen: true });
  let context!: TerminalApplicationContext<string>;
  let starts = 0, stops = 0;
  const running = runTerminalApplication({
    view: view(),
    start: (live) => {
      context = live;
      starts++;
      return () => {
        stops++;
      };
    },
    onKey: (key) =>
      key.kind === "text" && key.text === "q" ? { kind: "exit" } : undefined,
  }, { io });
  await new Promise((resolve) => setTimeout(resolve, 0));
  io.enqueueKeys("down");
  await new Promise((resolve) => setTimeout(resolve, 0));
  for (let n = 0; n < 50; n++) context.update(view(["c", "b", "a"]));
  io.enqueue("\x1b[Bq");
  const result = await running;
  assertEquals(result.positions.list?.selectedId, "a");
  assertEquals(starts, 1);
  assertEquals(stops, 1);
  assert(io.writes.filter((s) => s.startsWith("\x1b[2J")).length <= 5);
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
    await assertRejects(
      () =>
        runTerminalApplication({
          view: fault === "render"
            ? {
              title: "Fault",
              regions: [{
                kind: "reading",
                id: "read",
                title: "Text",
                content: createCliBlock(() => {
                  throw new Error("render failed");
                }, {}),
              }],
            }
            : view(),
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
    assertEquals(io.rawTransitions.at(-1), false);
    assertEquals(io.resizeListenerCount, 0);
    assert(io.output().includes("\x1b[?1049l"));
    io.close();
  }
});

Deno.test("minimal optional-free application fits and only renders a bounded slice of a large collection", () => {
  const entries = Array.from(
    { length: 10000 },
    (_, i) => ({ id: String(i), label: `Item ${i}`, value: i }),
  );
  let state = updateTerminalApplication({
    title: "Collection",
    regions: [{ kind: "choices", id: "items", title: "Items", entries }],
  });
  const io = new FakeTerminalIO([], { columns: 40, rows: 20 });
  for (let key = 0; key < 100; key++) {
    state =
      transitionTerminalApplication(state, { kind: "named", name: "down" })
        .state;
    const rendered = renderTerminalApplication(
      state,
      io.size(),
      io.capabilities(),
    );
    assert(rendered.renderCalls <= io.size().rows);
    assertEquals(rendered.frame.split("\n").length, 20);
  }
  assertEquals(state.positions.items?.selectedId, "100");
});

Deno.test("foreground return preserves an already-scrolled reading region", async () => {
  const io = new FakeTerminalIO(["\t\x1b[6~\t", "\r", "q"]);
  let offset = 0;
  const result = await runTerminalApplication({
    view: view(),
    onKey: (key) =>
      key.kind === "text" && key.text === "q" ? { kind: "exit" } : undefined,
    onAction: (_action, context) => ({
      kind: "foreground",
      run: () => {
        offset = context.state.positions.read!.scrollOffset;
        assert(
          offset > 1,
          "batched Tab then PageDown must use the newly active reading viewport",
        );
        assertEquals(io.rawTransitions.at(-1), false);
      },
    }),
  }, { io });
  assertEquals(result.positions.read?.scrollOffset, offset);
});

Deno.test("application refuses unsupported terminals before mutating modes", async () => {
  for (const options of [{ interactive: false }, { ansiControl: false }]) {
    const io = new FakeTerminalIO([], options);
    await assertRejects(() => runTerminalApplication({ view: view() }, { io }));
    assertEquals(io.rawTransitions, []);
    assertEquals(io.writes, []);
  }
});

Deno.test("application signal restoration stops subscriptions and resize listeners exactly once", async () => {
  const io = new FakeTerminalIO([], { holdOpen: true });
  const signals = new FakeSignalSource();
  let stops = 0;
  const running = runTerminalApplication({
    view: view(),
    start: () => () => {
      stops++;
    },
  }, { io, signals }).catch((error) => error);
  await new Promise((resolve) => setTimeout(resolve, 0));
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
        if (mode === "write" && value.startsWith("\x1b[2J")) throw failure;
        super.write(value);
      }
      override listenResize(listener: () => void) {
        if (mode === "resize-listener") throw failure;
        return super.listenResize(listener);
      }
    }
    const io = new FaultIO([]);
    const error = await runTerminalApplication({
      view: view(),
      start: () => () => {
        throw new Error("cleanup");
      },
    }, { io }).catch((error) => error);
    assertEquals(error, failure);
    assertEquals(io.rawTransitions.at(-1), false);
    assertEquals(io.resizeListenerCount, 0);
  }
});

Deno.test("long grouped labels keep the active choice reachable at minimum geometry", () => {
  const entries = Array.from({ length: 12 }, (_, i) => [
    {
      kind: "group-heading" as const,
      id: `group-${i}`,
      label: "An unusually long collection heading ".repeat(8).trim(),
    },
    {
      id: `item-${i}`,
      label: `Choice ${i} ` + "long label ".repeat(12),
      value: i,
      description: "Supporting information ".repeat(20),
    },
  ]).flat();
  let state = updateTerminalApplication({
    title: "Groups",
    regions: [{ kind: "choices", id: "items", title: "Items", entries }],
  });
  const io = new FakeTerminalIO([], { columns: 32, rows: 10 });
  for (let i = 0; i < 12; i++) {
    const result = renderTerminalApplication(
      state,
      io.size(),
      io.capabilities(),
    );
    assertEquals(result.frame.split("\n").length, 10);
    assertStringIncludes(stripAnsi(result.frame), `Choice ${i}`);
    state = transitionTerminalApplication(result.state, {
      kind: "named",
      name: "down",
    }, result.regionRows).state;
  }
});
