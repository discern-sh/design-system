import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import {
  requestSearch,
  requestSelection,
  requestSelections,
  requestTextarea,
} from "../../src/cli/interactive/mod.ts";
import type {
  InteractionEntry,
  SearchRequestOptions,
} from "../../src/cli/interactive/mod.ts";
import { stripAnsi } from "../../src/cli/ansi.ts";
import { fitInteractionFrame } from "../../src/cli/interactive/viewport-budget.ts";
import { FakeTerminalIO } from "../../src/cli/interactive/testing.ts";

const FIRST_COLUMN = "\x1b[1G";
const ERASE_TO_END = "\x1b[J";

const groupedChoices: readonly InteractionEntry<string>[] = Array.from(
  { length: 4 },
  (_, group) => [
    {
      kind: "group-heading" as const,
      id: `group-${group}`,
      label: `Group ${group + 1}`,
    },
    ...Array.from({ length: 4 }, (_, item) => ({
      id: `choice-${group}-${item}`,
      label: `Choice ${group + 1}.${item + 1}`,
      value: `${group}-${item}`,
    })),
  ],
).flat();

function displayedFrame(write: string): string | undefined {
  const eraseAt = write.indexOf(ERASE_TO_END);
  const candidate = write.startsWith(FIRST_COLUMN) && eraseAt >= 0
    ? write.slice(eraseAt + ERASE_TO_END.length)
    : write;
  if (!candidate.includes("\n┌")) {
    return undefined;
  }
  return stripAnsi(
    candidate.endsWith("\n") ? candidate.slice(0, -1) : candidate,
  );
}

function displayedFrames(io: FakeTerminalIO): readonly string[] {
  return io.writes.flatMap((write) => {
    const frame = displayedFrame(write);
    return frame === undefined ? [] : [frame];
  });
}

function frameRows(frame: string): number {
  return frame === "" ? 0 : frame.split("\n").length;
}

class ResizingTerminal extends FakeTerminalIO {
  readonly frameWrites: Array<
    { readonly frame: string; readonly rows: number }
  > = [];
  readonly #sizes: readonly number[];
  #reads = 0;

  constructor(
    chunks: readonly string[],
    initialRows: number,
    sizes: readonly number[],
  ) {
    super(chunks, { columns: 42, rows: initialRows });
    this.#sizes = sizes;
  }

  override read(): Promise<Uint8Array | null> {
    const rows = this.#sizes[this.#reads];
    this.#reads += 1;
    if (rows !== undefined) this.resize(this.size().columns, rows);
    return super.read();
  }

  override write(value: string): void {
    const frame = displayedFrame(value);
    if (frame !== undefined) {
      this.frameWrites.push({ frame, rows: this.size().rows });
    }
    super.write(value);
  }
}

Deno.test("grouped 16-row select and search frames obey short, ordinary, and tall viewport budgets", async () => {
  const selectHeights: number[] = [];
  const searchHeights: number[] = [];
  for (const rows of [8, 24, 40]) {
    const selectIo = new FakeTerminalIO(["\r"], { columns: 42, rows });
    assertEquals(
      await requestSelection({
        label: `Select at ${rows} rows`,
        choices: groupedChoices,
        visibleCount: 16,
      }, { io: selectIo }),
      "0-0",
    );
    const selectFrames = displayedFrames(selectIo);
    selectHeights.push(Math.max(...selectFrames.map(frameRows)));
    for (const frame of selectFrames) {
      assert(
        frameRows(frame) <= rows,
        `select rendered ${frameRows(frame)} rows into a ${rows}-row terminal`,
      );
    }

    const searchIo = new FakeTerminalIO(["\r", "\r"], {
      columns: 42,
      rows,
    });
    assertEquals(
      await requestSearch({
        label: `Search at ${rows} rows`,
        search: () => groupedChoices,
        visibleCount: 16,
      }, { io: searchIo }),
      "0-0",
    );
    const searchFrames = displayedFrames(searchIo);
    searchHeights.push(Math.max(...searchFrames.map(frameRows)));
    for (const frame of searchFrames) {
      assert(
        frameRows(frame) <= rows,
        `search rendered ${frameRows(frame)} rows into a ${rows}-row terminal`,
      );
    }
  }
  assert((selectHeights[2] ?? 0) > (selectHeights[0] ?? 0));
  assert((searchHeights[2] ?? 0) > (searchHeights[0] ?? 0));
});

