import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import {
  InteractionCancelled,
  requestSearchSelections,
} from "../../src/cli/interactive/mod.ts";
import type { InteractionEntry } from "../../src/cli/interactive/types.ts";
import { stripAnsi } from "../../src/cli/ansi.ts";
import {
  renderCheckboxCli,
  renderTriangleSectionRule,
} from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  FakeTerminalIO,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

function headingRule(label: string, width: number, unicode = true): string {
  const capabilities = testTerminalCapabilities({ columns: width, unicode });
  return stripAnsi(
    renderTriangleSectionRule(label, { width }, capabilities),
  );
}

const catalogue: readonly InteractionEntry<string>[] = [
  { kind: "group-heading", id: "primary", label: "Primary" },
  { id: "one", label: "One", value: "one" },
  { id: "off", label: "Off", value: "off", disabled: true },
  { kind: "group-heading", id: "secondary", label: "Secondary" },
  { id: "two", label: "Two", value: "two" },
  { id: "three", label: "Three", value: "three" },
];

function filterCatalogue(query: string): readonly InteractionEntry<string>[] {
  if (query === "") return catalogue;
  const lower = query.toLocaleLowerCase();
  const matched: InteractionEntry<string>[] = [];
  let heading: InteractionEntry<string> | undefined;
  for (const entry of catalogue) {
    if (entry.kind === "group-heading") {
      heading = entry;
      continue;
    }
    if (entry.label.toLocaleLowerCase().includes(lower)) {
      if (heading !== undefined) {
        matched.push(heading);
        heading = undefined;
      }
      matched.push(entry);
    }
  }
  return matched;
}

async function until(condition: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("condition never held");
}

Deno.test("query filtering retains selected entries and returns selection order", async () => {
  const io = new FakeTerminalIO(["\t", "\t", "tw", "\t", "\t", "\r"], {
    columns: 40,
  });
  const values = await requestSearchSelections({
    label: "Roles",
    search: (query) => filterCatalogue(query),
  }, { io });
  assertEquals(
    values,
    ["two"],
    "deselecting a retained entry must drop it from the selection",
  );
  assertStringIncludes(io.output(), "SELECTED");
  assertStringIncludes(io.output(), "[✓] One");

  const ordered = new FakeTerminalIO(["\t", "\t", "\x1b[B", "\t", "\r"], {
    columns: 40,
  });
  assertEquals(
    await requestSearchSelections({
      label: "Roles",
      search: (query) => filterCatalogue(query),
    }, { io: ordered }),
    ["one", "two"],
    "submission returns values in selection order",
  );
});

Deno.test("toggle-all works over current matches and leaves retained selections alone", async () => {
  const everything = new FakeTerminalIO(["\x01", "\r"], { columns: 40 });
  assertEquals(
    await requestSearchSelections({
      label: "Roles",
      search: (query) => filterCatalogue(query),
    }, { io: everything }),
    ["one", "two", "three"],
  );

  const inverted = new FakeTerminalIO(["\x01", "\x01", "\r"], { columns: 40 });
  assertEquals(
    await requestSearchSelections({
      label: "Roles",
      search: (query) => filterCatalogue(query),
    }, { io: inverted }),
    [],
  );

  const scoped = new FakeTerminalIO(
    ["\t", "\t", "tw", "\x01", "\x01", "\r"],
    { columns: 40 },
  );
  assertEquals(
    await requestSearchSelections({
      label: "Roles",
      search: (query) => filterCatalogue(query),
    }, { io: scoped }),
    ["one"],
    "toggle-all covers the query's matches, never the retained band",
  );
});

Deno.test("initial IDs select from the first resolution in the order given", async () => {
  const io = new FakeTerminalIO(["\r"], { columns: 40 });
  assertEquals(
    await requestSearchSelections({
      label: "Roles",
      initialIds: ["two", "one"],
      search: (query) => filterCatalogue(query),
    }, { io }),
    ["two", "one"],
  );

  const filtered = new FakeTerminalIO(["\r"], { columns: 40 });
  assertEquals(
    await requestSearchSelections({
      label: "Roles",
      initialIds: ["off", "ghost", "three"],
      search: (query) => filterCatalogue(query),
    }, { io: filtered }),
    ["three"],
    "disabled and unknown initial IDs are dropped",
  );
});

