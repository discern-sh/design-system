import { assert, assertEquals } from "@std/assert";
import {
  runTerminalApplication,
  type TerminalApplicationContext,
  type TerminalApplicationObservation,
  type TerminalApplicationOptions,
  type TerminalApplicationState,
} from "../../src/cli/interactive/mod.ts";
import type { TerminalMouseEvent } from "../../src/cli/interactive/keys.ts";
import { QUERY_TERMINAL_CURSOR_POSITION } from "../../src/cli/interactive/mouse-input.ts";
import {
  DISABLE_TERMINAL_MOUSE_REPORTS,
  ENABLE_TERMINAL_MOUSE_REPORTS,
} from "../../src/cli/interactive/painter.ts";
import {
  captureTerminalFrame,
  FakeTerminalIO,
  type FakeTerminalIOOptions,
  ManualTerminalClock,
} from "../../src/cli/interactive/testing.ts";
import { applicationDemoOptions } from "../../scripts/playground/application.ts";
import { settle } from "../fixtures/application-session.ts";

/** The sample application on a fake terminal, with its callbacks recorded. */
async function demo(options: FakeTerminalIOOptions = {}) {
  const io = new FakeTerminalIO([], {
    holdOpen: true,
    columns: 80,
    rows: 24,
    applicationStateReports: true,
    ...options,
  });
  const clock = new ManualTerminalClock(1_000_000);
  const sample = applicationDemoOptions(() => {}, {
    updateAfterMs: 600_000,
    tip: false,
  });
  const calls: string[] = [];
  const observations: TerminalApplicationObservation[] = [];
  let live: TerminalApplicationContext<string> | undefined;
  const options_: TerminalApplicationOptions<string> = {
    ...sample,
    start(context) {
      live = context;
      return sample.start?.(context);
    },
    onField(layerId, fieldId, value, context) {
      calls.push(`field:${layerId}.${fieldId}=${value}`);
      sample.onField?.(layerId, fieldId, value, context);
    },
    onDismiss(target, via, context) {
      calls.push(
        `dismiss:${"layer" in target ? target.layer : target.message}:${via}`,
      );
      sample.onDismiss?.(target, via, context);
    },
    onAction(action, context, source) {
      calls.push(`action:${action}:${source}`);
      return sample.onAction?.(action, context, source);
    },
  };
  const running = runTerminalApplication(options_, {
    io,
    clock,
    observe: (observation) => observations.push(observation),
  });
  await settle();
  return {
    io,
    clock,
    calls,
    observations,
    state: (): TerminalApplicationState => {
      if (live === undefined) throw new Error("the sample did not start");
      return live.state;
    },
    capture: () => captureTerminalFrame(io.output(), io.size()),
    send: async (bytes: string) => {
      io.enqueue(bytes);
      await settle();
    },
    /** A lone Escape reaches the reader only after its timing window. */
    escape: async () => {
      io.enqueueKeys("escape");
      await new Promise((resolve) => setTimeout(resolve, 150));
      await settle();
    },
    /** Cancel with Ctrl+C, which works whatever layer is open. */
    finish: async () => {
      io.enqueue("\x03");
      await running.catch(() => undefined);
      io.close();
    },
  };
}

const DOWN = "\x1b[B";
const RIGHT = "\x1b[C";

Deno.test("keys typed after an opening key land on the new layer's initial control", async () => {
  const session = await demo();
  // One read: move to the archive job, open its delete sheet, and type.
  await session.send(`${DOWN}${DOWN}Dphoto`);
  assertEquals(session.state().topLayerId, "delete");
  assertEquals(session.state().fields.delete?.confirm, "photo");
  assertEquals(
    session.calls.filter((call) => call.startsWith("field:")).at(-1),
    "field:delete.confirm=photo",
  );
  await session.escape();
  await session.send("r\r");
  assertEquals(session.state().topLayerId, undefined, "Enter landed on Keep");
  assert(!session.calls.some((call) => call.startsWith("action:confirm-run")));
  assert(session.calls.includes("dismiss:run:safe"));
  await session.finish();
});

Deno.test("opening and closing a layer paints a keyframe; its content changes paint rows", async () => {
  const session = await demo();
  const before = session.observations.length;
  await session.send(".");
  assertEquals(session.observations.at(-1)?.paint, "keyframe");
  await session.send(DOWN);
  assertEquals(session.observations.at(-1)?.paint, "rows");
  await session.escape();
  assertEquals(session.observations.at(-1)?.paint, "keyframe");
  assert(session.observations.length > before);
  const capture = session.capture();
  assertEquals(capture.state?.topLayerId, undefined);
  await session.finish();
});

