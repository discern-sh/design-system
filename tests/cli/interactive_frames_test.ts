import { assertEquals } from "@std/assert";
import {
  createSequentialForm,
  requestAutocomplete,
  requestConfirmation,
  requestMaskedText,
  requestSearch,
  requestSelection,
  requestSelections,
  requestText,
  requestTextarea,
  withDeterminateProgress,
} from "../../src/cli/interactive/mod.ts";
import {
  assertExactFrame,
  FakeTerminalIO,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";
import { TEST_TERMINAL_MOTIF } from "./motif_fixture.ts";

const ENTER = "\r";
const CTRL_D = "\x04";

function firstInteractionFrame(io: FakeTerminalIO): string {
  const frame = io.writes[1];
  if (frame === undefined) {
    throw new Error("interaction painted no initial frame");
  }
  return frame;
}

Deno.test("terminal interactions paint exact real Component frames", async () => {
  const capabilities = testTerminalCapabilities({ columns: 32 });
  const frames = new Map<string, string>();

  let io = new FakeTerminalIO([ENTER], { columns: 32 });
  await requestText({ label: "Name", initialValue: "Ada" }, { io });
  frames.set("input", firstInteractionFrame(io));

  io = new FakeTerminalIO([`abc${ENTER}`], { columns: 32 });
  await requestMaskedText({ label: "Secret", placeholder: "token" }, { io });
  frames.set("masked input", firstInteractionFrame(io));

  io = new FakeTerminalIO([ENTER], { columns: 32 });
  await requestConfirmation({
    label: "Continue",
    initialValue: true,
  }, { io });
  frames.set("switch", firstInteractionFrame(io));

  const choices = [
    { id: "one", label: "One", value: 1 },
    { id: "two", label: "Two", value: 2 },
  ] as const;
  io = new FakeTerminalIO([ENTER], { columns: 32 });
  await requestSelection({
    label: "Pick",
    choices,
    initialId: "two",
  }, { io });
  frames.set("select", firstInteractionFrame(io));

  io = new FakeTerminalIO([ENTER], { columns: 32 });
  await requestSelections({
    label: "Tags",
    choices,
    initialIds: ["two"],
  }, { io });
  frames.set("checkboxes", firstInteractionFrame(io));

  io = new FakeTerminalIO([`${ENTER}${ENTER}`], { columns: 32 });
  await requestSearch({
    label: "Find",
    placeholder: "Search",
    search: () => choices,
  }, { io });
  frames.set("radio search pending", firstInteractionFrame(io));
  const resolved = io.writes[2] ?? "";
  frames.set(
    "radio search",
    resolved.slice(resolved.indexOf("\x1b[J") + "\x1b[J".length),
  );

  io = new FakeTerminalIO([ENTER], { columns: 32 });
  await requestAutocomplete({
    label: "Shell",
    initialValue: "z",
    suggestions: ["zsh"],
  }, { io });
  frames.set("autocomplete input", firstInteractionFrame(io));

  io = new FakeTerminalIO([CTRL_D], { columns: 32 });
  await requestTextarea({
    label: "Notes",
    initialValue: "ab\ncd",
    rows: 2,
  }, { io });
  frames.set("textarea", firstInteractionFrame(io));

  const expected = new Map([
    [
      "input",
      "Name [active]\n┌──────────────────────────────┐\n│Ada▌                          │\n└──────────────────────────────┘\n",
    ],
    [
      "masked input",
      "Secret [active]\n┌──────────────────────────────┐\n│▌token                        │\n└──────────────────────────────┘\n",
    ],
    [
      "switch",
      "Continue [active]\n┌──────────────────────────────┐\n│›   ○──● ✓                    │\n└──────────────────────────────┘\n",
    ],
    [
      "select",
      "Pick [active]\n┌──────────────────────────────┐\n│  [ ] One                     │\n│› [●] Two                     │\n└──────────────────────────────┘\n",
    ],
    [
      "checkboxes",
      "Tags [active]\n┌──────────────────────────────┐\n│› [ ] One                     │\n│  [✓] Two                     │\n└──────────────────────────────┘\n",
    ],
    [
      "radio search pending",
      "Find [searching]\n┌──────────────────────────────┐\n│▌Search                       │\n│Searching…                    │\n└──────────────────────────────┘\n",
    ],
    [
      "radio search",
      "Find [active]\n┌──────────────────────────────┐\n│▌Search                       │\n│  ○ One                       │\n│  ○ Two                       │\n└──────────────────────────────┘\n",
    ],
    [
      "autocomplete input",
      "Shell [active]\n┌──────────────────────────────┐\n│z▌sh                          │\n└──────────────────────────────┘\n",
    ],
    [
      "textarea",
      "Notes [active]\n┌──────────────────────────────┐\n│ab                            │\n│cd▌                           │\n└──────────────────────────────┘\nCtrl+D to submit",
    ],
  ]);

  assertEquals(frames.keys().toArray(), expected.keys().toArray());
  for (const [name, frame] of frames) {
    assertExactFrame(frame, expected.get(name) ?? "", capabilities);
  }
});

Deno.test("interactive progress paints exact Meter frames", async () => {
  const capabilities = testTerminalCapabilities({ columns: 20 });
  const io = new FakeTerminalIO([], { columns: 20 });
  await withDeterminateProgress({
    label: "Work",
    total: 4,
    completed: 1,
    io,
  }, () => undefined);
  assertExactFrame(
    firstInteractionFrame(io),
    "Work\n[ 25%] ━━━▶─────────",
    capabilities,
  );
});

Deno.test("sequential forms paint exact Process steps frames", async () => {
  const io = new FakeTerminalIO([], { columns: 32 });
  await createSequentialForm({ label: "Setup", io })
    .add({
      id: "account",
      label: "Account",
      run: () => "Ada",
      summarize: (value) => String(value),
    })
    .add({ id: "confirm", label: "Confirm", run: () => true })
    .submit();
  assertEquals(io.writes, [
    "Setup\n\n[◐] Account\n │\n △  Confirm\n",
    "Setup\n\n ▲  Account\n │\n[◓] Confirm\n\nAccount: Ada\n",
    "Setup\n\n ▲  Account\n │\n ▲  Confirm\n\nAccount: Ada\n\n✓ Complete\n",
  ]);
});

Deno.test("sequential forms pass a consumer motif through every step", async () => {
  const io = new FakeTerminalIO([], { columns: 32 });
  await createSequentialForm({
    label: "Setup",
    io,
    motif: TEST_TERMINAL_MOTIF,
  })
    .add({ id: "account", label: "Account", run: () => "Ada" })
    .add({ id: "confirm", label: "Confirm", run: () => true })
    .submit();
  assertEquals(io.writes, [
    "Setup\n\n[◴] Account\n │\n ▿  Confirm\n",
    "Setup\n\n ▵  Account\n │\n[◷] Confirm\n",
    "Setup\n\n ▵  Account\n │\n ▵  Confirm\n\n✓ Complete\n",
  ]);
});
