import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  runTerminalApplication,
  type TerminalApplicationView,
} from "../../src/cli/interactive/mod.ts";
import {
  BEGIN_SYNCHRONIZED_UPDATE,
  END_SYNCHRONIZED_UPDATE,
} from "../../src/cli/interactive/painter.ts";
import { TERMINAL_STATE_REPORT_PREFIX } from "../../src/cli/interactive/state-report.ts";
import {
  captureTerminalFrame,
  FakeTerminalIO,
} from "../../src/cli/interactive/testing.ts";
import { applicationSession, settle } from "../fixtures/application-session.ts";

function listView(count = 3): TerminalApplicationView<string> {
  return {
    title: "Studio",
    regions: [{
      kind: "choices",
      id: "items",
      title: "Items",
      entries: Array.from({ length: count }, (_, index) => ({
        id: `item-${index}`,
        label: `Item ${index}`,
        value: `item-${index}`,
      })),
    }],
  };
}

Deno.test("navigation repaints changed rows; resize and a swapped region repaint keyframes", async () => {
  const live = await applicationSession({
    ...listView(),
    regions: [listView().regions[0], {
      kind: "choices",
      id: "more",
      title: "More",
      entries: [{ id: "x", label: "Other", value: "x" }],
    }],
  });
  live.io.enqueueKeys("down");
  await settle();
  live.io.enqueueKeys("tab");
  await settle();
  live.io.enqueueResize(100, 24);
  await settle();
  assertEquals(
    live.observations.map((observation) => observation.paint),
    ["keyframe", "rows", "keyframe", "keyframe"],
  );
  // The pointer leaves one row, enters another, and the position counter changes.
  assertEquals(live.observations[1]?.rowsWritten, 3);
  assert(live.observations[1]!.bytesWritten < live.observations[1]!.frameBytes);
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
    { focusedControlId: "items", listId: "items", selectedItemId: "item-0" },
  );
  reported.io.enqueueKeys("down", "down");
  await settle();
  const capture = captureTerminalFrame(
    reported.io.output(),
    reported.io.size(),
  );
  assertEquals(capture.state?.selectedItemId, "item-2");
  assert(capture.text.includes("Item 2"));
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
