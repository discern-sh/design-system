import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import {
  InteractionCancelled,
  requestSearch,
  requestSelection,
  requestSelections,
} from "../../src/cli/interactive/mod.ts";
import type { InteractionEntry } from "../../src/cli/interactive/types.ts";
import { renderMotifSectionRule } from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  FakeTerminalIO,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";
import { TEST_TERMINAL_MOTIF } from "./motif_fixture.ts";

const grouped = [
  { kind: "group-heading", id: "primary", label: "Primary" },
  { id: "one", label: "One", value: "one" },
  {
    id: "disabled",
    label: "Disabled",
    value: "disabled",
    disabled: true,
  },
  { kind: "group-heading", id: "secondary", label: "Secondary" },
  { id: "two", label: "Two", value: "two" },
  { id: "three", label: "Three", value: "three" },
] as const satisfies readonly InteractionEntry<string>[];

const firstColumn = "\x1b[1G";
const eraseToEnd = "\x1b[J";

function paintedFrames(io: FakeTerminalIO): readonly string[] {
  return io.writes.map((write) => {
    const eraseAt = write.indexOf(eraseToEnd);
    return write.startsWith(firstColumn) && eraseAt >= 0
      ? write.slice(eraseAt + eraseToEnd.length)
      : write;
  }).filter((write) => /\[(?:active|error|submitted|cancelled)\]/u.test(write));
}

function groupRule(label: string): string {
  const capabilities = testTerminalCapabilities({ columns: 30 });
  return renderMotifSectionRule(label, { width: 30 }, capabilities);
}

Deno.test("grouped select supports every promised movement key", async () => {
  const forward = [
    "j",
    "l",
    "\x1b[B",
    "\x1b[C",
    "\t",
    "\x0e",
    "\x06",
  ] as const;
  for (const key of forward) {
    const io = new FakeTerminalIO([`${key}\r`]);
    assertEquals(
      await requestSelection({ label: "Pick", choices: grouped }, { io }),
      "two",
    );
  }

  const backward = [
    "h",
    "k",
    "\x1b[A",
    "\x1b[D",
    "\x1b[Z",
    "\x10",
    "\x02",
  ] as const;
  for (const key of backward) {
    const io = new FakeTerminalIO([`${key}\r`]);
    assertEquals(
      await requestSelection({ label: "Pick", choices: grouped }, { io }),
      "three",
    );
  }
});

Deno.test("grouped select Home, End, initial ids, and validation never land on headings", async () => {
  let io = new FakeTerminalIO(["\x1b[H\r"]);
  assertEquals(
    await requestSelection({
      label: "Pick",
      choices: grouped,
      initialId: "two",
    }, { io }),
    "one",
  );

  io = new FakeTerminalIO(["\x1b[F\r"]);
  assertEquals(
    await requestSelection({ label: "Pick", choices: grouped }, { io }),
    "three",
  );

  io = new FakeTerminalIO(["\r"]);
  assertEquals(
    await requestSelection({
      label: "Pick",
      choices: grouped,
      initialId: "primary",
    }, { io }),
    "one",
  );

  io = new FakeTerminalIO(["\r\x1b[B\r"]);
  assertEquals(
    await requestSelection({
      label: "Pick",
      choices: grouped,
      validate: (value) =>
        value === "one" ? "Choose the later group." : undefined,
    }, { io }),
    "two",
  );
  assertStringIncludes(io.output(), "Choose the later group.");
});

Deno.test("grouped multiselect toggles only values and returns caller order", async () => {
  let io = new FakeTerminalIO(["\x01\r"]);
  assertEquals(
    await requestSelections({
      label: "Pick many",
      choices: grouped,
      initialIds: ["primary", "disabled"],
    }, { io }),
    ["one", "disabled", "two", "three"],
  );

  io = new FakeTerminalIO(["\x01\x01\r"]);
  assertEquals(
    await requestSelections({
      label: "Pick many",
      choices: grouped,
      initialIds: ["disabled"],
    }, { io }),
    ["disabled"],
  );

  io = new FakeTerminalIO([" \x1b[B \r"]);
  assertEquals(
    await requestSelections({ label: "Pick many", choices: grouped }, { io }),
    ["one", "two"],
  );
});

