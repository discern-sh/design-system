import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  withDeterminateProgress,
  withSpinner,
} from "../../src/cli/interactive/activity.ts";
import {
  HIDE_TERMINAL_CURSOR,
  SHOW_TERMINAL_CURSOR,
} from "../../src/cli/interactive/lifecycle.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  FakeTerminalIO,
} from "../../src/cli/interactive/testing.ts";
import renderMeterCli from "../../src/components/feedback/meter/meter.cli.ts";

function paintedFrames(io: FakeTerminalIO): readonly string[] {
  const eraseToEnd = "\x1b[J";
  return io.writes.flatMap((write) => {
    if (
      write === HIDE_TERMINAL_CURSOR || write === SHOW_TERMINAL_CURSOR ||
      write === "\n"
    ) {
      return [];
    }
    const eraseAt = write.indexOf(eraseToEnd);
    const frame = eraseAt >= 0
      ? write.slice(eraseAt + eraseToEnd.length)
      : write;
    return frame === "" ? [] : [frame];
  });
}

async function runLabelledProgress(io: FakeTerminalIO): Promise<void> {
  await withDeterminateProgress({
    label: "Quality gate",
    total: 4,
    io,
  }, (progress) => {
    assertEquals(progress.label, "Quality gate");
    progress.relabel("fmt");
    assertEquals(progress.label, "fmt");
    progress.advance(1, "lint");
    assertEquals(progress.label, "lint");
    progress.set(3, "tests");
    assertEquals(progress.completed, 3);
    progress.advance();
    return undefined;
  });
}

Deno.test("progress label changes paint exact Unicode frames at stable geometry", async () => {
  const io = new FakeTerminalIO([], { columns: 20 });
  await runLabelledProgress(io);
  const frames = paintedFrames(io);
  const expected = [
    "Quality gate\n[  0%] ▶────────────",
    "fmt\n[  0%] ▶────────────",
    "lint\n[ 25%] ━━━▶─────────",
    "tests\n[ 75%] ━━━━━━━━━▶───",
    "tests\n[100%] ━━━━━━━━━━━━▶\n✓ Complete",
  ];
  assertEquals(frames.length, expected.length);
  for (const [index, frame] of frames.entries()) {
    assertExactFrame(frame, expected[index] ?? "", io.capabilities());
  }
  for (const frame of frames.slice(0, -1)) {
    assertEquals(
      frame.split("\n").length,
      2,
      "label changes must never move the frame's geometry",
    );
    assert(!frame.includes("Complete"), "completion must stay genuine");
  }
});

Deno.test("progress label changes paint exact ASCII frames", async () => {
  const io = new FakeTerminalIO([], { columns: 20, unicode: false });
  await runLabelledProgress(io);
  assertEquals(paintedFrames(io), [
    "Quality gate\n[  0%] >------------",
    "fmt\n[  0%] >------------",
    "lint\n[ 25%] ===>---------",
    "tests\n[ 75%] =========>---",
    "tests\n[100%] ============>\nOK Complete",
  ]);
});

Deno.test("relabelled progress frames stay byte-equal to Meter at every colour depth", async () => {
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const io = new FakeTerminalIO([], { columns: 20, colorDepth });
    await withDeterminateProgress({
      label: "Audit",
      total: 4,
      io,
    }, (progress) => {
      progress.advance(1, "grain");
      return undefined;
    });
    const relabelled = paintedFrames(io)[1] ?? "";
    const expected = renderMeterCli({
      kind: "determinate-progress",
      label: "grain",
      lifecycle: { status: "active" },
      completed: 1,
      total: 4,
      width: 20,
    }, io.capabilities());
    assertEquals(
      relabelled,
      expected,
      `relabelled ${colorDepth} frame must match the Meter renderer byte-for-byte`,
    );
    assertStyledFrame(relabelled, "grain\n[ 25%] ━━━▶─────────", {
      ...io.capabilities(),
      colorDepth: "none",
    });
  }
});

Deno.test("a repeated label repaints nothing and completion stays truthful", async () => {
  const io = new FakeTerminalIO([], { columns: 20 });
  await withDeterminateProgress({
    label: "Work",
    total: 2,
    io,
  }, (progress) => {
    progress.relabel("Work");
    progress.set(1);
    progress.set(1, "Work");
    return undefined;
  });
  const frames = paintedFrames(io);
  assertEquals(frames, [
    "Work\n[  0%] ▶────────────",
    "Work\n[ 50%] ━━━━━━▶──────",
    "Work\n[100%] ━━━━━━━━━━━━▶\n✓ Complete",
  ]);
});

Deno.test("activity labels reject control and format characters everywhere", async () => {
  const io = new FakeTerminalIO([], { columns: 20 });
  await assertRejects(
    () => withSpinner({ label: "two\nlines", io }, () => undefined),
    TypeError,
    "control and format",
  );
  await assertRejects(
    () =>
      withDeterminateProgress(
        { label: "zero\u200Dwidth", total: 2, io },
        () => undefined,
      ),
    TypeError,
    "control and format",
  );
  const clean = new FakeTerminalIO([], { columns: 20 });
  await withDeterminateProgress({
    label: "Work",
    total: 2,
    io: clean,
  }, (progress) => {
    for (
      const update of [
        () => progress.relabel("broken\nlabel"),
        () => progress.set(1, "broken\u0007label"),
        () => progress.advance(1, "broken\u200Blabel"),
      ]
    ) {
      let failed = false;
      try {
        update();
      } catch (error) {
        failed = error instanceof TypeError;
      }
      assert(failed, "an invalid label update must throw a TypeError");
    }
    assertEquals(progress.completed, 0, "failed updates must change nothing");
    assertEquals(progress.label, "Work");
    progress.set(2);
    return undefined;
  });
});
