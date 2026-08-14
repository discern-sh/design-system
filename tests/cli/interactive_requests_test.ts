import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import {
  createSequentialForm,
  HIDE_TERMINAL_CURSOR,
  InteractionCancelled,
  NonInteractiveTerminalError,
  requestAutocomplete,
  requestConfirmation,
  requestMaskedText,
  requestSearch,
  requestSelection,
  requestSelections,
  requestText,
  requestTextarea,
  SHOW_TERMINAL_CURSOR,
  withDeterminateProgress,
  withSpinner,
} from "../../src/cli/interactive/mod.ts";
import { FakeTerminal } from "./fake-terminal.ts";

function assertRestored(io: FakeTerminal): void {
  assertEquals(io.rawTransitions.at(-1), false);
  assertEquals(io.writes.at(-1), SHOW_TERMINAL_CURSOR);
}

function frameSequence(io: FakeTerminal): readonly string[] {
  const firstColumn = "\x1b[1G";
  const eraseToEnd = "\x1b[J";
  return io.writes.flatMap((write) => {
    const eraseAt = write.indexOf(eraseToEnd);
    const frame = write.startsWith(firstColumn) && eraseAt >= 0
      ? write.slice(eraseAt + eraseToEnd.length)
      : write;
    return /\[(?:active|error|submitted|cancelled)\]/u.test(frame)
      ? [frame]
      : [];
  });
}

async function until(condition: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("condition never held");
}

Deno.test("text interaction edits, validates, submits, and restores terminal state", async () => {
  const io = new FakeTerminal(["\r", "J", "e", "s", "s", "\r"], {
    columns: 32,
  });
  const result = await requestText({ label: "Name", required: true }, { io });
  assertEquals(result, "Jess");
  assertEquals(io.rawTransitions, [true, false]);
  assertEquals(io.writes[0], HIDE_TERMINAL_CURSOR);
  assertRestored(io);
  assertStringIncludes(io.output(), "Required.");
  assertStringIncludes(io.output(), "Jess");
});

Deno.test("masked interaction never writes the raw secret", async () => {
  const io = new FakeTerminal(["secret\r"], { columns: 32 });
  assertEquals(
    await requestMaskedText({ label: "Secret", required: true }, { io }),
    "secret",
  );
  assert(
    !io.output().includes("secret"),
    "raw secret leaked into terminal output",
  );
  assertStringIncludes(io.output(), "••••••");
  assertRestored(io);
});

Deno.test("Ctrl+C and EOF cancel with exact cleanup", async () => {
  const cancelled = new FakeTerminal(["x\x03"], { columns: 32 });
  await assertRejects(
    () => requestText({ label: "Cancel" }, { io: cancelled }),
    InteractionCancelled,
    "Cancelled.",
  );
  assertEquals(cancelled.rawTransitions, [true, false]);
  assertRestored(cancelled);
  assertStringIncludes(cancelled.output(), "Cancelled.");

  const ended = new FakeTerminal([], { columns: 32 });
  await assertRejects(
    () => requestText({ label: "End" }, { io: ended }),
    InteractionCancelled,
    "Input ended.",
  );
  assertEquals(ended.rawTransitions, [true, false]);
  assertRestored(ended);
  assertStringIncludes(ended.output(), "Input ended.");
});

Deno.test("a failed submission latches the validator to every value change", async () => {
  const calls: string[] = [];
  const io = new FakeTerminal(["ab\r", "\x1b[A", "c", "\x7f", "c\r"], {
    columns: 40,
  });
  const result = await requestText({
    label: "Latch",
    validate: (value) => {
      calls.push(value);
      return value.length >= 3 ? undefined : "Too short.";
    },
  }, { io });
  assertEquals(result, "abc");
  assertEquals(calls, ["ab", "abc", "ab", "abc", "abc"]);
  const frames = frameSequence(io);
  assertEquals(frames.filter((frame) => frame.includes("Too short.")).length, 2);
  const firstError = frames.findIndex((frame) => frame.includes("Too short."));
  assert(firstError >= 0, "the failed submission painted no message");
  const afterError = frames[firstError + 1] ?? "";
  assert(
    afterError.includes("abc") && !afterError.includes("Too short."),
    "the message must persist through the no-op arrow key and clear on the fixing edit",
  );
  assert(
    (frames[firstError + 2] ?? "").includes("Too short."),
    "the message must return live when an edit makes the value invalid again",
  );
  assertRestored(io);
});

