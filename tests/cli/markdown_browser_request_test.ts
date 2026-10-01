import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import {
  DISABLE_TERMINAL_MOUSE_BUTTON_TRACKING,
  ENABLE_TERMINAL_MOUSE_BUTTON_TRACKING,
  LEAVE_TERMINAL_ALTERNATE_SCREEN,
} from "../../src/cli/interactive/lifecycle.ts";
import { BEGIN_SYNCHRONIZED_UPDATE } from "../../src/cli/interactive/painter.ts";
import {
  InteractionCancelled,
  markdownBrowserCommand,
  type MarkdownBrowserExitResult,
  MarkdownBrowserRefusalError,
  type MarkdownBrowserRequestHandlers,
  type MarkdownBrowserResumableState,
  requestMarkdownBrowser,
  runTerminalApplication,
  type TerminalApplicationContext,
  type TerminalApplicationState,
} from "../../src/cli/interactive/mod.ts";
import type { TerminalKeyName } from "../../src/cli/interactive/keys.ts";
import {
  encodeTerminalKeys,
  FakeTerminalIO,
  ManualTerminalClock,
  settledTerminalFrame,
} from "../../src/cli/interactive/testing.ts";
import { markdownBrowserOptions } from "../../catalogue/markdown-browser-example.ts";
import { settle } from "../fixtures/application-session.ts";
import { testView } from "../fixtures/application-views.ts";

/** Bytes for keys by decoder name, or one character as itself. */
const keys = (...names: (TerminalKeyName | string)[]): string =>
  names.map((name) =>
    [...name].length === 1 ? name : encodeTerminalKeys(name as TerminalKeyName)
  ).join("");

function assertRestored(io: FakeTerminalIO): void {
  assertEquals(io.rawTransitions, [true, false]);
  assertEquals(io.resizeListenerCount, 0);
  assertEquals(io.writes.at(-1), LEAVE_TERMINAL_ALTERNATE_SCREEN);
}

function screen(io: FakeTerminalIO): string {
  return stripAnsi(settledTerminalFrame(io.output(), io.size()));
}