Deno.test("the renderer-measured authority enrolls future interaction machines", () => {
  const attempts: number[] = [];
  const fitted = fitInteractionFrame({
    viewportRows: 6,
    frame: ({ maximumControlRows }) => {
      attempts.push(maximumControlRows);
      return { rows: Math.min(9, maximumControlRows) };
    },
    render: ({ rows }) =>
      ["Future [active]", "┌─┐", ...Array(rows).fill("│ │"), "└─┘"].join("\n"),
  });
  assertEquals(fitted.frameRows, 6);
  assertEquals(fitted.state.rows, 3);
  assert(attempts.length > 1);

  const largest = fitInteractionFrame({
    viewportRows: 6,
    frame: ({ maximumControlRows }) => ({
      controlRows: maximumControlRows,
      renderedRows: maximumControlRows === 6 ? 9 : 6,
    }),
    render: ({ renderedRows }) => Array(renderedRows).fill("row").join("\n"),
  });
  assertEquals(
    largest.controlRows,
    5,
    "fitting must not skip a larger non-linear control window",
  );

  assertThrows(
    () =>
      fitInteractionFrame({
        viewportRows: 6,
        frame: () => ({ rows: 9 }),
        render: ({ rows }) => Array(rows).fill("fixed").join("\n"),
      }),
    TypeError,
    "cannot hold a coherent interaction frame",
  );
});

Deno.test("repeated 16-row interaction cycles do not progressively surrender terminal height", async () => {
  const io = new FakeTerminalIO([], { columns: 42, rows: 10 });
  const activeHeights: number[] = [];
  for (let cycle = 0; cycle < 3; cycle += 1) {
    io.enqueue("\r\r");
    await requestSearch({
      label: `Search ${cycle}`,
      search: () => groupedChoices,
      visibleCount: 16,
    }, { io });
    io.enqueue("\r");
    await requestSelection({
      label: `Select ${cycle}`,
      choices: groupedChoices,
      visibleCount: 16,
    }, { io });
    const frames = displayedFrames(io).filter((frame) => frame.includes("›"));
    activeHeights.push(frameRows(frames.at(-1) ?? ""));
  }
  assertEquals(new Set(activeHeights).size, 1);
  assert(activeHeights.every((height) => height <= io.size().rows));
});

Deno.test("an active grouped interaction recomputes its window after shrinking and growing", async () => {
  const io = new ResizingTerminal(
    ["\x1b[B", "\x1b[B", "\r"],
    30,
    [8, 30, 30],
  );
  assertEquals(
    await requestSelection({
      label: "Resize",
      choices: groupedChoices,
      visibleCount: 16,
    }, { io }),
    "0-2",
  );
  assert(io.frameWrites.some(({ rows }) => rows === 8));
  assert(io.frameWrites.some(({ rows }) => rows === 30));
  for (const { frame, rows } of io.frameWrites) {
    assert(
      frameRows(frame) <= rows,
      `rendered ${frameRows(frame)} rows after resizing to ${rows}`,
    );
  }
  const shrunk = io.frameWrites.find(({ rows }) => rows === 8)?.frame ?? "";
  assertStringIncludes(shrunk, "GROUP 1");
  assertStringIncludes(shrunk, "Choice 1.2");
});

Deno.test("group headings consume real viewport rows without becoming selectable counts", async () => {
  const io = new FakeTerminalIO(["\r"], { columns: 42, rows: 8 });
  assertEquals(
    await requestSelection({
      label: "Many headings",
      choices: groupedChoices,
      initialId: "choice-3-3",
      visibleCount: 16,
    }, { io }),
    "3-3",
  );
  const active = displayedFrames(io).find((frame) => frame.includes("›")) ?? "";
  assert(frameRows(active) <= 8);
  assertStringIncludes(active, "GROUP 4");
  assertStringIncludes(active, "Choice 4.4");
});

Deno.test("textarea uses requested tall rows and keeps the logical cursor inside a bounded window", async () => {
  const tallValue = Array.from({ length: 8 }, (_, index) => `Line ${index + 1}`)
    .join("\n");
  const tallIo = new FakeTerminalIO(["\x04"], { columns: 42, rows: 20 });
  assertEquals(
    await requestTextarea({
      label: "Tall editor",
      initialValue: tallValue,
      rows: 8,
    }, { io: tallIo }),
    tallValue,
  );
  const tallActive =
    displayedFrames(tallIo).find((frame) => frame.includes("▌")) ?? "";
  assertStringIncludes(tallActive, "Line 8▌");
  assert(frameRows(tallActive) > 7);

  const boundedIo = new FakeTerminalIO(["\x1b[A", "\x04"], {
    columns: 42,
    rows: 8,
  });
  await requestTextarea({
    label: "Bounded editor",
    initialValue: tallValue,
    rows: 8,
  }, { io: boundedIo });
  for (const frame of displayedFrames(boundedIo)) {
    assert(frameRows(frame) <= 8);
  }
  const activeFrames = displayedFrames(boundedIo).filter((frame) =>
    frame.includes("▌")
  );
  assert(activeFrames.every((frame) => frame.includes("▌")));
  assertStringIncludes(activeFrames[0] ?? "", "Line 8▌");
  assertStringIncludes(activeFrames.at(-1) ?? "", "Line 7▌");
});