Deno.test("state reports name the top layer and its focused control", async () => {
  const session = await demo();
  await session.send(`${DOWN}r`);
  let capture = session.capture();
  assertEquals(capture.state?.topLayerId, "run");
  assertEquals(capture.state?.focusedControlId, "run:button:keep");
  assertEquals(capture.state?.selectedItemId, "image-resize");
  await session.send(RIGHT);
  capture = session.capture();
  assertEquals(capture.state?.focusedControlId, "run:button:run");
  await session.finish();
});

const NO_MODIFIERS = { shift: false, alt: false, control: false } as const;

function press(column: number, row: number): TerminalMouseEvent {
  return {
    kind: "mouse",
    action: "press",
    button: "left",
    column,
    row,
    modifiers: NO_MODIFIERS,
  };
}

/** The one-based cell of the first occurrence of a text in the settled frame. */
function cell(text: string, frame: string): { column: number; row: number } {
  const lines = frame.split("\n");
  for (const [index, line] of lines.entries()) {
    const at = line.indexOf(text);
    if (at >= 0) {
      return { column: [...line.slice(0, at)].length + 1, row: index + 1 };
    }
  }
  throw new Error(`${JSON.stringify(text)} is not on screen`);
}

Deno.test("mouse reports turn on with the view, hint once, and stop before release", async () => {
  const session = await demo();
  assertEquals(session.capture().mouse, undefined, "off by default");
  await session.send("\x0bmouse\r");
  const on = session.capture();
  assertEquals(on.mouse, true);
  assert(on.text.includes("Shift-drag to select text"));
  await session.send(DOWN);
  assert(!session.capture().text.includes("Shift-drag"), "the hint shows once");
  // A click on the Actions hint presses its key.
  const hint = cell(". Actions", session.capture().text);
  session.io.enqueueMouse(press(hint.column, hint.row));
  await settle();
  assertEquals(session.state().topLayerId, "actions");
  // A click outside the layer is the safe choice.
  session.io.enqueueMouse(press(4, 1));
  await settle();
  assertEquals(session.state().topLayerId, undefined);
  assert(session.calls.includes("dismiss:actions:click-outside"));
  session.io.enqueue("q");
  session.io.enqueue("\x1b[24;1R");
  await settle();
  const output = session.io.output();
  const released = output.lastIndexOf(DISABLE_TERMINAL_MOUSE_REPORTS);
  assert(released > output.lastIndexOf(ENABLE_TERMINAL_MOUSE_REPORTS));
  assert(
    output.indexOf(QUERY_TERMINAL_CURSOR_POSITION, released) > released,
    "late reports are fenced after reports stop",
  );
  assert(released < output.lastIndexOf("\x1b[?25h"));
  session.io.close();
});

Deno.test("a confirm button needs a focusing click, then an activating click", async () => {
  const session = await demo();
  await session.send("\x0bmouse\r");
  await session.send(`${DOWN}r`);
  const run = cell("[ Run ]", session.capture().text);
  session.io.enqueueMouse(press(run.column + 2, run.row));
  await settle();
  assertEquals(session.state().focusedControlId, "run:button:run");
  assert(!session.calls.some((call) => call.startsWith("action:confirm-run")));
  // A key between the clicks starts the confirmation over.
  await session.send(RIGHT);
  session.io.enqueueMouse(press(run.column + 2, run.row));
  await settle();
  assert(!session.calls.some((call) => call.startsWith("action:confirm-run")));
  session.io.enqueueMouse(press(run.column + 2, run.row));
  await settle();
  assert(session.calls.includes("action:confirm-run:image-resize:click"));
  await session.finish();
});

Deno.test("clicks select rows, the wheel moves the selection and scrolls the detail", async () => {
  const session = await demo({ columns: 120, rows: 16 });
  await session.send("\x0bmouse\r");
  const wheel = (column: number, row: number): TerminalMouseEvent => ({
    kind: "mouse",
    action: "wheel",
    direction: "down",
    column,
    row,
    modifiers: NO_MODIFIERS,
  });
  const mail = cell("Mail digest", session.capture().text);
  session.io.enqueueMouse(press(mail.column, mail.row));
  await settle();
  assertEquals(session.state().lists.jobs?.selectedId, "mail-digest");
  session.io.enqueueMouse(wheel(mail.column, mail.row));
  await settle();
  assertEquals(session.state().lists.jobs?.selectedId, "search-index");
  const report = cell("Quarterly report", session.capture().text);
  session.io.enqueueMouse(press(report.column, report.row));
  await settle();
  assertEquals(session.state().lists.jobs?.selectedId, "quarterly-report");
  session.io.enqueueMouse(wheel(100, 8));
  await settle();
  assertEquals(session.state().detailScroll["quarterly-report"], 3);
  assertEquals(session.state().lists.jobs?.selectedId, "quarterly-report");
  session.io.enqueueMouse(press(report.column, report.row));
  await settle();
  assert(
    session.calls.includes("action:run:quarterly-report:click"),
    "a click on the selected row is Enter",
  );
  await session.finish();
});