/** Wait until the settled screen shows a text, or fail naming it. */
async function shows(io: FakeTerminalIO, text: string): Promise<string> {
  for (let turn = 0; turn < 200; turn += 1) {
    const now = screen(io);
    if (now.includes(text)) return now;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(`the screen never showed ${text}:\n${screen(io)}`);
}

Deno.test("a standalone browser resolves with an action only after restoration", async () => {
  const io = new FakeTerminalIO([keys("end", "up", "enter")], {
    columns: 80,
    rows: 24,
  });
  const result = await requestMarkdownBrowser(markdownBrowserOptions, { io });
  assert(result.kind === "action");
  assertEquals(result.value, "online");
  assertEquals(result.state.selectedId, "read-online");
  assertRestored(io);
});

Deno.test("an exit entry resolves with its result; closing, Ctrl+C, and EOF cancel", async () => {
  const exit = await requestMarkdownBrowser(markdownBrowserOptions, {
    io: new FakeTerminalIO([keys("end", "enter")]),
  });
  assertEquals(exit.kind, "exit");
  for (const input of [["q"], [keys("ctrl-c")], []]) {
    const io = new FakeTerminalIO(input);
    await assertRejects(
      () => requestMarkdownBrowser(markdownBrowserOptions, { io }),
      InteractionCancelled,
    );
    assertRestored(io);
  }
});

Deno.test("a followed external link resolves after restoration with the reader's place", async () => {
  const io = new FakeTerminalIO([keys("enter", "tab", "tab", "tab", "enter")]);
  const result = await requestMarkdownBrowser(markdownBrowserOptions, { io });
  assert(result.kind === "external-link");
  assertEquals(result.destination, "https://example.com/reference");
  assertEquals(result.state.history.at(-1), {
    kind: "document",
    id: "reader-guide",
  });
  assertRestored(io);
  const again = await requestMarkdownBrowser({
    ...markdownBrowserOptions,
    initialState: result.state,
  }, { io: new FakeTerminalIO([keys("enter")]) });
  assertEquals(
    again.kind,
    "external-link",
    "the same link has focus when the reader comes back",
  );
});

Deno.test("unsupported control, small terminals, and broken corpora refuse before any change", async () => {
  for (
    const io of [
      new FakeTerminalIO([], { ansiControl: false, columns: 80, rows: 24 }),
      new FakeTerminalIO([], { columns: 31, rows: 24 }),
      new FakeTerminalIO([], { columns: 40, rows: 9 }),
    ]
  ) {
    await assertRejects(
      () =>
        requestMarkdownBrowser({ ...markdownBrowserOptions, mouse: true }, {
          io,
        }),
      MarkdownBrowserRefusalError,
    );
    assertEquals(io.writes, []);
    assertEquals(io.rawTransitions, []);
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
});

Deno.test("the browser paints synchronized changed rows like every application", async () => {
  const io = new FakeTerminalIO([], { holdOpen: true, columns: 80, rows: 24 });
  const running = requestMarkdownBrowser(markdownBrowserOptions, {
    io,
    clock: new ManualTerminalClock(),
  });
  await settle();
  const opened = io.output().length;
  io.enqueue(keys("down"));
  await settle();
  const moved = io.output().slice(opened);
  assert(moved.startsWith(BEGIN_SYNCHRONIZED_UPDATE), JSON.stringify(moved));
  assert(!moved.includes("\x1b[2J"), "a selection move rewrites rows only");
  io.enqueue("q");
  await assertRejects(() => running, InteractionCancelled);
  io.close();
});

Deno.test("mouse reports turn on with the paint and off before the screen is released", async () => {
  const io = new FakeTerminalIO([keys("end", "enter")], {
    mouseTracking: true,
  });
  const result = await requestMarkdownBrowser({
    ...markdownBrowserOptions,
    mouse: true,
  }, { io });
  assertEquals(result.kind, "exit");
  const output = io.output();
  const on = output.indexOf(ENABLE_TERMINAL_MOUSE_BUTTON_TRACKING);
  const off = output.lastIndexOf(DISABLE_TERMINAL_MOUSE_BUTTON_TRACKING);
  assert(on >= 0 && off > on);
  assert(off < output.lastIndexOf(LEAVE_TERMINAL_ALTERNATE_SCREEN));
});

interface Host {
  readonly io: FakeTerminalIO;
  readonly running: Promise<TerminalApplicationState>;
  readonly closes: {
    readonly state: MarkdownBrowserResumableState;
    readonly exit?: MarkdownBrowserExitResult;
  }[];
  readonly hostActions: string[];
}

/** How a caller answers the browser's choices, in either shape. */
type Respond = NonNullable<MarkdownBrowserRequestHandlers<string>["respond"]>;

/** An application whose `m` opens the browser on its own screen. */
async function host(
  respond: Respond = () => undefined,
  initialState: () => MarkdownBrowserResumableState | undefined = () =>
    undefined,
): Promise<Host> {
  const io = new FakeTerminalIO([], { holdOpen: true, columns: 80, rows: 24 });
  const closes: Host["closes"] = [];
  const hostActions: string[] = [];
  const running = runTerminalApplication<string>({
    view: testView(["a", "b"]),
    keymap: [
      { key: "q", action: "quit" },
      { key: "m", action: "manual" },
      { key: "ctrl-c", action: "interrupted" },
    ],
    onAction: (action, context: TerminalApplicationContext<string>) => {
      hostActions.push(action);
      if (action === "quit") return { kind: "exit" };
      if (action !== "manual") return undefined;
      const state = initialState();
      return markdownBrowserCommand({
        ...markdownBrowserOptions,
        ...(state === undefined ? {} : { initialState: state }),
      }, {
        respond,
        onClose: (closed, exit) => {
          closes.push(
            exit === undefined ? { state: closed } : { state: closed, exit },
          );
          // The opener's own view applies before its first frame back.
          context.update({
            ...testView(["a", "b"]),
            header: { leading: [{ text: "Back in Studio", role: "title" }] },
          });
        },
      });
    },
  }, { io, clock: new ManualTerminalClock() });
  await settle();
  return { io, running, closes, hostActions };
}

Deno.test("an application opens the browser on its own screen and returns to it", async () => {
  const memory: { saved?: MarkdownBrowserResumableState } = {};
  const live = await host(undefined, () => memory.saved);
  const opened = live.io.output().length;
  live.io.enqueue("m");
  await shows(live.io, "Documentation library");
  live.io.enqueue(keys("down", "enter"));
  await shows(live.io, "Supporting material 1");
  live.io.enqueue("q");
  await shows(live.io, "Back in Studio");
  assert(
    !live.io.output().slice(opened).includes(LEAVE_TERMINAL_ALTERNATE_SCREEN),
    "the screen is never released",
  );
  assertEquals(live.closes.length, 1);
  const saved = live.closes[0]?.state;
  if (saved !== undefined) memory.saved = saved;
  assertEquals(saved?.history.at(-1), { kind: "document", id: "note-1" });
  live.io.enqueue("m");
  const resumed = await shows(live.io, "Supporting material 1");
  assertStringIncludes(
    resumed.split("\n")[0] ?? "",
    "Reference note 1",
    "opening again resumes where the reader was",
  );
  live.io.enqueue(keys("q", "q"));
  await live.running;
  live.io.close();
});

/** One way to run the browser, opened and ready for keys. */
interface OpenBrowser {
  readonly io: FakeTerminalIO;
  /**
   * What the caller hears once the browser closes: the request's result
   * on its own screen, or the exit entry `onClose` receives when nested.
   */
  readonly closed: () => Promise<
    { readonly kind?: string; readonly id?: string }
  >;
  /** End whatever still runs around the closed browser. */
  readonly finish: () => Promise<void>;
}

/** The browser's two run shapes, which answer a choice the same way. */
const SHAPES: readonly {
  readonly name: string;
  readonly open: (respond: Respond) => Promise<OpenBrowser>;
  /** What the caller hears when `respond` closes the browser on the action. */
  readonly answeredExit: { readonly kind?: string; readonly id?: string };
}[] = [
  {
    name: "on its own screen",
    open: async (respond) => {
      const io = new FakeTerminalIO([], {
        holdOpen: true,
        columns: 80,
        rows: 24,
      });
      const running = requestMarkdownBrowser(markdownBrowserOptions, {
        io,
        clock: new ManualTerminalClock(),
      }, { respond });
      await shows(io, "Documentation library");
      return {
        io,
        closed: async () => {
          const result = await running;
          return { kind: result.kind, id: result.id };
        },
        finish: () => Promise.resolve(io.close()),
      };
    },
    answeredExit: { kind: "action", id: "read-online" },
  },
  {
    name: "nested in an application",
    open: async (respond) => {
      const live = await host(respond);
      live.io.enqueue("m");
      await shows(live.io, "Documentation library");
      return {
        io: live.io,
        closed: async () => {
          await shows(live.io, "Back in Studio");
          const exit = live.closes[0]?.exit;
          return exit === undefined ? {} : { kind: exit.kind, id: exit.id };
        },
        finish: async () => {
          live.io.enqueue("q");
          await live.running;
          live.io.close();
        },
      };
    },
    answeredExit: {},
  },
];

for (const shape of SHAPES) {
  Deno.test(`a browser ${shape.name} answers choices in place and shows a failed command's error`, async () => {
    const answered: string[] = [];
    const browser = await shape.open((chosen) => {
      answered.push(chosen.kind);
      return {
        kind: "background",
        id: `open-${answered.length}`,
        run: () => Promise.reject(new Error("No browser is available.")),
      };
    });
    browser.io.enqueue(keys("end", "up", "enter"));
    const failed = await shows(browser.io, "No browser is available.");
    assertStringIncludes(failed, "Documentation library");
    browser.io.enqueue(keys("home", "enter", "tab", "tab", "tab", "enter"));
    for (let turn = 0; turn < 50 && answered.length < 2; turn += 1) {
      await settle();
    }
    assertEquals(answered, ["action", "external-link"]);
    assertStringIncludes(
      await shows(browser.io, "No browser is available."),
      "external reference",
      "the document stays open after its link is answered",
    );
    browser.io.enqueue(keys("c", "end", "enter"));
    assertEquals(await browser.closed(), { kind: "exit", id: "quit" });
    await browser.finish();
  });

  Deno.test(`respond's exit closes a browser ${shape.name}`, async () => {
    const browser = await shape.open((chosen) =>
      chosen.kind === "action" ? { kind: "exit" } : undefined
    );
    // The link is answered with nothing, so the browser stays; the action
    // is answered with an exit, which closes it.
    browser.io.enqueue(keys("enter", "tab", "tab", "tab", "enter"));
    browser.io.enqueue(keys("c", "end", "up", "enter"));
    assertEquals(await browser.closed(), shape.answeredExit);
    await browser.finish();
  });
}

Deno.test("a standalone browser that answers in place still closes, cancels, and prints an exit's epilogue", async () => {
  const io = new FakeTerminalIO([keys("end", "up", "enter")], {
    columns: 80,
    rows: 24,
  });
  const result = await requestMarkdownBrowser(markdownBrowserOptions, { io }, {
    respond: (chosen) => ({
      kind: "exit",
      epilogue: [[{ text: "Opened " }, {
        text: chosen.id,
        role: "code",
      }]],
    }),
  });
  assertEquals(result.kind, "action");
  assertEquals(result.state.selectedId, "read-online");
  const restored = io.output().lastIndexOf(LEAVE_TERMINAL_ALTERNATE_SCREEN);
  assert(restored >= 0);
  assertStringIncludes(
    stripAnsi(io.output().slice(restored)),
    "Opened read-online",
    "the epilogue prints after the screen is released",
  );
  for (const input of [[keys("end", "up", "enter"), "q"], [keys("ctrl-c")]]) {
    const answered = new FakeTerminalIO(input);
    await assertRejects(
      () =>
        requestMarkdownBrowser(markdownBrowserOptions, { io: answered }, {
          respond: () => undefined,
        }),
      InteractionCancelled,
    );
    assertRestored(answered);
  }
});

Deno.test("Ctrl+C in a nested browser closes it and reaches the opener", async () => {
  const live = await host();
  live.io.enqueue(keys("m", "enter", "ctrl-c"));
  await shows(live.io, "Item a");
  for (let turn = 0; turn < 50 && live.hostActions.length < 2; turn += 1) {
    await settle();
  }
  assertEquals(live.hostActions, ["manual", "interrupted"]);
  assertEquals(live.closes.length, 1);
  live.io.enqueue("q");
  await live.running;
  live.io.close();
});