Deno.test("submission while invalid re-presents the message and re-runs the validator", async () => {
  const calls: string[] = [];
  const io = new FakeTerminal(["x\r", "\r", "yz\r"], { columns: 40 });
  const result = await requestText({
    label: "Retry",
    validate: (value) => {
      calls.push(value);
      return value.length >= 3 ? undefined : "Use three characters.";
    },
  }, { io });
  assertEquals(result, "xyz");
  assertEquals(calls, ["x", "x", "xy", "xyz", "xyz"]);
});

Deno.test("stale asynchronous verdicts are discarded while a fast typist edits", async () => {
  const io = new FakeTerminal(["ab\r"], { columns: 40, holdOpen: true });
  const pending: Array<{
    readonly value: string;
    readonly resolve: (message: string | undefined) => void;
  }> = [];
  const request = requestText({
    label: "Async",
    validate: (value) =>
      new Promise<string | undefined>((resolve) =>
        pending.push({ value, resolve })
      ),
  }, { io });
  await until(() => pending.length === 1);
  pending[0]?.resolve("Not yet.");
  await until(() => io.output().includes("Not yet."));

  io.enqueue("c");
  await until(() => pending.length === 2);
  io.enqueue("d");
  await until(() => pending.length === 3);
  assertEquals(
    pending.map(({ value }) => value),
    ["ab", "abc", "abcd"],
    "an in-flight verdict must never block further edits",
  );

  pending[2]?.resolve(undefined);
  await until(() => !(frameSequence(io).at(-1) ?? "").includes("Not yet."));
  pending[1]?.resolve("Stale problem.");
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert(
    !io.output().includes("Stale problem."),
    "a verdict superseded by a newer edit must be discarded",
  );

  io.enqueue("\r");
  await until(() => pending.length === 4);
  pending[3]?.resolve(undefined);
  assertEquals(await request, "abcd");
  assertRestored(io);
});

Deno.test("a rejecting live re-validation faults the interaction and restores", async () => {
  const io = new FakeTerminal(["x\r"], { columns: 40, holdOpen: true });
  let verdicts = 0;
  const request = requestText({
    label: "Fault",
    validate: () => {
      verdicts += 1;
      return verdicts === 1
        ? Promise.resolve("Not yet.")
        : Promise.reject(new Error("validator broke"));
    },
  }, { io });
  await until(() => io.output().includes("Not yet."));
  io.enqueue("y");
  await assertRejects(() => request, Error, "validator broke");
  assertEquals(io.rawTransitions, [true, false]);
  assertRestored(io);
});

Deno.test("the no-previous-step notice clears on the next key and restores the latched message", async () => {
  const io = new FakeTerminal(["x\r", "\x15", "\x1b[A", "yz\r"], {
    columns: 40,
  });
  const result = await requestText({
    label: "Notice",
    validate: (value) =>
      value.length >= 3 ? undefined : "Use three characters.",
  }, { io });
  assertEquals(result, "xyz");
  const frames = frameSequence(io);
  const notice = frames.findIndex((frame) =>
    frame.includes("There is no previous form step.")
  );
  assert(notice >= 0, "Ctrl+U outside a form must present its notice");
  const restored = frames[notice + 1] ?? "";
  assert(
    restored.includes("Use three characters.") &&
      !restored.includes("previous form step"),
    "the next key must restore the latched message beneath the notice",
  );
});

Deno.test("transform canonicalises before validation and shapes the returned value", async () => {
  const seen: string[] = [];
  const io = new FakeTerminal(["  hi  \r"], { columns: 40 });
  const result = await requestText({
    label: "Trimmed",
    transform: (value) => value.trim(),
    validate: (value) => {
      seen.push(value);
      return undefined;
    },
  }, { io });
  assertEquals(result, "hi");
  assertEquals(seen, ["hi"]);

  const requiredIo = new FakeTerminal(["   \r", "\x7f\x7f\x7fok\r"], {
    columns: 40,
  });
  assertEquals(
    await requestText({
      label: "Required",
      required: "Give a real value.",
      transform: (value) => value.trim(),
    }, { io: requiredIo }),
    "ok",
  );
  assertStringIncludes(requiredIo.output(), "Give a real value.");
});

Deno.test("the latch tracks the transformed value rather than raw edits", async () => {
  const seen: string[] = [];
  const io = new FakeTerminal(["ab\r", " ", "c\r"], { columns: 40 });
  const result = await requestText({
    label: "Canonical",
    transform: (value) => value.trim(),
    validate: (value) => {
      seen.push(value);
      return value.length >= 3 ? undefined : "Too short.";
    },
  }, { io });
  assertEquals(result, "ab c");
  assertEquals(
    seen,
    ["ab", "ab c", "ab c"],
    "a trailing space that the transform removes must not re-run the validator",
  );
});