Deno.test("a terminal shorter than the minimum coherent interaction frame refuses cleanly", async () => {
  const io = new FakeTerminalIO(["\r"], { columns: 42, rows: 3 });
  await assertRejects(
    () =>
      requestSelection({
        label: "Too short",
        choices: groupedChoices,
        visibleCount: 16,
      }, { io }),
    TypeError,
    "cannot hold a coherent interaction frame",
  );
  assertEquals(io.rawTransitions, [true, false]);
});

Deno.test("search initialId remembers a stable enabled choice across filtering and provider reordering", async () => {
  const entries = [
    { kind: "group-heading" as const, id: "group", label: "Group" },
    { id: "first", label: "Duplicate", value: "first" },
    { id: "disabled", label: "Duplicate", value: "disabled", disabled: true },
    { id: "remembered", label: "Duplicate", value: "remembered" },
  ] as const satisfies readonly InteractionEntry<string>[];
  const options = {
    label: "Remember",
    initialId: "remembered",
    search: async (query: string) => {
      await Promise.resolve();
      if (query === "x") return [entries[3], entries[1]] as const;
      return entries;
    },
  } satisfies SearchRequestOptions<string> & { readonly initialId: string };

  const initial = new FakeTerminalIO(["\r"]);
  assertEquals(await requestSearch(options, { io: initial }), "remembered");

  const reordered = new FakeTerminalIO(["x\r"]);
  assertEquals(await requestSearch(options, { io: reordered }), "remembered");

  const cleared = new FakeTerminalIO(["x\x7f\r"]);
  assertEquals(await requestSearch(options, { io: cleared }), "remembered");

  const navigated = new FakeTerminalIO(["\x1b[B\r"]);
  assertEquals(await requestSearch(options, { io: navigated }), "first");

  const filteredNavigation = new FakeTerminalIO(["x\x1b[B\r"]);
  assertEquals(
    await requestSearch(options, { io: filteredNavigation }),
    "first",
  );

  for (const invalidId of ["group", "disabled"]) {
    const invalidOptions = { ...options, initialId: invalidId };
    const io = new FakeTerminalIO(["\r", "\r"]);
    assertEquals(await requestSearch(invalidOptions, { io }), "first");
  }

  const absent = new FakeTerminalIO(["\r", "\r"]);
  assertEquals(
    await requestSearch({ label: "Current", search: () => entries }, {
      io: absent,
    }),
    "first",
  );
});

Deno.test("PageUp and PageDown jump the visible window of grouped choice machines", async () => {
  const io = new FakeTerminalIO(["\x1b[6~", "\x1b[6~", "\x1b[5~", "\r"], {
    columns: 42,
    rows: 24,
  });
  assertEquals(
    await requestSelection({
      label: "Paged",
      choices: groupedChoices,
      visibleCount: 5,
    }, { io }),
    "1-0",
  );
  assert(
    displayedFrames(io).some((frame) => frame.includes("Choice 3.1")),
    "PageDown must scroll the window to the jumped choice",
  );

  const multi = new FakeTerminalIO(["\x1b[6~", " ", "\r"], {
    columns: 42,
    rows: 24,
  });
  assertEquals(
    await requestSelections({
      label: "Paged many",
      choices: groupedChoices,
      visibleCount: 5,
    }, { io: multi }),
    ["1-0"],
  );

  const clamped = new FakeTerminalIO(["\x1b[F", "\x1b[6~", "\r"], {
    columns: 42,
    rows: 24,
  });
  assertEquals(
    await requestSelection({
      label: "Clamped",
      choices: groupedChoices,
      visibleCount: 5,
    }, { io: clamped }),
    "3-3",
  );
});

Deno.test("paging jumps follow the fitted window rather than the requested count", async () => {
  const io = new FakeTerminalIO(["\x1b[6~", "\x1b[6~", "\r"], {
    columns: 42,
    rows: 8,
  });
  assertEquals(
    await requestSelection({
      label: "Short paged",
      choices: groupedChoices,
      visibleCount: 16,
    }, { io }),
    "1-0",
  );
  for (const frame of displayedFrames(io)) {
    assert(
      frameRows(frame) <= 8,
      `paged frame rendered ${frameRows(frame)} rows into an 8-row terminal`,
    );
  }
});
