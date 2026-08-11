import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import {
  createSequentialForm,
  HIDE_TERMINAL_CURSOR,
  NonInteractiveTerminalError,
  promptAutocomplete,
  PromptCancelled,
  promptConfirm,
  promptMasked,
  promptMultiselect,
  promptSearch,
  promptSelect,
  promptText,
  promptTextarea,
  SHOW_TERMINAL_CURSOR,
  withDeterminateProgress,
  withSpinner,
} from "../../src/cli/interactive/mod.ts";
import { FakeTerminal } from "./fake-terminal.ts";

function assertRestored(io: FakeTerminal): void {
  assertEquals(io.rawTransitions.at(-1), false);
  assertEquals(io.writes.at(-1), SHOW_TERMINAL_CURSOR);
}

Deno.test("text prompt edits, validates, submits, and restores terminal state", async () => {
  const io = new FakeTerminal(["\r", "J", "e", "s", "s", "\r"], {
    columns: 32,
  });
  const result = await promptText({ label: "Name", required: true }, { io });
  assertEquals(result, "Jess");
  assertEquals(io.rawTransitions, [true, false]);
  assertEquals(io.writes[0], HIDE_TERMINAL_CURSOR);
  assertRestored(io);
  assertStringIncludes(io.output(), "Required.");
  assertStringIncludes(io.output(), "Jess");
});

Deno.test("masked prompt never writes the raw secret", async () => {
  const io = new FakeTerminal(["secret\r"], { columns: 32 });
  assertEquals(
    await promptMasked({ label: "Secret", required: true }, { io }),
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
    () => promptText({ label: "Cancel" }, { io: cancelled }),
    PromptCancelled,
    "Cancelled.",
  );
  assertEquals(cancelled.rawTransitions, [true, false]);
  assertRestored(cancelled);
  assertStringIncludes(cancelled.output(), "Cancelled.");

  const ended = new FakeTerminal([], { columns: 32 });
  await assertRejects(
    () => promptText({ label: "End" }, { io: ended }),
    PromptCancelled,
    "Input ended.",
  );
  assertEquals(ended.rawTransitions, [true, false]);
  assertRestored(ended);
  assertStringIncludes(ended.output(), "Input ended.");
});

Deno.test("validator exceptions restore raw mode and cursor", async () => {
  const io = new FakeTerminal(["ok\r"], { columns: 32 });
  await assertRejects(
    () =>
      promptText({
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

Deno.test("interactive prompts refuse non-TTY input before terminal mutation", async () => {
  const io = new FakeTerminal([], { interactive: false });
  await assertRejects(
    () => promptText({ label: "No terminal" }, { io }),
    NonInteractiveTerminalError,
    "stdin and stdout",
  );
  assertEquals(io.rawTransitions, []);
  assertEquals(io.writes, []);
});

Deno.test("confirm, select, and multiselect return their semantic values", async () => {
  const confirmIo = new FakeTerminal(["n\r"]);
  assertEquals(
    await promptConfirm({ label: "Continue?" }, { io: confirmIo }),
    false,
  );

  const choices = [
    { id: "one", label: "One", value: 1 },
    { id: "two", label: "Two", value: 2 },
  ] as const;
  const selectIo = new FakeTerminal(["\x1b[B\r"]);
  assertEquals(
    await promptSelect({ label: "Pick", choices }, { io: selectIo }),
    2,
  );

  const multipleIo = new FakeTerminal([" \x1b[B \r"]);
  assertEquals(
    await promptMultiselect({ label: "Pick many", choices }, {
      io: multipleIo,
    }),
    [1, 2],
  );
});

Deno.test("search and autocomplete resolve asynchronous and ghost choices", async () => {
  const searchIo = new FakeTerminal(["t", "\r", "\r"]);
  const found = await promptSearch({
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
    await promptAutocomplete({
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
    await promptTextarea({ label: "Notes", rows: 3 }, { io }),
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
        await promptText({
          label: "Name",
          initialValue: typeof previous === "string" ? previous : "",
        }, runtime),
      summarize: (value) => String(value),
    })
    .add({
      id: "enabled",
      label: "Enabled",
      run: async (_values, previous, runtime) =>
        await promptConfirm({
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
        await promptText({ label: "Detail" }, runtime),
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