Deno.test("masked transform applies to the real value without exposing either form", async () => {
  const io = new FakeTerminal(["  secret  \r"], { columns: 40 });
  const result = await requestMaskedText({
    label: "Token",
    transform: (value) => value.trim(),
  }, { io });
  assertEquals(result, "secret");
  assert(
    !io.output().includes("secret"),
    "neither the raw nor the transformed secret may reach the terminal",
  );
  assertStringIncludes(io.output(), "••••••••••");
});

Deno.test("validator exceptions restore raw mode and cursor", async () => {
  const io = new FakeTerminal(["ok\r"], { columns: 32 });
  await assertRejects(
    () =>
      requestText({
        label: "Validate",
        validate: () => {
          throw new Error("validator failed");
        },
      }, { io }),
    Error,
    "validator failed",
  );
  assertEquals(io.rawTransitions, [true, false]);
  assertRestored(io);
});

Deno.test("terminal interactions refuse non-TTY input before terminal mutation", async () => {
  const io = new FakeTerminal([], { interactive: false });
  await assertRejects(
    () => requestText({ label: "No terminal" }, { io }),
    NonInteractiveTerminalError,
    "stdin and stdout",
  );
  assertEquals(io.rawTransitions, []);
  assertEquals(io.writes, []);
});

Deno.test("confirm, select, and multiselect return their semantic values", async () => {
  const confirmIo = new FakeTerminal(["n\r"]);
  assertEquals(
    await requestConfirmation({ label: "Continue?" }, { io: confirmIo }),
    false,
  );

  const choices = [
    { id: "one", label: "One", value: 1 },
    { id: "two", label: "Two", value: 2 },
  ] as const;
  const selectIo = new FakeTerminal(["\x1b[B\r"]);
  assertEquals(
    await requestSelection({ label: "Pick", choices }, { io: selectIo }),
    2,
  );

  const multipleIo = new FakeTerminal([" \x1b[B \r"]);
  assertEquals(
    await requestSelections({ label: "Pick many", choices }, {
      io: multipleIo,
    }),
    [1, 2],
  );
});

Deno.test("search and autocomplete resolve asynchronous and ghost choices", async () => {
  const searchIo = new FakeTerminal(["t", "\r", "\r"]);
  const found = await requestSearch({
    label: "Find",
    search: (query) =>
      Promise.resolve([
        { id: "a", label: "Alpha", value: "a" },
        { id: "t", label: "Theta", value: "t" },
      ].filter((choice) => choice.label.toLocaleLowerCase().includes(query))),
  }, { io: searchIo });
  assertEquals(found, "t");

  const autocompleteIo = new FakeTerminal(["z\t\r"]);
  assertEquals(
    await requestAutocomplete({
      label: "Shell",
      suggestions: ["bash", "zsh"],
    }, { io: autocompleteIo }),
    "zsh",
  );
  assertStringIncludes(autocompleteIo.output(), "sh");
});

Deno.test("textarea inserts newlines, moves vertically, and submits with Ctrl+D", async () => {
  const io = new FakeTerminal(["ab\rcd\x1b[A!\x04"], { columns: 32 });
  assertEquals(
    await requestTextarea({ label: "Notes", rows: 3 }, { io }),
    "ab!\ncd",
  );
  assertStringIncludes(io.output(), "Ctrl+D to submit");
  assertRestored(io);
});

Deno.test("sequential form retains answers, runs conditions, and navigates back", async () => {
  const io = new FakeTerminal(["one\r", "\x15", "\r", "n\r"], {
    columns: 40,
  });
  const values = await createSequentialForm({ label: "Setup", io })
    .add({
      id: "name",
      label: "Name",
      run: async (_values, previous, runtime) =>
        await requestText({
          label: "Name",
          initialValue: typeof previous === "string" ? previous : "",
        }, runtime),
      summarize: (value) => String(value),
    })
    .add({
      id: "enabled",
      label: "Enabled",
      run: async (_values, previous, runtime) =>
        await requestConfirmation({
          label: "Enabled?",
          initialValue: typeof previous === "boolean" ? previous : true,
        }, runtime),
      summarize: (value) => value === true ? "Yes" : "No",
    })
    .add({
      id: "detail",
      label: "Detail",
      when: (answers) => answers.enabled === true,
      run: async (_values, _previous, runtime) =>
        await requestText({ label: "Detail" }, runtime),
    })
    .submit();

  assertEquals(values, { name: "one", enabled: false });
  assertStringIncludes(io.output(), "Back.");
  assertStringIncludes(io.output(), "Setup");
  assertStringIncludes(io.output(), "Name: one");
  assertStringIncludes(io.output(), "Enabled: No");
  assertEquals(io.rawTransitions, [
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
  ]);
  assertEquals(
    io.writes.filter((write) => write === SHOW_TERMINAL_CURSOR).length,
    4,
  );
});

