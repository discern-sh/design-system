import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import {
  createTerminalApplicationModel,
  TERMINAL_ANIMATION_INTERVAL_MS,
  type TerminalApplicationView,
} from "../../src/cli/interactive/mod.ts";
import {
  BEGIN_SYNCHRONIZED_UPDATE,
  END_SYNCHRONIZED_UPDATE,
} from "../../src/cli/interactive/painter.ts";
import { ManualTerminalClock } from "../../src/cli/interactive/testing.ts";
import {
  applicationSession,
  type ApplicationSessionOptions,
  settle,
} from "../fixtures/application-session.ts";
import { testView } from "../fixtures/application-views.ts";

function view(animated = true, count = 3): TerminalApplicationView<string> {
  return testView(
    Array.from({ length: count }, (_, index) => ({
      id: `item-${index}`,
      animated: animated && index === 0,
    })),
    { body: "list" },
  );
}

const session = (
  options: ApplicationSessionOptions & {
    readonly view?: TerminalApplicationView<string>;
  } = {},
) => applicationSession(options.view ?? view(), options);

const firstRow = (frame: string): string =>
  frame.split("\n").find((line) => line.includes("Item item-0")) ?? "";

Deno.test("a visible animated glyph ticks at four frames a second and writes only its row", async () => {
  const live = await session();
  assertEquals(live.clock.pending, 1);
  assertStringIncludes(firstRow(live.frame()), "◐");
  const spinner: string[] = [];
  for (let tick = 0; tick < 4; tick += 1) {
    live.clock.advance(TERMINAL_ANIMATION_INTERVAL_MS);
    await settle();
    spinner.push(firstRow(live.frame()).match(/[◐◓◑◒]/u)?.[0] ?? "");
  }
  assertEquals(spinner, ["◓", "◑", "◒", "◐"]);
  const ticks = live.observations.slice(1);
  assertEquals(ticks.map((observation) => observation.paint), [
    "rows",
    "rows",
    "rows",
    "rows",
  ]);
  for (const tick of ticks) {
    assertEquals(tick.rowsWritten, 1);
    assert(tick.bytesWritten < tick.frameBytes / 10);
  }
  for (const write of live.io.writes.filter((value) => value !== "")) {
    if (!write.startsWith(BEGIN_SYNCHRONIZED_UPDATE)) continue;
    assert(write.endsWith(END_SYNCHRONIZED_UPDATE));
  }
  await live.finish();
  assertEquals(live.clock.pending, 0);
});

Deno.test("the tick stops when no animated glyph is visible, frozen, or moving", async () => {
  const frozen = await session();
  frozen.context().update(view(false));
  await settle();
  assertEquals(frozen.clock.pending, 0);
  frozen.context().update(view(true));
  await settle();
  assertEquals(frozen.clock.pending, 1);
  frozen.io.enqueueResize(31, 9);
  await settle();
  assertEquals(frozen.clock.pending, 0, "a too-small screen never ticks");
  await frozen.finish();

  for (
    const quiet of [
      { unicode: false },
      { runtime: { reducedMotion: true } },
    ]
  ) {
    const live = await session(quiet);
    assertEquals(live.clock.pending, 0);
    assertStringIncludes(
      firstRow(live.frame()),
      "unicode" in quiet ? "@" : "◐",
    );
    live.clock.advance(TERMINAL_ANIMATION_INTERVAL_MS * 4);
    await settle();
    assertEquals(live.observations.length, 1);
    await live.finish();
  }
});

Deno.test("a scrolled-away animated glyph does not keep the tick alive", async () => {
  const live = await session({ rows: 10, view: view(true, 40) });
  assertEquals(live.clock.pending, 1);
  live.io.enqueueKeys("end");
  await settle();
  assert(!live.frame().includes("Item 0"));
  assertEquals(live.clock.pending, 0);
  await live.finish();
});

Deno.test("foreground work stops the tick, and the phase resumes after return", async () => {
  let pendingDuringForeground = -1;
  const clock = new ManualTerminalClock();
  const live = await session({
    clock,
    onAction: () => ({
      kind: "foreground",
      run: () => {
        pendingDuringForeground = clock.pending;
      },
    }),
  });
  live.clock.advance(TERMINAL_ANIMATION_INTERVAL_MS);
  await settle();
  live.io.enqueueKeys("enter");
  await settle();
  assertEquals(pendingDuringForeground, 0);
  assertEquals(live.clock.pending, 1);
  assertStringIncludes(firstRow(live.frame()), "◓");
  await live.finish();
});

Deno.test("a changing screen keyframes at the interval while idle screens write nothing", async () => {
  const live = await session();
  // Each tick schedules its successor after the repaint it causes, so time
  // advances one frame at a time, as it would for a real terminal.
  const ticks = 30_000 / TERMINAL_ANIMATION_INTERVAL_MS;
  for (let tick = 0; tick < ticks; tick += 1) {
    live.clock.advance(TERMINAL_ANIMATION_INTERVAL_MS);
    await settle();
  }
  const kinds = live.observations.map((observation) => observation.paint);
  assertEquals(kinds.length, 1 + ticks);
  assertEquals(kinds.filter((kind) => kind === "keyframe").length, 2);
  assertEquals(kinds.at(-1), "keyframe", "the paint at 30 s is a keyframe");
  live.context().update(view(false));
  await settle();
  const before = live.io.writes.length;
  live.clock.advance(60_000);
  await settle();
  assertEquals(live.io.writes.length, before);
  await live.finish();
});

Deno.test("animated markers are one plain cell and name the spinner", () => {
  const marked = (marker: Record<string, unknown>) => {
    const base = view(false, 1);
    const body = base.body;
    if (body.kind !== "list") throw new Error("expected a list body");
    const [group] = body.list.groups;
    const [item] = group?.items ?? [];
    if (group === undefined || item === undefined) throw new Error("no item");
    return {
      ...base,
      body: {
        ...body,
        list: {
          ...body.list,
          groups: [{ ...group, items: [{ ...item, marker: marker as never }] }],
        },
      },
    } satisfies TerminalApplicationView<string>;
  };
  for (
    const invalid of [
      { unicode: "Working", ascii: "@", animation: "spinner" },
      { unicode: "◐", ascii: "@@", animation: "spinner" },
      { unicode: "", ascii: "@", animation: "spinner" },
      { unicode: "◐", ascii: "@", animation: "pulse" },
    ]
  ) {
    assertThrows(
      () => createTerminalApplicationModel(marked(invalid)),
      TypeError,
    );
  }
});
