import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import {
  promptSearch,
  promptSelect,
  promptTextarea,
} from "../../src/cli/interactive/mod.ts";
import type {
  PromptChoiceEntry,
  SearchPromptOptions,
} from "../../src/cli/interactive/mod.ts";
import { stripAnsi } from "../../src/cli/ansi.ts";
import { fitPromptFrame } from "../../src/cli/interactive/viewport-budget.ts";
import { FakeTerminal } from "./fake-terminal.ts";

const FIRST_COLUMN = "\x1b[1G";
const ERASE_TO_END = "\x1b[J";

const groupedChoices: readonly PromptChoiceEntry<string>[] = Array.from(
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
  if (!/\[(?:active|error|submitted|cancelled)\]/u.test(candidate)) {
    return undefined;
  }
  return stripAnsi(
    candidate.endsWith("\n") ? candidate.slice(0, -1) : candidate,
  );
}

function displayedFrames(io: FakeTerminal): readonly string[] {
  return io.writes.flatMap((write) => {
    const frame = displayedFrame(write);
    return frame === undefined ? [] : [frame];
  });
}

function frameRows(frame: string): number {
  return frame === "" ? 0 : frame.split("\n").length;
}

class ResizingTerminal extends FakeTerminal {
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
    const selectIo = new FakeTerminal(["\r"], { columns: 42, rows });
    assertEquals(
      await promptSelect({
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

    const searchIo = new FakeTerminal(["\r", "\r"], {
      columns: 42,
      rows,
    });
    assertEquals(
      await promptSearch({
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

Deno.test("the renderer-measured authority enrolls future prompt machines", () => {
  const attempts: number[] = [];
  const fitted = fitPromptFrame({
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

  assertThrows(
    () =>
      fitPromptFrame({
        viewportRows: 6,
        frame: () => ({ rows: 9 }),
        render: ({ rows }) => Array(rows).fill("fixed").join("\n"),
      }),
    TypeError,
    "cannot hold a coherent prompt frame",
  );
});

Deno.test("repeated 16-row prompt cycles do not progressively surrender terminal height", async () => {
  const io = new FakeTerminal([], { columns: 42, rows: 10 });
  const activeHeights: number[] = [];
  for (let cycle = 0; cycle < 3; cycle += 1) {
    io.enqueue("\r\r");
    await promptSearch({
      label: `Search ${cycle}`,
      search: () => groupedChoices,
      visibleCount: 16,
    }, { io });
    io.enqueue("\r");
    await promptSelect({
      label: `Select ${cycle}`,
      choices: groupedChoices,
      visibleCount: 16,
    }, { io });
    const frames = displayedFrames(io).filter((frame) =>
      frame.includes("[active]")
    );
    activeHeights.push(frameRows(frames.at(-1) ?? ""));
  }
  assertEquals(new Set(activeHeights).size, 1);
  assert(activeHeights.every((height) => height <= io.size().rows));
});

Deno.test("an active grouped prompt recomputes its window after shrinking and growing", async () => {
  const io = new ResizingTerminal(
    ["\x1b[B", "\x1b[B", "\r"],
    30,
    [8, 30, 30],
  );
  assertEquals(
    await promptSelect({
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
  const io = new FakeTerminal(["\r"], { columns: 42, rows: 8 });
  assertEquals(
    await promptSelect({
      label: "Many headings",
      choices: groupedChoices,
      initialId: "choice-3-3",
      visibleCount: 16,
    }, { io }),
    "3-3",
  );
  const active =
    displayedFrames(io).find((frame) => frame.includes("[active]")) ?? "";
  assert(frameRows(active) <= 8);
  assertStringIncludes(active, "GROUP 4");
  assertStringIncludes(active, "Choice 4.4");
});

Deno.test("textarea uses requested tall rows and keeps the logical cursor inside a bounded window", async () => {
  const tallValue = Array.from({ length: 8 }, (_, index) => `Line ${index + 1}`)
    .join("\n");
  const tallIo = new FakeTerminal(["\x04"], { columns: 42, rows: 20 });
  assertEquals(
    await promptTextarea({
      label: "Tall editor",
      initialValue: tallValue,
      rows: 8,
    }, { io: tallIo }),
    tallValue,
  );
  const tallActive =
    displayedFrames(tallIo).find((frame) => frame.includes("[active]")) ?? "";
  assertStringIncludes(tallActive, "Line 8▌");
  assert(frameRows(tallActive) > 7);

  const boundedIo = new FakeTerminal(["\x1b[A", "\x04"], {
    columns: 42,
    rows: 8,
  });
  await promptTextarea({
    label: "Bounded editor",
    initialValue: tallValue,
    rows: 8,
  }, { io: boundedIo });
  for (const frame of displayedFrames(boundedIo)) {
    assert(frameRows(frame) <= 8);
  }
  const activeFrames = displayedFrames(boundedIo).filter((frame) =>
    frame.includes("[active]")
  );
  assert(activeFrames.every((frame) => frame.includes("▌")));
  assertStringIncludes(activeFrames[0] ?? "", "Line 8▌");
  assertStringIncludes(activeFrames.at(-1) ?? "", "Line 7▌");
});

Deno.test("a terminal shorter than the minimum coherent prompt frame refuses cleanly", async () => {
  const io = new FakeTerminal(["\r"], { columns: 42, rows: 3 });
  await assertRejects(
    () =>
      promptSelect({
        label: "Too short",
        choices: groupedChoices,
        visibleCount: 16,
      }, { io }),
    TypeError,
    "cannot hold a coherent prompt frame",
  );
  assertEquals(io.rawTransitions, [true, false]);
});

Deno.test("search initialId remembers a stable enabled choice across filtering and provider reordering", async () => {
  const entries = [
    { kind: "group-heading" as const, id: "group", label: "Group" },
    { id: "first", label: "Duplicate", value: "first" },
    { id: "disabled", label: "Duplicate", value: "disabled", disabled: true },
    { id: "remembered", label: "Duplicate", value: "remembered" },
  ] as const satisfies readonly PromptChoiceEntry<string>[];
  const options = {
    label: "Remember",
    initialId: "remembered",
    search: async (query: string) => {
      await Promise.resolve();
      if (query === "x") return [entries[3], entries[1]] as const;
      return entries;
    },
  } satisfies SearchPromptOptions<string> & { readonly initialId: string };

  const initial = new FakeTerminal(["\r"]);
  assertEquals(await promptSearch(options, { io: initial }), "remembered");

  const reordered = new FakeTerminal(["x\r"]);
  assertEquals(await promptSearch(options, { io: reordered }), "remembered");

  const cleared = new FakeTerminal(["x\x7f\r"]);
  assertEquals(await promptSearch(options, { io: cleared }), "remembered");

  const navigated = new FakeTerminal(["\x1b[B\r"]);
  assertEquals(await promptSearch(options, { io: navigated }), "first");

  const filteredNavigation = new FakeTerminal(["x\x1b[B\r"]);
  assertEquals(
    await promptSearch(options, { io: filteredNavigation }),
    "first",
  );

  for (const invalidId of ["group", "disabled"]) {
    const invalidOptions = { ...options, initialId: invalidId };
    const io = new FakeTerminal(["\r", "\r"]);
    assertEquals(await promptSearch(invalidOptions, { io }), "first");
  }

  const absent = new FakeTerminal(["\r", "\r"]);
  assertEquals(
    await promptSearch({ label: "Current", search: () => entries }, {
      io: absent,
    }),
    "first",
  );
});
