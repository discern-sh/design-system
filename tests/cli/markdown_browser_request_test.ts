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
  type MarkdownBrowserResumableState,
  requestMarkdownBrowser,
  runTerminalApplication,
  type TerminalApplicationCommand,
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
  readonly answers: string[];
  readonly hostActions: string[];
}

/** An application whose `m` opens the browser on its own screen. */
async function host(
  respond: (kind: string) => TerminalApplicationCommand | void = () =>
    undefined,
  initialState: () => MarkdownBrowserResumableState | undefined = () =>
    undefined,
): Promise<Host> {
  const io = new FakeTerminalIO([], { holdOpen: true, columns: 80, rows: 24 });
  const closes: Host["closes"] = [];
  const answers: string[] = [];
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
        respond: (result) => {
          answers.push(result.kind);
          return respond(result.kind);
        },
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
  return { io, running, closes, answers, hostActions };
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

Deno.test("a nested browser answers actions in place and shows a failed command's error", async () => {
  const live = await host((kind) =>
    kind === "action"
      ? {
        kind: "background",
        id: "open",
        run: () => Promise.reject(new Error("No browser is available.")),
      }
      : undefined
  );
  live.io.enqueue(keys("m", "end", "up", "enter"));
  const failed = await shows(live.io, "No browser is available.");
  assertEquals(live.answers, ["action"]);
  assertStringIncludes(failed, "Documentation library");
  live.io.enqueue(keys("end", "enter"));
  await settle();
  assertEquals(live.closes[0]?.exit?.id, "quit");
  live.io.enqueue("q");
  await live.running;
  live.io.close();
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
