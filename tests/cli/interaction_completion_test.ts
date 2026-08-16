import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { renderFieldCli } from "../../src/cli/mod.ts";
import {
  type AcknowledgementRequestOptions,
  type CompactAcknowledgementRequestOptions,
  HIDE_TERMINAL_CURSOR,
  InteractionCancelled,
  InteractionFrameCleanupError,
  requestAcknowledgement,
  requestText,
  SHOW_TERMINAL_CURSOR,
} from "../../src/cli/interactive/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  FakeSignalSource,
  FakeTerminalIO,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

const compactOptions = {
  presentation: "compact",
} satisfies CompactAcknowledgementRequestOptions;
const framedOptions = {
  label: "Notice",
  message: "Review the summary.",
} satisfies AcknowledgementRequestOptions;
type CompactRejectsVisibleLabel = {
  readonly presentation: "compact";
  readonly label: string;
} extends CompactAcknowledgementRequestOptions ? false : true;
const compactRejectsVisibleLabel: CompactRejectsVisibleLabel = true;

interface ExtendedAcknowledgementOptions extends AcknowledgementRequestOptions {
  readonly auditId?: string;
}

const extendedFramedOptions = {
  label: "Notice",
  message: "Review the summary.",
  auditId: "audit-1",
} satisfies ExtendedAcknowledgementOptions;

type PublicAcknowledgementOptions = Parameters<
  typeof requestAcknowledgement
>[0];
const publicCompactOptions =
  compactOptions satisfies PublicAcknowledgementOptions;
const publicFramedOptions =
  framedOptions satisfies PublicAcknowledgementOptions;
const requestWithPublicAcknowledgementOptions = (
  options: PublicAcknowledgementOptions,
): Promise<void> => requestAcknowledgement(options);

async function until(condition: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("condition never held");
}

function assertClearWrite(io: FakeTerminalIO): void {
  assert(
    io.writes.some((write) =>
      write.startsWith("\x1b[1G") && write.endsWith("\x1b[J")
    ),
    "successful cleanup emitted no painter-owned erase",
  );
}

Deno.test("acknowledgement options discriminate framed and compact forms", () => {
  assertEquals(compactOptions.presentation, "compact");
  assertEquals(framedOptions.message, "Review the summary.");
  assertEquals(compactRejectsVisibleLabel, true);
  assertEquals(extendedFramedOptions.auditId, "audit-1");
  assertEquals(publicCompactOptions.presentation, "compact");
  assertEquals(publicFramedOptions.message, "Review the summary.");
  assertEquals(typeof requestWithPublicAcknowledgementOptions, "function");
});

Deno.test("the pure compact acknowledgement is only a continuation fact", () => {
  const state = {
    kind: "acknowledgement" as const,
    presentation: "compact" as const,
    lifecycle: { status: "active" as const },
    hint: "Press Enter to continue.",
  };
  const unicode = testTerminalCapabilities({ columns: 32 });
  assertExactFrame(
    renderFieldCli(state, unicode),
    "Press Enter to continue.",
    unicode,
  );
  const ascii = testTerminalCapabilities({ columns: 32, unicode: false });
  assertExactFrame(
    renderFieldCli(state, ascii),
    "Press Enter to continue.",
    ascii,
  );
  const styled = testTerminalCapabilities({
    columns: 32,
    colorDepth: "truecolor",
  });
  assertStyledFrame(
    renderFieldCli(state, styled),
    "Press Enter to continue.",
    styled,
  );
  assertExactFrame(
    renderFieldCli({
      ...state,
      lifecycle: { status: "cancelled", reason: "Dismissed." },
    }, unicode),
    "× Dismissed.",
    unicode,
  );
  assertEquals(
    renderFieldCli({
      ...state,
      lifecycle: { status: "submitted" },
    }, unicode),
    "",
  );
});

