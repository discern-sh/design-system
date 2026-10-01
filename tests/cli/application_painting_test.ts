import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  runTerminalApplication,
  type TerminalApplicationView,
} from "../../src/cli/interactive/mod.ts";
import {
  BEGIN_SYNCHRONIZED_UPDATE,
  END_SYNCHRONIZED_UPDATE,
  POP_TERMINAL_TITLE,
  PUSH_TERMINAL_TITLE,
  terminalWindowTitle,
} from "../../src/cli/interactive/painter.ts";
import { TERMINAL_STATE_REPORT_PREFIX } from "../../src/cli/interactive/state-report.ts";
import {
  captureTerminalFrame,
  FakeTerminalIO,
} from "../../src/cli/interactive/testing.ts";
import { applicationSession, settle } from "../fixtures/application-session.ts";
import { testView } from "../fixtures/application-views.ts";

function listView(count = 3): TerminalApplicationView<string> {
  return testView(
    Array.from({ length: count }, (_, index) => `item-${index}`),
    { body: "list" },
  );
}

Deno.test("navigation repaints changed rows; resize and zoom repaint keyframes", async () => {
  const live = await applicationSession(testView(["item-0", "item-1"]));
  live.io.enqueueKeys("down");
  await settle();
  live.io.enqueue(" ");
  await settle();
  live.io.enqueueResize(100, 24);
  await settle();
  assertEquals(
    live.observations.map((observation) => observation.paint),
    ["keyframe", "rows", "keyframe", "keyframe"],
  );
  // The selection leaves one row and enters another; the detail follows it.
  const move = live.observations[1];
  assert(move !== undefined && move.rowsWritten <= 6, `${move?.rowsWritten}`);
  assert(move.bytesWritten < move.frameBytes);
  await live.finish();
});

Deno.test("every application paint is one synchronized update, and unchanged frames write nothing", async () => {
  const live = await applicationSession(listView());
  live.io.enqueueKeys("down", "up");
  await settle();
  live.context().update(listView());
  await settle();
  const paints = live.io.writes.filter((write) =>
    write.startsWith(BEGIN_SYNCHRONIZED_UPDATE)
  );
  assert(paints.length >= 1);
  for (const paint of paints) assert(paint.endsWith(END_SYNCHRONIZED_UPDATE));
  assertEquals(live.observations.at(-1)?.paint, "unchanged");
  assertEquals(live.observations.at(-1)?.written, false);
  await live.finish();
  const unsynchronized = await applicationSession(listView(), {
    runtime: { paint: { synchronized: false, rowDiff: false } },
  });
  unsynchronized.io.enqueueKeys("down");
  await settle();
  assert(
    !unsynchronized.io.output().includes(BEGIN_SYNCHRONIZED_UPDATE),
  );
  assertEquals(
    unsynchronized.observations.map((observation) => observation.paint),
    ["keyframe", "keyframe"],
  );
  await unsynchronized.finish();
});

Deno.test("state reports follow navigation only when the environment opts in", async () => {
  const silent = await applicationSession(listView());
  assert(!silent.io.output().includes(TERMINAL_STATE_REPORT_PREFIX));
  assertEquals(
    captureTerminalFrame(silent.io.output(), silent.io.size()).state,
    undefined,
  );
  await silent.finish();

  const reported = await applicationSession(listView(), {
    applicationStateReports: true,
  });
  assertEquals(
    captureTerminalFrame(reported.io.output(), reported.io.size()).state,
    {
      focusedControlId: "items",
      listId: "items",
      selectedItemId: "item-0",
      zoomed: false,
    },
  );
  reported.io.enqueueKeys("down", "down");
  await settle();
  const capture = captureTerminalFrame(
    reported.io.output(),
    reported.io.size(),
  );
  assertEquals(capture.state?.selectedItemId, "item-2");
  assert(capture.text.includes("Item item-2"));
  await reported.finish();
});

Deno.test("paint options are validated before the terminal changes", async () => {
  const io = new FakeTerminalIO([]);
  await assertRejects(
    () =>
      runTerminalApplication({ view: listView() }, {
        io,
        paint: { keyframeEveryMs: -1 },
      }),
    TypeError,
    "keyframe interval",
  );
  assertEquals(io.writes, []);
  assertEquals(io.rawTransitions, []);
});

Deno.test("the window title is saved, set with keyframes and changes, and restored", async () => {
  const titled = (title: string): TerminalApplicationView<string> => ({
    ...listView(),
    windowTitle: title,
  });
  const live = await applicationSession(titled("Studio · 3 items"));
  live.context().update(titled("Studio · 2 items"));
  await settle();
  live.context().update(titled("Studio · 2 items"));
  await settle();
  const capture = captureTerminalFrame(live.io.output(), live.io.size());
  assertEquals(capture.title, "Studio · 2 items");
  await live.finish();
  const output = live.io.output();
  assertEquals(output.split(PUSH_TERMINAL_TITLE).length, 2, "pushed once");
  assertEquals(
    output.split(terminalWindowTitle("Studio · 2 items")).length,
    2,
    "an unchanged title is not repeated",
  );
  assert(
    output.indexOf(POP_TERMINAL_TITLE) < output.lastIndexOf("\x1b[?1049l"),
    "the title is restored before the screen is released",
  );
});

Deno.test("a resize that ends at the painted size repaints a keyframe", async () => {
  const live = await applicationSession(testView(["item-0", "item-1"]));
  const before = live.observations.length;
  // Coalesced resizes can return to the painted size before the loop wakes.
  live.io.resize(40, 12);
  live.io.resize(80, 24);
  await settle();
  const after = live.observations.slice(before);
  assert(
    after.some((observation) => observation.paint === "keyframe"),
    "the resize round trip left the screen as it was",
  );
  await live.finish();
});
