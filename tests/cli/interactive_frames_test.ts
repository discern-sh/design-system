import { assertEquals } from "@std/assert";
import {
  createSequentialForm,
  promptAutocomplete,
  promptConfirm,
  promptMasked,
  promptMultiselect,
  promptSearch,
  promptSelect,
  promptText,
  promptTextarea,
  withDeterminateProgress,
} from "../../src/cli/interactive/mod.ts";
import { assertExactFrame, testCapabilities } from "./helpers.ts";
import { FakeTerminal } from "./fake-terminal.ts";

const ENTER = "\r";
const CTRL_D = "\x04";

function firstPromptFrame(io: FakeTerminal): string {
  const frame = io.writes[1];
  if (frame === undefined) throw new Error("prompt painted no initial frame");
  return frame;
}

Deno.test("interactive prompts paint exact real Component frames", async () => {
  const capabilities = testCapabilities({ columns: 32 });
  const frames = new Map<string, string>();

  let io = new FakeTerminal([ENTER], { columns: 32 });
  await promptText({ label: "Name", initialValue: "Ada" }, { io });
  frames.set("input", firstPromptFrame(io));

  io = new FakeTerminal([`abc${ENTER}`], { columns: 32 });
  await promptMasked({ label: "Secret", placeholder: "token" }, { io });
  frames.set("masked input", firstPromptFrame(io));

  io = new FakeTerminal([ENTER], { columns: 32 });
  await promptConfirm({
    label: "Continue",
    initialValue: true,
    yesLabel: "Yes",
    noLabel: "No",
  }, { io });
  frames.set("switch", firstPromptFrame(io));

  const choices = [
    { id: "one", label: "One", value: 1 },
    { id: "two", label: "Two", value: 2 },
  ] as const;
  io = new FakeTerminal([ENTER], { columns: 32 });
  await promptSelect({
    label: "Pick",
    choices,
    initialId: "two",
  }, { io });
  frames.set("select", firstPromptFrame(io));

  io = new FakeTerminal([ENTER], { columns: 32 });
  await promptMultiselect({
    label: "Tags",
    choices,
    initialIds: ["two"],
  }, { io });
  frames.set("checkboxes", firstPromptFrame(io));

  io = new FakeTerminal([`${ENTER}${ENTER}`], { columns: 32 });
  await promptSearch({
    label: "Find",
    placeholder: "Search",
    search: () => choices,
  }, { io });
  frames.set("radio search", firstPromptFrame(io));

  io = new FakeTerminal([ENTER], { columns: 32 });
  await promptAutocomplete({
    label: "Shell",
    initialValue: "z",
    suggestions: ["zsh"],
  }, { io });
  frames.set("autocomplete input", firstPromptFrame(io));

  io = new FakeTerminal([CTRL_D], { columns: 32 });
  await promptTextarea({
    label: "Notes",
    initialValue: "ab\ncd",
    rows: 2,
  }, { io });
  frames.set("textarea", firstPromptFrame(io));

  const expected = new Map([
    [
      "input",
      "Name [active]\n┌──────────────────────────────┐\n│Ada▌                          │\n└──────────────────────────────┘",
    ],
    [
      "masked input",
      "Secret [active]\n┌──────────────────────────────┐\n│▌token                        │\n└──────────────────────────────┘",
    ],
    [
      "switch",
      "Continue [active]\n┌──────────────────────────────┐\n│› No ○──● Yes                 │\n└──────────────────────────────┘",
    ],
    [
      "select",
      "Pick [active]\n┌──────────────────────────────┐\n│  [ ] One                     │\n│› [●] Two                     │\n└──────────────────────────────┘",
    ],
    [
      "checkboxes",
      "Tags [active]\n┌──────────────────────────────┐\n│› [ ] One                     │\n│  [✓] Two                     │\n└──────────────────────────────┘",
    ],
    [
      "radio search",
      "Find [active]\n┌──────────────────────────────┐\n│▌Search                       │\n│  ○ One                       │\n│  ○ Two                       │\n└──────────────────────────────┘",
    ],
    [
      "autocomplete input",
      "Shell [active]\n┌──────────────────────────────┐\n│z▌sh                          │\n└──────────────────────────────┘",
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
  const capabilities = testCapabilities({ columns: 20 });
  const io = new FakeTerminal([], { columns: 20 });
  await withDeterminateProgress({
    label: "Work",
    total: 4,
    completed: 1,
    io,
  }, () => undefined);
  assertExactFrame(
    firstPromptFrame(io),
    "Work\n[ 25%] ◮⧩◭..........",
    capabilities,
  );
});

Deno.test("sequential forms paint exact Process steps frames", async () => {
  const io = new FakeTerminal([], { columns: 32 });
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
    "Setup\n\n[◮] Account\n │\n ·  Confirm\n",
    "Setup\n\n ◭  Account\n │\n[◭] Confirm\n\nAccount: Ada\n",
    "Setup\n\n ◭  Account\n │\n ◭  Confirm\n\nAccount: Ada\n\n✓ Complete\n",
  ]);
});