Deno.test("search providers share grouped entry vocabulary and skip structure", async () => {
  const io = new FakeTerminalIO(["\r\x1b[B\x1b[B\r"], { columns: 32 });
  assertEquals(
    await requestSearch({
      label: "Find",
      visibleCount: 2,
      search: () => grouped,
    }, { io }),
    "three",
  );
  assertStringIncludes(io.output(), "SECONDARY");
  assertStringIncludes(io.output(), "Three");
});

Deno.test("grouped requests carry a consumer motif through the interaction runtime", async () => {
  const io = new FakeTerminalIO(["\r"], { columns: 32 });
  assertEquals(
    await requestSelection(
      { label: "Pick", choices: grouped },
      { io, motif: TEST_TERMINAL_MOTIF },
    ),
    "one",
  );
  assertStringIncludes(io.output(), "▵ PRIMARY");
  assertEquals(io.output().includes("◮ PRIMARY"), false);
});

Deno.test("grouped interactions cancel cleanly and reject required structure-only lists", async () => {
  const cancelled = new FakeTerminalIO(["\x03"], { columns: 32 });
  await assertRejects(
    () =>
      requestSelection({ label: "Pick", choices: grouped }, { io: cancelled }),
    InteractionCancelled,
    "Cancelled.",
  );
  assertStringIncludes(cancelled.output(), "PRIMARY");
  assertEquals(cancelled.rawTransitions, [true, false]);

  const invalid = new FakeTerminalIO(["\r"]);
  await assertRejects(
    () =>
      requestSelection({
        label: "Pick",
        choices: [
          { kind: "group-heading", id: "only", label: "Only" },
          { id: "off", label: "Unavailable", value: 1, disabled: true },
        ],
      }, { io: invalid }),
    TypeError,
    "at least one selectable choice",
  );
  assertEquals(invalid.rawTransitions, []);

  const optional = new FakeTerminalIO(["\r"]);
  assertEquals(
    await requestSelection({
      label: "Optional",
      required: false,
      choices: [{ kind: "group-heading", id: "only", label: "Only" }],
    }, { io: optional }),
    undefined,
  );
});

Deno.test("long grouped viewports and submitted frames stay exact", async () => {
  const capabilities = testTerminalCapabilities({ columns: 32 });

  let io = new FakeTerminalIO(["\x1b[F\r"], { columns: 32 });
  assertEquals(
    await requestSelection({
      label: "Pick",
      choices: grouped,
      visibleCount: 2,
    }, { io }),
    "three",
  );
  const selectFrames = paintedFrames(io);
  assertExactFrame(
    selectFrames[1] ?? "",
    `Pick [active]\n┌──────────────────────────────┐\n│                              │\n│${
      groupRule("Secondary")
    }│\n│  [ ] Two                     │\n│› [●] Three                   │\n└────────── ↑ 2 more ──────────┘\n`,
    capabilities,
  );
  assertExactFrame(
    selectFrames[2] ?? "",
    "Pick [submitted]\n┌──────────────────────────────┐\n│Three ⌄                       │\n└──────────────────────────────┘\n✓ Submitted",
    capabilities,
  );

  io = new FakeTerminalIO(["\x01\r"], { columns: 32 });
  assertEquals(
    await requestSelections({ label: "Pick many", choices: grouped }, { io }),
    ["one", "two", "three"],
  );
  const multiselectFrames = paintedFrames(io);
  assertExactFrame(
    multiselectFrames.at(-1) ?? "",
    `Pick many [submitted]\n┌──────────────────────────────┐\n│                              │\n│${
      groupRule("Primary")
    }│\n│  [✓] One                     │\n│  [ ] Disabled (disabled)     │\n│                              │\n│${
      groupRule("Secondary")
    }│\n│  [✓] Two                     │\n└────────── ↓ 1 more ──────────┘\n✓ Submitted`,
    capabilities,
  );

  io = new FakeTerminalIO(["\r\x1b[B\x1b[B\r"], { columns: 32 });
  assertEquals(
    await requestSearch({
      label: "Find",
      visibleCount: 2,
      search: () => grouped,
    }, { io }),
    "three",
  );
  const searchFrames = paintedFrames(io);
  assertExactFrame(
    searchFrames.at(-1) ?? "",
    `Find [submitted]\n┌──────────────────────────────┐\n│                              │\n│${
      groupRule("Secondary")
    }│\n│  ○ Two                       │\n│  ◉ Three                     │\n└────────── ↑ 2 more ──────────┘\n✓ Submitted`,
    capabilities,
  );
});