Deno.test("required submission latches validation until a selection exists", async () => {
  const io = new FakeTerminalIO(["\r", "\t", "\t", "\r"], { columns: 40 });
  assertEquals(
    await requestSearchSelections({
      label: "Roles",
      required: "Choose at least one role.",
      search: (query) => filterCatalogue(query),
    }, { io }),
    ["one"],
  );
  assertStringIncludes(io.output(), "Choose at least one role.");
});

Deno.test("escape dismisses and a provider fault restores the terminal", async () => {
  const dismissed = new FakeTerminalIO(["\x1b"], { columns: 40 });
  const error = await assertRejects(
    () =>
      requestSearchSelections({
        label: "Roles",
        search: (query) => filterCatalogue(query),
      }, { io: dismissed }),
    InteractionCancelled,
  );
  assertEquals(error.reason, "Dismissed.");
  assertEquals(dismissed.rawTransitions, [true, false]);

  const invalid = new FakeTerminalIO([], { columns: 40, holdOpen: true });
  await assertRejects(
    () =>
      requestSearchSelections({
        label: "Roles",
        search: () => [
          { id: "dup", label: "One", value: 1 },
          { id: "dup", label: "Two", value: 2 },
        ],
      }, { io: invalid }),
    TypeError,
    "repeated",
  );
  assertEquals(invalid.rawTransitions, [true, false]);
});

Deno.test("a caller choice ID of 'selected' never collides with the retained band", async () => {
  const tricky = [
    { id: "selected", label: "Selected flag", value: "flag" },
    { id: "other", label: "Other", value: "other" },
  ] as const satisfies readonly InteractionEntry<string>[];
  const io = new FakeTerminalIO(["\t", "\t", "oth", "\r"], { columns: 40 });
  assertEquals(
    await requestSearchSelections({
      label: "Tricky",
      search: (query) =>
        tricky.filter(({ label }) =>
          label.toLocaleLowerCase().includes(query.toLocaleLowerCase())
        ),
    }, { io }),
    ["flag"],
  );
  assertStringIncludes(io.output(), "SELECTED");
  assertStringIncludes(io.output(), "[✓] Selected flag");
});

