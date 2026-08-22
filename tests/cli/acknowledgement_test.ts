import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  createSequentialForm,
  InteractionCancelled,
  requestAcknowledgement,
  requestConfirmation,
} from "../../src/cli/interactive/mod.ts";
import { renderFieldCli } from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  FakeTerminalIO,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

Deno.test("Enter and Space acknowledge; other keys hold the frame", async () => {
  const entered = new FakeTerminalIO(["\r"], { columns: 32 });
  assertEquals(
    await requestAcknowledgement({
      label: "Notice",
      message: "Review the plan above.",
    }, { io: entered }),
    undefined,
  );
  assertEquals(entered.rawTransitions, [true, false]);

  const spaced = new FakeTerminalIO([" "], { columns: 32 });
  await requestAcknowledgement({
    label: "Notice",
    message: "Review the plan above.",
  }, { io: spaced });

  const held = new FakeTerminalIO(["x", "q", "\x1b[B", "\r"], { columns: 32 });
  await requestAcknowledgement({
    label: "Notice",
    message: "Review the plan above.",
  }, { io: held });
  const submissions = held.writes.filter((write) =>
    write.includes("✓ Submitted")
  );
  assertEquals(
    submissions.length,
    1,
    "only the final Enter may acknowledge; other keys hold the active frame",
  );
});

Deno.test("acknowledgement paints exact active and submitted frames", async () => {
  const capabilities = testTerminalCapabilities({ columns: 32 });
  const io = new FakeTerminalIO(["\r"], { columns: 32 });
  await requestAcknowledgement({
    label: "Notice",
    message: "Review the plan above.",
  }, { io });
  assertExactFrame(
    io.writes[1] ?? "",
    "Notice\n┌──────────────────────────────┐\n│ Review the plan above.       │\n└──────────────────────────────┘\nPress Enter to continue.",
    capabilities,
  );
  const submitted = io.writes.find((write) => write.includes("✓ Submitted")) ??
    "";
  assertExactFrame(
    submitted.slice(submitted.indexOf("\x1b[J") + "\x1b[J".length),
    "Notice\n┌──────────────────────────────┐\n│ Review the plan above.       │\n└──────────────────────────────┘\n✓ Submitted",
    capabilities,
  );
});

Deno.test("acknowledgement frames hold across widths, depths, and repertoires", () => {
  const state = {
    kind: "acknowledgement" as const,
    label: "Notice",
    lifecycle: { status: "active" as const },
    message: "Review the plan above.",
    hint: "Press Enter to continue.",
  };
  const narrow = testTerminalCapabilities({ columns: 20 });
  assertExactFrame(
    renderFieldCli({ ...state, width: 20 }, narrow),
    "Notice\n┌──────────────────┐\n│ Review the plan  │\n│ above.           │\n└──────────────────┘\nPress Enter to cont…",
    narrow,
  );
  const ascii = testTerminalCapabilities({ columns: 32, unicode: false });
  assertExactFrame(
    renderFieldCli({ ...state, width: 32 }, ascii),
    "Notice\n+------------------------------+\n| Review the plan above.       |\n+------------------------------+\nPress Enter to continue.",
    ascii,
  );
  const styled = testTerminalCapabilities({
    columns: 32,
    colorDepth: "truecolor",
  });
  assertStyledFrame(
    renderFieldCli({ ...state, width: 32 }, styled),
    "Notice\n┌──────────────────────────────┐\n│ Review the plan above.       │\n└──────────────────────────────┘\nPress Enter to continue.",
    styled,
  );
});

Deno.test("acknowledgement follows the standard cancellation contract", async () => {
  const reasons: ReadonlyArray<readonly [string, string]> = [
    ["\x1b", "Dismissed."],
    ["\x03", "Cancelled."],
    ["", "Input ended."],
  ];
  for (const [chunk, reason] of reasons) {
    const io = new FakeTerminalIO(chunk === "" ? [] : [chunk], { columns: 32 });
    const error = await assertRejects(
      () =>
        requestAcknowledgement({
          label: "Notice",
          message: "Review the plan above.",
        }, { io }),
      InteractionCancelled,
    );
    assertEquals(error.reason, reason);
    assertEquals(io.rawTransitions, [true, false]);
  }
});

Deno.test("acknowledgement validates its message before any terminal mutation", async () => {
  for (const message of ["", "   ", "bad\u0007bell"]) {
    const io = new FakeTerminalIO(["\r"], { columns: 32 });
    await assertRejects(
      () => requestAcknowledgement({ label: "Notice", message }, { io }),
      TypeError,
      "acknowledgement message",
    );
    assertEquals(io.writes, []);
    assertEquals(io.rawTransitions, []);
  }
});

Deno.test("acknowledgement honors caller hints, reservations, and refusals", async () => {
  const hinted = new FakeTerminalIO(["\r"], { columns: 40 });
  await requestAcknowledgement({
    label: "Notice",
    message: "Review the plan above.",
    hint: "Space also continues.",
  }, { io: hinted });
  assert(hinted.output().includes("Space also continues."));
  assert(!hinted.output().includes("Press Enter to continue."));

  const reserved = new FakeTerminalIO(["\r"], { columns: 40, rows: 20 });
  await requestAcknowledgement({
    label: "Notice",
    message: "Review the plan above.",
    reservedRows: 14,
  }, { io: reserved });
  for (const write of reserved.writes) {
    const eraseAt = write.indexOf("\x1b[J");
    const frame = write.startsWith("\x1b[1G") && eraseAt >= 0
      ? write.slice(eraseAt + "\x1b[J".length)
      : write;
    if (!frame.startsWith("Notice\n")) continue;
    const rows = frame.replace(/\n$/u, "").split("\n").length;
    assert(
      rows <= 6,
      `acknowledgement rendered ${rows} rows over a reservation`,
    );
  }

  const short = new FakeTerminalIO(["\r"], { columns: 40, rows: 20 });
  await assertRejects(
    () =>
      requestAcknowledgement({
        label: "Notice",
        message: Array.from({ length: 12 }, (_, index) => `Line ${index + 1}`)
          .join("\n"),
        reservedRows: 10,
      }, { io: short }),
    TypeError,
    "cannot hold a coherent interaction frame",
  );
  assertEquals(short.rawTransitions, [true, false]);
});

Deno.test("acknowledgement steps join sequential forms with Ctrl+U back-navigation", async () => {
  const io = new FakeTerminalIO(["y\r", "\x15", "n\r", "\r"], { columns: 40 });
  const values = await createSequentialForm({ label: "Walkthrough", io })
    .add({
      id: "ready",
      label: "Ready",
      run: (_values, previous, runtime) =>
        requestConfirmation({
          label: "Ready?",
          initialValue: typeof previous === "boolean" ? previous : true,
        }, runtime),
    })
    .add({
      id: "notice",
      label: "Notice",
      run: async (_values, _previous, runtime) => {
        await requestAcknowledgement({
          label: "Notice",
          message: "The next step is destructive.",
        }, runtime);
        return "acknowledged";
      },
    })
    .submit();
  assertEquals(values, { ready: false, notice: "acknowledged" });
  assert(io.output().includes("Back."));
});