Deno.test("compact acknowledgement accepts Enter and Space then clears", async () => {
  for (const key of ["\r", " "]) {
    const io = new FakeTerminalIO([key], { columns: 32 });
    assertEquals(
      await requestAcknowledgement({ presentation: "compact" }, { io }),
      undefined,
    );
    assertEquals(io.rawTransitions, [true, false]);
    assertStringIncludes(io.output(), "Press Enter to continue.");
    assert(!io.output().includes("[submitted]"));
    assert(!io.output().includes("Submitted"));
    assertClearWrite(io);
    assertEquals(io.writes[0], HIDE_TERMINAL_CURSOR);
    assertEquals(io.writes.at(-1), SHOW_TERMINAL_CURSOR);
  }
});

Deno.test("compact acknowledgement preserves cancellation and EOF facts", async () => {
  const cases: ReadonlyArray<readonly [readonly string[], string]> = [
    [["\x1b"], "Dismissed."],
    [["\x03"], "Cancelled."],
    [[], "Input ended."],
  ];
  for (const [chunks, reason] of cases) {
    const io = new FakeTerminalIO(chunks, { columns: 32 });
    const error = await assertRejects(
      () => requestAcknowledgement({ presentation: "compact" }, { io }),
      InteractionCancelled,
      reason,
    );
    assertEquals(error.reason, reason);
    assertStringIncludes(io.output(), reason);
    assertEquals(io.rawTransitions, [true, false]);
    assertEquals(io.writes.at(-1), SHOW_TERMINAL_CURSOR);
  }
});

Deno.test("compact acknowledgement uses reservations and custom hints", async () => {
  const io = new FakeTerminalIO(["\r"], { columns: 32, rows: 3 });
  await requestAcknowledgement({
    presentation: "compact",
    hint: "Continue with Enter.",
    reservedRows: 2,
  }, { io });
  assertStringIncludes(io.output(), "Continue with Enter.");
  assert(!io.output().includes("Press Enter to continue."));
  assertClearWrite(io);
});

Deno.test("compact acknowledgement follows request SIGINT restoration", async () => {
  const io = new FakeTerminalIO([], {
    columns: 32,
    holdOpen: true,
  });
  const signals = new FakeSignalSource();
  const pending = requestAcknowledgement({ presentation: "compact" }, {
    io,
    signals,
  }).catch((error) => error);
  await until(() => io.output().includes("Press Enter to continue."));
  signals.deliver();
  assertEquals(signals.raised, 1);
  assertStringIncludes(io.output(), "Cancelled.");
  assertEquals(io.rawTransitions, [true, false]);
  assertEquals(io.writes.at(-1), SHOW_TERMINAL_CURSOR);
  io.close();
  assert(await pending instanceof InteractionCancelled);
  assertEquals(
    io.writes.filter((write) => write === SHOW_TERMINAL_CURSOR).length,
    1,
  );
});

Deno.test("completion policy retains by default and clears only when selected", async () => {
  const retained = new FakeTerminalIO(["ok\r"], { columns: 32 });
  assertEquals(await requestText({ label: "Name" }, { io: retained }), "ok");
  assertStringIncludes(retained.output(), "[submitted]");
  assertStringIncludes(retained.output(), "Submitted");

  const cleared = new FakeTerminalIO(["ok\r"], { columns: 32 });
  assertEquals(
    await requestText({ label: "Name", completion: "clear-frame" }, {
      io: cleared,
    }),
    "ok",
  );
  assert(!cleared.output().includes("[submitted]"));
  assert(!cleared.output().includes("Submitted"));
  assertClearWrite(cleared);
});

Deno.test("validation stays visible until a later successful cleanup", async () => {
  const io = new FakeTerminalIO(["\r", "x\r"], { columns: 32 });
  assertEquals(
    await requestText({
      label: "Required",
      required: true,
      completion: "clear-frame",
    }, { io }),
    "x",
  );
  assertStringIncludes(io.output(), "Required.");
  assertStringIncludes(io.output(), "[error]");
  assert(!io.output().includes("[submitted]"));
  assertClearWrite(io);
});

Deno.test("clear-frame cancellation retains the established cancelled frame", async () => {
  const io = new FakeTerminalIO(["\x1b"], { columns: 32 });
  await assertRejects(
    () => requestText({ label: "Name", completion: "clear-frame" }, { io }),
    InteractionCancelled,
    "Dismissed.",
  );
  assertStringIncludes(io.output(), "[cancelled]");
  assertStringIncludes(io.output(), "Dismissed.");
  assertEquals(io.writes.at(-2), "\n");
  assertEquals(io.writes.at(-1), SHOW_TERMINAL_CURSOR);
});

