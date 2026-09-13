import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  createSequentialForm,
  requestText,
  sequentialAutocompleteStep,
  sequentialConfirmationStep,
  sequentialSelectionsStep,
  sequentialSelectionStep,
  sequentialTextareaStep,
  sequentialTextStep,
} from "../../src/cli/interactive/mod.ts";
import { FakeTerminalIO } from "../../src/cli/interactive/testing.ts";

Deno.test("typed sequential requests retain prior answers without caller seed wiring", async () => {
  const io = new FakeTerminalIO(["Maple\r", "\x15", "\r", "done\r"]);
  const values = await createSequentialForm({ label: "New workspace", io })
    .add(
      sequentialTextStep({
        id: "title",
        label: "Title",
        request: { label: "Title" },
      }),
    )
    .add({
      id: "review",
      label: "Review",
      run: (_values, _previous, runtime) =>
        requestText({ label: "Review" }, runtime),
    })
    .submit();
  assertEquals(values.title, "Maple");
});

Deno.test("value constructors restore submitted strings and false over explicit initial defaults", async () => {
  const textCases = [
    {
      make: () =>
        sequentialTextStep({
          id: "title",
          label: "Title",
          request: { label: "Title", initialValue: "seed" },
        }),
      submit: "\r",
    },
    {
      make: () =>
        sequentialTextareaStep({
          id: "note",
          label: "Note",
          request: { label: "Note", initialValue: "seed" },
        }),
      submit: "\x04",
    },
    {
      make: () =>
        sequentialAutocompleteStep({
          id: "tag",
          label: "Tag",
          request: {
            label: "Tag",
            initialValue: "seed",
            suggestions: ["cedar"],
          },
        }),
      submit: "\r",
    },
  ];
  for (const test of textCases) {
    const step = test.make();
    assertEquals(
      await step.run({}, undefined, { io: new FakeTerminalIO([test.submit]) }),
      "seed",
    );
    assertEquals(
      await step.run({}, "retained", { io: new FakeTerminalIO([test.submit]) }),
      "retained",
    );
    assertEquals(
      await step.run({}, "", { io: new FakeTerminalIO([test.submit]) }),
      "",
    );
  }
  const confirm = sequentialConfirmationStep({
    id: "flag",
    label: "Flag",
    request: { label: "Flag", initialValue: true },
  });
  assertEquals(
    await confirm.run({}, false, { io: new FakeTerminalIO(["\r"]) }),
    false,
  );
});

Deno.test("choice constructors retain stable IDs across rebuilt values, and drop unavailable choices", async () => {
  let version = 1;
  let available = true;
  const choices = () => [
    { id: "first", label: "First", value: { id: "first", version } },
    {
      id: "second",
      label: "Second",
      value: { id: "second", version },
      disabled: !available,
    },
  ];
  const step = sequentialSelectionStep({
    id: "choice",
    label: "Choice",
    request: () => ({
      label: "Choice",
      choices: choices(),
      initialId: "second",
    }),
  });
  const first = await step.run({}, undefined, {
    io: new FakeTerminalIO(["\r"]),
  });
  assertEquals(first, { id: "second", version: 1 });
  version = 2;
  const retained = await step.run({}, first, {
    io: new FakeTerminalIO(["\r"]),
  });
  assertEquals(retained, { id: "second", version: 2 });
  available = false;
  assertEquals(
    await step.run({}, retained, { io: new FakeTerminalIO(["\r"]) }),
    { id: "first", version: 2 },
  );

  available = true;
  const multiple = sequentialSelectionsStep({
    id: "choices",
    label: "Choices",
    request: () => ({
      label: "Choices",
      choices: choices(),
      initialIds: ["second"],
    }),
  });
  const selected = await multiple.run({}, undefined, {
    io: new FakeTerminalIO(["\r"]),
  });
  available = false;
  assertEquals(
    await multiple.run({}, selected, { io: new FakeTerminalIO(["\r"]) }),
    [],
  );
  available = true;
  assertEquals(
    await multiple.run({}, [], { io: new FakeTerminalIO(["\r"]) }),
    [],
  );
});

Deno.test("single selections distinguish a submitted undefined payload from an unanswered step", async () => {
  const io = new FakeTerminalIO(["\x1b[B\r", "\x15", "\r", "\r"]);
  const values = await createSequentialForm({ label: "Optional choice", io })
    .add(sequentialSelectionStep<number | undefined>({
      id: "choice",
      label: "Choice",
      request: {
        label: "Choice",
        initialId: "first",
        required: false,
        choices: [
          { id: "first", label: "First", value: 1 },
          { id: "unset", label: "Unset", value: undefined },
        ],
      },
    }))
    .add(sequentialConfirmationStep({
      id: "finish",
      label: "Finish",
      request: { label: "Finish" },
    }))
    .submit();
  assertEquals(Object.hasOwn(values, "choice"), true);
  assertEquals(values.choice, undefined);
});

Deno.test("changed upstream answers clear skipped steps before re-entry and retain still-applicable answers", async () => {
  const observed: unknown[] = [];
  // Fill detail, back twice to disable it, then revisit and re-enable it.
  const io = new FakeTerminalIO([
    "\r",
    "saved\r",
    "\x15",
    "\x15",
    "n\r",
    "\x15",
    "y\r",
    "fresh\r",
    "\r",
  ]);
  const result = await createSequentialForm({ label: "Conditional setup", io })
    .add(
      sequentialConfirmationStep({
        id: "enabled",
        label: "Enabled",
        request: { label: "Enabled", initialValue: true },
      }),
    )
    .add(
      sequentialTextStep({
        id: "detail",
        label: "Detail",
        when: (values) => values.enabled === true,
        request: (_values, previous) => {
          observed.push(previous);
          return { label: "Detail" };
        },
      }),
    )
    .add(
      sequentialConfirmationStep({
        id: "finish",
        label: "Finish",
        request: { label: "Finish" },
      }),
    )
    .submit();
  assertEquals(result, { enabled: true, detail: "fresh", finish: true });
  assertEquals(observed, [undefined, "saved", undefined]);
  assertStringIncludes(io.output(), "Back.");
});

Deno.test("typed step callbacks reject request/value mismatches", () => {
  sequentialTextStep({
    id: "a",
    label: "A",
    request: (_values, previous) => ({ label: previous?.toUpperCase() ?? "A" }),
    summarize: (value) => value.toUpperCase(),
  });
  sequentialConfirmationStep({
    id: "b",
    label: "B",
    request: { label: "B" },
    summarize: (value) => value ? "Yes" : "No",
  });
  sequentialSelectionsStep({
    id: "c",
    label: "C",
    request: { label: "C", choices: [{ id: "one", label: "One", value: 1 }] },
    summarize: (values) =>
      String(values.reduce((sum, value) => sum + value, 0)),
  });
  const badText = {
    id: "bad",
    label: "Bad",
    request: { label: "Bad", initialValue: false },
  } as const;
  const badSummary = {
    id: "bad",
    label: "Bad",
    request: { label: "Bad" },
    summarize: (value: string) => value,
  };
  type SingleRequest = Exclude<
    Parameters<typeof sequentialSelectionStep>[0]["request"],
    (...args: never[]) => unknown
  >;
  // Each false literal is checked by TypeScript against the public contract.
  const rejected: [
    typeof badText extends Parameters<typeof sequentialTextStep>[0] ? true
      : false,
    typeof badSummary extends Parameters<typeof sequentialConfirmationStep>[0]
      ? true
      : false,
    "initialIds" extends keyof SingleRequest ? true : false,
  ] = [false, false, false];
  assertEquals(rejected, [false, false, false]);
});
