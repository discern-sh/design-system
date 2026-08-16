import { assert, assertEquals, assertRejects } from "@std/assert";
import { InteractionCancelled } from "../../src/cli/interactive/errors.ts";
import type { TerminalIO } from "../../src/cli/interactive/io.ts";
import {
  ENTER_TERMINAL_ALTERNATE_SCREEN,
  HIDE_TERMINAL_CURSOR,
  LEAVE_TERMINAL_ALTERNATE_SCREEN,
  SHOW_TERMINAL_CURSOR,
} from "../../src/cli/interactive/lifecycle.ts";
import { MarkdownBrowserRefusalError } from "../../src/cli/interactive/markdown-browser-model.ts";
import {
  requestMarkdownBrowser,
  runMarkdownBrowserRequest,
} from "../../src/cli/interactive/markdown-browser-request.ts";
import { renderMarkdownBrowser } from "../../src/cli/interactive/markdown-browser-renderer.ts";
import {
  ERASE_TERMINAL_DISPLAY,
  HOME_TERMINAL_CURSOR,
} from "../../src/cli/interactive/painter.ts";
import {
  encodeTerminalKeys,
  enqueueTerminalEvents,
  FakeSignalSource,
  FakeTerminalIO,
} from "../../src/cli/interactive/testing.ts";
import { markdownBrowserOptions } from "../../catalogue/markdown-browser-example.ts";

const FRAME_PREFIX = `${ERASE_TERMINAL_DISPLAY}${HOME_TERMINAL_CURSOR}`;

function completeFrames(io: FakeTerminalIO): readonly string[] {
  return io.writes.filter((write) => write.startsWith(FRAME_PREFIX)).map(
    (write) => write.slice(FRAME_PREFIX.length).replaceAll("\r\n", "\n"),
  );
}

function countWrites(io: FakeTerminalIO, value: string): number {
  return io.writes.filter((write) => write === value).length;
}

async function until(condition: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("condition never held");
}

function assertRestored(io: FakeTerminalIO): void {
  assertEquals(io.rawTransitions, [true, false]);
  assertEquals(countWrites(io, SHOW_TERMINAL_CURSOR), 1);
  assertEquals(countWrites(io, LEAVE_TERMINAL_ALTERNATE_SCREEN), 1);
  assertEquals(io.resizeListenerCount, 0);
}

Deno.test("scripted keys and resize events drive the real browser and restore before return", async () => {
  const io = new FakeTerminalIO([], {
    columns: 80,
    rows: 24,
    colorDepth: "truecolor",
    holdOpen: true,
  });
  enqueueTerminalEvents(io, [
    { kind: "keys", keys: ["enter", "page-down"] },
    { kind: "resize", columns: 120, rows: 30 },
    { kind: "text", value: "q" },
    { kind: "keys", keys: ["end", "enter"] },
  ]);
  const result = await requestMarkdownBrowser(markdownBrowserOptions, { io });
  assertEquals(result.kind, "exit");
  assertEquals(result.id, "quit");
  assertEquals(result.state.openedDocumentId, undefined);
  assertEquals(result.state.highlightedId, "quit");
  assertRestored(io);
  assertEquals(io.writes[0], ENTER_TERMINAL_ALTERNATE_SCREEN);
  assertEquals(io.writes[1], HIDE_TERMINAL_CURSOR);
  assertEquals(io.writes.at(-2), SHOW_TERMINAL_CURSOR);
  assertEquals(io.writes.at(-1), LEAVE_TERMINAL_ALTERNATE_SCREEN);
  const frames = completeFrames(io);
  assert(frames.some((frame) => frame.split("\n").length === 24));
  assert(frames.some((frame) => frame.split("\n").length === 30));
  assert(
    frames.some((frame) =>
      frame.split("\n").every((line) => line.length >= 120)
    ),
    "the live resize must produce a wide complete frame",
  );
});

Deno.test("action values resolve only after every terminal effect is restored", async () => {
  const io = new FakeTerminalIO([encodeTerminalKeys("enter")], {
    columns: 80,
    rows: 24,
  });
  const result = await requestMarkdownBrowser({
    ...markdownBrowserOptions,
    initialState: {
      query: "docs online",
      queryCursor: 11,
      highlightedId: "read-online",
      focusedPane: "picker",
      pickerVisibleStart: 0,
      documentScrollOffset: 0,
    },
  }, { io });
  assertEquals(result.kind, "action");
  if (result.kind !== "action") throw new Error("expected action result");
  assertEquals(result.value, "online");
  assertEquals(result.state.query, "docs online");
  assertRestored(io);
});

Deno.test("unsupported control and incoherent geometry refuse before any terminal mutation", async () => {
  for (
    const io of [
      new FakeTerminalIO([], {
        ansiControl: false,
        columns: 80,
        rows: 24,
      }),
      new FakeTerminalIO([], { columns: 31, rows: 24 }),
      new FakeTerminalIO([], { columns: 40, rows: 9 }),
    ]
  ) {
    const error = await assertRejects(
      () => requestMarkdownBrowser(markdownBrowserOptions, { io }),
      MarkdownBrowserRefusalError,
    );
    assert(
      error.reason === "ansi-control-unavailable" ||
        error.reason === "terminal-too-small",
    );
    assertEquals(io.writes, []);
    assertEquals(io.rawTransitions, []);
    assertEquals(io.resizeListenerCount, 0);
  }

  const invalid = new FakeTerminalIO([], { columns: 80, rows: 24 });
  await assertRejects(
    () =>
      requestMarkdownBrowser({
        label: "Invalid",
        entries: [{
          kind: "document",
          id: "unsafe",
          label: "Unsafe",
          path: "../unsafe.md",
          source: "# Unsafe",
        }],
      }, { io: invalid }),
    TypeError,
    "corpus-relative",
  );
  assertEquals(invalid.writes, []);
  assertEquals(invalid.rawTransitions, []);
});