Deno.test("spinner advances every triangle phase and restores cursor", async () => {
  const io = new FakeTerminal([], { columns: 20 });
  let stopped = false;
  const result = await withSpinner({
    label: "Work",
    io,
    scheduler: {
      repeat(callback) {
        callback();
        callback();
        callback();
        return () => {
          stopped = true;
        };
      },
    },
  }, () => 42);
  assertEquals(result, 42);
  assert(stopped);
  for (const glyph of ["◮", "◭", "⧨", "⧩"]) {
    assertStringIncludes(io.output(), glyph);
  }
  assertEquals(io.writes[0], HIDE_TERMINAL_CURSOR);
  assertEquals(io.writes.at(-1), SHOW_TERMINAL_CURSOR);
});

Deno.test("no-control terminals keep Unicode and use static interactive frames", async () => {
  const choices = [
    { id: "one", label: "One", value: 1 },
    { id: "two", label: "Two", value: 2 },
  ] as const;
  const io = new FakeTerminal(["\x1b[B\r"], {
    ansiControl: false,
    columns: 24,
    rows: 5,
    unicode: true,
  });
  assertEquals(
    await requestSelection({ label: "Pick", choices }, { io }),
    2,
  );
  assertStringIncludes(io.output(), "› [●] One");
  assertStringIncludes(io.output(), "› [●] Two");
  assert(!io.output().includes("\x1b"));
  assertEquals(io.rawTransitions, [true, false]);

  let scheduled = false;
  const spinnerIo = new FakeTerminal([], {
    ansiControl: false,
    columns: 20,
    unicode: true,
  });
  await withSpinner({
    label: "Work",
    io: spinnerIo,
    scheduler: {
      repeat() {
        scheduled = true;
        return () => {};
      },
    },
  }, () => undefined);
  assertEquals(scheduled, false);
  assertEquals(spinnerIo.writes, ["◮ Work\n"]);
});

Deno.test("terminals below the coherent frame minimum refuse and restore", async () => {
  const io = new FakeTerminal(["\x1b[B\r"], {
    ansiControl: true,
    columns: 24,
    rows: 2,
    unicode: true,
  });
  await assertRejects(
    () =>
      requestSelection({
        label: "Pick",
        choices: [
          { id: "one", label: "One", value: 1 },
          { id: "two", label: "Two", value: 2 },
        ],
      }, { io }),
    TypeError,
    "cannot hold a coherent interaction frame",
  );
  assert(!io.output().includes("\x1b[1G"));
  assert(!io.output().includes("\x1b[J"));
  assertEquals(io.rawTransitions, [true, false]);
  assertRestored(io);
});

Deno.test("spinner and progress restore cursor after callback failures", async () => {
  const spinnerIo = new FakeTerminal();
  await assertRejects(
    () =>
      withSpinner({ label: "Fail", io: spinnerIo }, () => {
        throw new Error("spinner failed");
      }),
    Error,
    "spinner failed",
  );
  assertEquals(spinnerIo.writes.at(-1), SHOW_TERMINAL_CURSOR);

  const progressIo = new FakeTerminal([], { columns: 20 });
  await assertRejects(
    () =>
      withDeterminateProgress(
        { label: "Fail", total: 4, io: progressIo },
        () => {
          throw new Error("progress failed");
        },
      ),
    Error,
    "progress failed",
  );
  assertEquals(progressIo.writes.at(-1), SHOW_TERMINAL_CURSOR);
});

Deno.test("determinate progress paints zero, partial, and semantic completion", async () => {
  const io = new FakeTerminal([], { columns: 20 });
  const result = await withDeterminateProgress({
    label: "Work",
    total: 4,
    io,
  }, (progress) => {
    progress.advance();
    return "done";
  });
  assertEquals(result, "done");
  assertStringIncludes(io.output(), "[  0%]");
  assertStringIncludes(io.output(), "[ 25%]");
  assertStringIncludes(io.output(), "[100%]");
  assertEquals(io.writes[0], HIDE_TERMINAL_CURSOR);
  assertEquals(io.writes.at(-1), SHOW_TERMINAL_CURSOR);
});