Deno.test("a slow provider keeps the query-filtered multiselection live and honest", async () => {
  const io = new FakeTerminalIO([], { columns: 40, holdOpen: true });
  const calls: Array<{
    readonly query: string;
    readonly resolve: (entries: readonly InteractionEntry<string>[]) => void;
  }> = [];
  const request = requestSearchSelections<string>({
    label: "Slow roles",
    search: (query) =>
      new Promise((resolve) => {
        calls.push({ query, resolve });
      }),
  }, { io });
  await until(() => calls.length === 1);
  assertStringIncludes(io.writes[1] ?? "", "[searching]");
  assertStringIncludes(io.writes[1] ?? "", "Searching…");

  io.enqueue("t");
  await until(() => calls.length === 2);
  io.enqueue("w");
  await until(() => calls.length === 3);
  assertEquals(calls.map(({ query }) => query), ["", "t", "tw"]);

  calls[2]?.resolve(filterCatalogue("tw"));
  await until(() => io.output().includes("[ ] Two"));
  calls[1]?.resolve([{ id: "stale", label: "StaleRow", value: "stale" }]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert(!io.output().includes("StaleRow"));

  io.enqueueKeys("tab", "tab", "enter");
  assertEquals(await request, ["two"]);
});

Deno.test("the reservation and viewport budget bound query-filtered frames", async () => {
  const io = new FakeTerminalIO(["\t", "\t", "\r"], { columns: 42, rows: 20 });
  await requestSearchSelections({
    label: "Reserved roles",
    search: (query) => filterCatalogue(query),
    visibleCount: 16,
    reservedRows: 12,
  }, { io });
  const frames = io.writes.flatMap((write) => {
    const eraseAt = write.indexOf("\x1b[J");
    const frame = write.startsWith("\x1b[1G") && eraseAt >= 0
      ? write.slice(eraseAt + "\x1b[J".length)
      : write;
    return /\[(?:active|searching|submitted)\]/u.test(frame) ? [frame] : [];
  });
  assert(frames.length > 0);
  for (const frame of frames) {
    const rows = frame.replace(/\n$/u, "").split("\n").length;
    assert(
      rows <= 8,
      `rendered ${rows} rows into an 8-row remainder below the reservation`,
    );
  }
});

Deno.test("query-filtered multiselection journeys paint exact frames", async () => {
  const capabilities = testTerminalCapabilities({ columns: 32 });
  const io = new FakeTerminalIO(["\t", "\t", "\r"], { columns: 32 });
  assertEquals(
    await requestSearchSelections({
      label: "Tags",
      placeholder: "Filter",
      search: () => [
        { id: "one", label: "One", value: 1 },
        { id: "two", label: "Two", value: 2 },
      ],
    }, { io }),
    [1],
  );
  assertExactFrame(
    io.writes[1] ?? "",
    "Tags [searching]\n┌──────────────────────────────┐\n│▌Filter                       │\n│Searching…                    │\n└──────────────────────────────┘\n",
    capabilities,
  );
  const resolved = io.writes[2] ?? "";
  assertExactFrame(
    resolved.slice(resolved.indexOf("\x1b[J") + "\x1b[J".length),
    "Tags [active]\n┌──────────────────────────────┐\n│▌Filter                       │\n│  [ ] One                     │\n│  [ ] Two                     │\n└──────────────────────────────┘\n",
    capabilities,
  );
  const submitted = io.writes.find((write) => write.includes("[submitted]")) ??
    "";
  assertExactFrame(
    submitted.slice(submitted.indexOf("\x1b[J") + "\x1b[J".length),
    "Tags [submitted]\n┌──────────────────────────────┐\n│                              │\n│  [✓] One                     │\n│  [ ] Two                     │\n└──────────────────────────────┘\n✓ Submitted",
    capabilities,
  );
});

Deno.test("the renderer holds query-filtered frames across widths, depths, and repertoires", () => {
  const state = {
    kind: "search-multiselect" as const,
    label: "Roles",
    lifecycle: { status: "active" as const },
    query: "re",
    cursor: 2,
    results: [
      { id: "render", label: "Render" },
      { kind: "group-heading" as const, id: "selected", label: "Selected" },
      { id: "animate", label: "Animate" },
    ],
    selectedIds: ["render", "animate"],
    highlightedIndex: 0,
  };
  const narrow = testTerminalCapabilities({ columns: 20 });
  assertExactFrame(
    renderCheckboxCli({ ...state, width: 20 }, narrow),
    `Roles [active]\n┌──────────────────┐\n│re▌               │\n│› [✓] Render      │\n│                  │\n│${
      headingRule("Selected", 18)
    }│\n│  [✓] Animate     │\n└──────────────────┘\n`,
    narrow,
  );
  const ascii = testTerminalCapabilities({ columns: 26, unicode: false });
  assertExactFrame(
    renderCheckboxCli({ ...state, width: 26 }, ascii),
    `Roles [active]\n+------------------------+\n|re|                     |\n|> [x] Render            |\n|                        |\n|${
      headingRule("Selected", 24, false)
    }|\n|  [x] Animate           |\n+------------------------+\n`,
    ascii,
  );
  const styled = testTerminalCapabilities({
    columns: 26,
    colorDepth: "truecolor",
  });
  assertStyledFrame(
    renderCheckboxCli({ ...state, width: 26 }, styled),
    `Roles [active]\n┌────────────────────────┐\n│re▌                     │\n│› [✓] Render            │\n│                        │\n│${
      headingRule("Selected", 24)
    }│\n│  [✓] Animate           │\n└────────────────────────┘\n`,
    styled,
  );
});