Deno.test("Escape, Ctrl+C, and EOF share cancellation and exact restoration", async () => {
  for (
    const [input, reason] of [
      [encodeTerminalKeys("escape"), "Dismissed."],
      [encodeTerminalKeys("ctrl-c"), "Cancelled."],
      ["", "Input ended."],
    ] as const
  ) {
    const io = new FakeTerminalIO(input === "" ? [] : [input], {
      columns: 80,
      rows: 24,
    });
    const error = await assertRejects(
      () => requestMarkdownBrowser(markdownBrowserOptions, { io }),
      InteractionCancelled,
      reason,
    );
    assertEquals(error.reason, reason);
    assertRestored(io);
  }
});

Deno.test("SIGINT removes readers and restores the alternate screen exactly once", async () => {
  const io = new FakeTerminalIO([], {
    columns: 80,
    rows: 24,
    holdOpen: true,
  });
  const signals = new FakeSignalSource();
  const pending = requestMarkdownBrowser(markdownBrowserOptions, {
    io,
    signals,
  }).catch((error) => error);
  await until(() => completeFrames(io).length === 1);
  assertEquals(io.resizeListenerCount, 1);
  signals.deliver();
  assertEquals(signals.raised, 1);
  assertEquals(signals.listenerCount, 0);
  assertRestored(io);
  io.close();
  const error = await pending;
  assert(error instanceof InteractionCancelled);
  assertEquals(error.reason, "Input ended.");
  assertRestored(io);
});

Deno.test("renderer, write, and resize-listener failures all restore the terminal", async () => {
  const renderFailure = new Error("renderer failed");
  const renderIo = new FakeTerminalIO([encodeTerminalKeys("down")], {
    columns: 80,
    rows: 24,
  });
  let renders = 0;
  const rendered = runMarkdownBrowserRequest(markdownBrowserOptions, {
    io: renderIo,
  }, {
    render: (state, facts) => {
      renders += 1;
      if (renders === 2) throw renderFailure;
      return renderMarkdownBrowser(state, facts);
    },
  }).catch((error) => error);
  assertEquals(await rendered, renderFailure);
  assertRestored(renderIo);

  const writeFailure = new Error("frame write failed");
  class FrameWriteFailure extends FakeTerminalIO {
    override write(value: string): void {
      if (value.startsWith(FRAME_PREFIX)) throw writeFailure;
      super.write(value);
    }
  }
  const writeIo = new FrameWriteFailure([], { columns: 80, rows: 24 });
  assertEquals(
    await requestMarkdownBrowser(markdownBrowserOptions, { io: writeIo })
      .catch((error) => error),
    writeFailure,
  );
  assertRestored(writeIo);

  const resizeFailure = new Error("resize listener failed");
  class ResizeListenerFailure extends FakeTerminalIO {
    override listenResize(_handler: () => void): () => void {
      throw resizeFailure;
    }
  }
  const resizeIo = new ResizeListenerFailure([], {
    columns: 80,
    rows: 24,
  });
  assertEquals(
    await requestMarkdownBrowser(markdownBrowserOptions, { io: resizeIo })
      .catch((error) => error),
    resizeFailure,
  );
  assertRestored(resizeIo);
});

Deno.test("the original fault wins when restoration also fails", async () => {
  const renderFailure = new Error("original renderer failure");
  class CleanupFailure extends FakeTerminalIO {
    override write(value: string): void {
      if (value === SHOW_TERMINAL_CURSOR) {
        throw new Error("cursor restoration failed");
      }
      super.write(value);
    }
  }
  const io = new CleanupFailure([encodeTerminalKeys("down")], {
    columns: 80,
    rows: 24,
  });
  let renders = 0;
  const error = await runMarkdownBrowserRequest(markdownBrowserOptions, {
    io,
  }, {
    render: (state, facts) => {
      renders += 1;
      if (renders === 2) throw renderFailure;
      return renderMarkdownBrowser(state, facts);
    },
  }).catch((caught) => caught);
  assertEquals(error, renderFailure);
  assertEquals(countWrites(io, LEAVE_TERMINAL_ALTERNATE_SCREEN), 1);
  assertEquals(io.rawTransitions, [true, false]);
  assertEquals(io.resizeListenerCount, 0);
});

Deno.test("failed enter operations emit no unmatched cleanup control", async () => {
  const enterFailure = new Error("alternate screen enter failed");
  class EnterFailure extends FakeTerminalIO {
    override write(value: string): void {
      if (value === ENTER_TERMINAL_ALTERNATE_SCREEN) throw enterFailure;
      super.write(value);
    }
  }
  const io: TerminalIO & FakeTerminalIO = new EnterFailure([], {
    columns: 80,
    rows: 24,
  });
  assertEquals(
    await requestMarkdownBrowser(markdownBrowserOptions, { io })
      .catch((error) => error),
    enterFailure,
  );
  assertEquals(io.writes, []);
  assertEquals(io.rawTransitions, [true, false]);
  assertEquals(io.resizeListenerCount, 0);
});