Deno.test("clear-frame refuses unavailable ANSI control before mutation", async () => {
  const runs = [
    (io: FakeTerminalIO) =>
      requestText({ label: "Name", completion: "clear-frame" }, { io }),
    (io: FakeTerminalIO) =>
      requestAcknowledgement({ presentation: "compact" }, { io }),
  ];
  for (const run of runs) {
    const io = new FakeTerminalIO(["\r"], {
      ansiControl: false,
      columns: 32,
    });
    const error = await assertRejects(
      () => run(io),
      InteractionFrameCleanupError,
      "ansi-control-unavailable",
    );
    assertEquals(error.reason, "ansi-control-unavailable");
    assertEquals(io.rawTransitions, []);
    assertEquals(io.writes, []);
  }
});

Deno.test("completion cleanup succeeds after a benign resize", async () => {
  const io = new FakeTerminalIO([], { columns: 32, rows: 8 });
  io.enqueueResize(48, 12);
  io.enqueue("ok\r");
  assertEquals(
    await requestText({ label: "Name", completion: "clear-frame" }, { io }),
    "ok",
  );
  assertClearWrite(io);
  assertEquals(io.rawTransitions, [true, false]);
});

Deno.test("completion cleanup reports viewport shrink without guessing geometry", async () => {
  const io = new FakeTerminalIO([], { columns: 32, rows: 8 });
  io.enqueueResize(32, 2);
  io.enqueue("\r");
  const error = await assertRejects(
    () => requestText({ label: "Name", completion: "clear-frame" }, { io }),
    InteractionFrameCleanupError,
    "current-frame-exceeds-viewport",
  );
  assertEquals(error.reason, "current-frame-exceeds-viewport");
  assertEquals(io.rawTransitions, [true, false]);
  assertEquals(io.writes.filter((write) => write === "\n"), []);
  assertEquals(io.writes.at(-1), SHOW_TERMINAL_CURSOR);
});

Deno.test("completion cleanup reports control loss after painting", async () => {
  class LosingControlTerminal extends FakeTerminalIO {
    #control = true;

    override read(): Promise<Uint8Array | null> {
      this.#control = false;
      return super.read();
    }

    override capabilities(): ReturnType<FakeTerminalIO["capabilities"]> {
      return { ...super.capabilities(), ansiControl: this.#control };
    }
  }

  const io = new LosingControlTerminal(["\r"], { columns: 32 });
  const error = await assertRejects(
    () => requestText({ label: "Name", completion: "clear-frame" }, { io }),
    InteractionFrameCleanupError,
    "ansi-control-unavailable",
  );
  assertEquals(error.reason, "ansi-control-unavailable");
  assertStringIncludes(io.output(), "Name [active]");
  assertEquals(io.rawTransitions, [true, false]);
  assertEquals(io.writes.at(-1), SHOW_TERMINAL_CURSOR);
});

Deno.test("completion cleanup write failures restore once and propagate", async () => {
  class FailingCleanupTerminal extends FakeTerminalIO {
    override write(value: string): void {
      if (value.startsWith("\x1b[1G") && value.endsWith("\x1b[J")) {
        throw new Error("cleanup write failed");
      }
      super.write(value);
    }
  }

  for (
    const run of [
      (io: FakeTerminalIO) =>
        requestText({ label: "Name", completion: "clear-frame" }, { io }),
      (io: FakeTerminalIO) =>
        requestAcknowledgement({ presentation: "compact" }, { io }),
    ]
  ) {
    const io = new FailingCleanupTerminal(["\r"], { columns: 32 });
    await assertRejects(() => run(io), Error, "cleanup write failed");
    assertEquals(io.rawTransitions, [true, false]);
    assertEquals(io.writes[0], HIDE_TERMINAL_CURSOR);
    assertEquals(io.writes.at(-1), SHOW_TERMINAL_CURSOR);
    assertEquals(
      io.writes.filter((write) => write === SHOW_TERMINAL_CURSOR).length,
      1,
    );
  }
});
