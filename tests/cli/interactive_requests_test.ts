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
import { FakeTerminalIO } from "../../src/cli/interactive/testing.ts";

function assertRestored(io: FakeTerminalIO): void {
  assertEquals(io.rawTransitions.at(-1), false);
  assertEquals(io.writes.at(-1), SHOW_TERMINAL_CURSOR);
}

Deno.test("text interaction edits, validates, submits, and restores terminal state", async () => {
  const io = new FakeTerminalIO(["\r", "J", "e", "s", "s", "\r"], {
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
  const io = new FakeTerminalIO(["secret\r"], { columns: 32 });
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
  const cancelled = new FakeTerminalIO(["x\x03"], { columns: 32 });
  await assertRejects(
    () => requestText({ label: "Cancel" }, { io: cancelled }),
    InteractionCancelled,
    "Cancelled.",
  );
  assertEquals(cancelled.rawTransitions, [true, false]);
  assertRestored(cancelled);
  assertStringIncludes(cancelled.output(), "Cancelled.");

  const ended = new FakeTerminalIO([], { columns: 32 });
  await assertRejects(
    () => requestText({ label: "End" }, { io: ended }),
    InteractionCancelled,
    "Input ended.",
  );
  assertEquals(ended.rawTransitions, [true, false]);
  assertRestored(ended);
  assertStringIncludes(ended.output(), "Input ended.");
});

Deno.test("validator exceptions restore raw mode and cursor", async () => {
  const io = new FakeTerminalIO(["ok\r"], { columns: 32 });
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
  const io = new FakeTerminalIO([], { interactive: false });
  await assertRejects(
    () => requestText({ label: "No terminal" }, { io }),
    NonInteractiveTerminalError,
    "stdin and stdout",
  );
  assertEquals(io.rawTransitions, []);
  assertEquals(io.writes, []);
});

Deno.test("confirm, select, and multiselect return their semantic values", async () => {
  const confirmIo = new FakeTerminalIO(["n\r"]);
  assertEquals(
    await requestConfirmation({ label: "Continue?" }, { io: confirmIo }),
    false,
  );

  const choices = [
    { id: "one", label: "One", value: 1 },
    { id: "two", label: "Two", value: 2 },
  ] as const;
  const selectIo = new FakeTerminalIO(["\x1b[B\r"]);
  assertEquals(
    await requestSelection({ label: "Pick", choices }, { io: selectIo }),
    2,
  );

  const multipleIo = new FakeTerminalIO([" \x1b[B \r"]);
  assertEquals(
    await requestSelections({ label: "Pick many", choices }, {
      io: multipleIo,
    }),
    [1, 2],
  );
});

Deno.test("search and autocomplete resolve asynchronous and ghost choices", async () => {
  const searchIo = new FakeTerminalIO(["t", "\r", "\r"]);
  const found = await requestSearch({
    label: "Find",
    search: (query) =>
      Promise.resolve([
        { id: "a", label: "Alpha", value: "a" },
        { id: "t", label: "Theta", value: "t" },
      ].filter((choice) => choice.label.toLocaleLowerCase().includes(query))),
  }, { io: searchIo });
  assertEquals(found, "t");

  const autocompleteIo = new FakeTerminalIO(["z\t\r"]);
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
  const io = new FakeTerminalIO(["ab\rcd\x1b[A!\x04"], { columns: 32 });
  assertEquals(
    await requestTextarea({ label: "Notes", rows: 3 }, { io }),
    "ab!\ncd",
  );
  assertStringIncludes(io.output(), "Ctrl+D to submit");
  assertRestored(io);
});

Deno.test("sequential form retains answers, runs conditions, and navigates back", async () => {
  const io = new FakeTerminalIO(["one\r", "\x15", "\r", "n\r"], {
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
  const io = new FakeTerminalIO([], { columns: 20 });
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
  const io = new FakeTerminalIO(["\x1b[B\r"], {
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
  const spinnerIo = new FakeTerminalIO([], {
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
  const io = new FakeTerminalIO(["\x1b[B\r"], {
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
  const spinnerIo = new FakeTerminalIO();
  await assertRejects(
    () =>
      withSpinner({ label: "Fail", io: spinnerIo }, () => {
        throw new Error("spinner failed");
      }),
    Error,
    "spinner failed",
  );
  assertEquals(spinnerIo.writes.at(-1), SHOW_TERMINAL_CURSOR);

  const progressIo = new FakeTerminalIO([], { columns: 20 });
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
  const io = new FakeTerminalIO([], { columns: 20 });
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
