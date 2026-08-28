import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import { TERMINAL_FRAME_MEASURE } from "../../src/cli/frame-measure.ts";
import { renderSelectCli } from "../../src/cli/mod.ts";
import {
  type InteractionEntry,
  type InteractionSelectionPresentation,
  requestSearch,
  requestSelection,
  type SelectionsRequestOptions,
} from "../../src/cli/interactive/mod.ts";
import {
  assertExactFrame,
  FakeTerminalIO,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

const menuPresentation = "menu" satisfies InteractionSelectionPresentation;

// A menu triggers one value. This assignment stops compiling if a future
// multi-selection presentation union admits it.
const menuIsExcludedFromMultiselect: "menu" extends NonNullable<
  SelectionsRequestOptions<number>["presentation"]
> ? false
  : true = true;
assert(menuIsExcludedFromMultiselect);

const entries = [
  {
    kind: "group-heading",
    id: "work",
    label: "Work",
    description: "Actions that continue this task.",
  },
  {
    id: "checks",
    label: "Run final checks",
    description: "Run the complete gate and record Proof when it passes.",
    value: "checks",
  },
  {
    id: "blocked",
    label: "Continue with an agent",
    description:
      "Temporarily unavailable — wait for the running operation to finish, then refresh this task.",
    value: "blocked",
    disabled: true,
  },
  {
    kind: "group-heading",
    id: "review",
    label: "Review",
    description: "Read-only evidence for this task.",
  },
  {
    id: "inspect",
    label: "Review Proof and changes",
    description:
      "Inspect Proof, commits, changed files, and the complete diff.",
    value: "inspect",
  },
] as const satisfies readonly InteractionEntry<string>[];

const FIRST_COLUMN = "\x1b[1G";
const ERASE_TO_END = "\x1b[J";

function paintedFrames(io: FakeTerminalIO): readonly string[] {
  return io.writes.flatMap((write) => {
    const eraseAt = write.indexOf(ERASE_TO_END);
    const frame = write.startsWith(FIRST_COLUMN) && eraseAt >= 0
      ? write.slice(eraseAt + ERASE_TO_END.length)
      : write;
    return frame.includes("┌") || /^\+-{3,}\+$/mu.test(frame) ? [frame] : [];
  });
}

function assertMenuFrameClass(
  frame: string,
  marker: "×" | "x",
): void {
  const plain = stripAnsi(frame);
  assertStringIncludes(plain, "WORK");
  assertStringIncludes(plain, marker);
  assert(!plain.includes("[●]"), "focus must not masquerade as selection");
  assert(!plain.includes("(disabled)"), "menu rows must stay compact");
  assert(
    !plain.includes("Run the complete gate"),
    "another row's detail leaked inline",
  );
  assert(
    !plain.includes("Inspect Proof, commits"),
    "another group's detail leaked inline",
  );
  const top = plain.split("\n").find((line) =>
    line.startsWith("┌") || line.startsWith("+")
  );
  assertEquals(top?.length, TERMINAL_FRAME_MEASURE);
}

const narrowMenuFrame =
  "Choose an action\n┌──────────────────────────────┐\n│ WORK                         │\n│     Run final checks         │\n│ › × Continue with an agent   │\n│                              │\n│ REVIEW                       │\n│     Review Proof and changes │\n│ ──────────────────────────── │\n│ Actions that continue this   │\n│ task. Temporarily            │\n│ unavailable — wait for the … │\n└──────────────────────────────┘\n";

const standardMenuFrame =
  "Choose an action\n┌────────────────────────────────────────────────────────────┐\n│ WORK                                                       │\n│     Run final checks                                       │\n│ › × Continue with an agent                                 │\n│                                                            │\n│ REVIEW                                                     │\n│     Review Proof and changes                               │\n│ ────────────────────────────────────────────────────────── │\n│ Actions that continue this task. Temporarily unavailable — │\n│ wait for the running operation to finish, then refresh     │\n│ this task.                                                 │\n└────────────────────────────────────────────────────────────┘\n";

const asciiMenuFrame =
  "Choose an action\n+------------------------------------------------------------+\n| WORK                                                       |\n|     Run final checks                                       |\n| > x Continue with an agent                                 |\n|                                                            |\n| REVIEW                                                     |\n|     Review Proof and changes                               |\n| ---------------------------------------------------------- |\n| Actions that continue this task. Temporarily unavailable — |\n| wait for the running operation to finish, then refresh     |\n| this task.                                                 |\n+------------------------------------------------------------+\n";

function renderBlockedMenu(
  columns: number,
  unicode = true,
  width?: number,
): string {
  return renderSelectCli({
    kind: "select",
    label: "Choose an action",
    lifecycle: { status: "active" },
    presentation: "menu",
    options: entries,
    highlightedIndex: 2,
    ...(width === undefined ? {} : { width }),
  }, testTerminalCapabilities({ columns, unicode }));
}

Deno.test("menu frames are exact across widths and terminal repertoires", () => {
  const narrow = testTerminalCapabilities({ columns: 32 });
  assertExactFrame(renderBlockedMenu(32), narrowMenuFrame, narrow);

  const standard = testTerminalCapabilities({ columns: 62 });
  assertExactFrame(renderBlockedMenu(62), standardMenuFrame, standard);

  const wide = testTerminalCapabilities({ columns: 100 });
  assertExactFrame(renderBlockedMenu(100), standardMenuFrame, wide);

  const ascii = testTerminalCapabilities({ columns: 62, unicode: false });
  assertExactFrame(renderBlockedMenu(62, false), asciiMenuFrame, ascii);

  const explicit = stripAnsi(renderBlockedMenu(100, true, 80));
  assertEquals(explicit.split("\n")[1]?.length, 80);
});

Deno.test("menu disabled styling uses one muted signal without typographic dimming", () => {
  const frame = renderSelectCli({
    kind: "select",
    label: "Choose an action",
    lifecycle: { status: "active" },
    presentation: "menu",
    options: entries,
    highlightedIndex: 2,
  }, testTerminalCapabilities({ columns: 62, colorDepth: "truecolor" }));
  const unavailable = frame.split("\n").find((line) =>
    stripAnsi(line).includes("Continue with an agent")
  );
  assert(unavailable !== undefined);
  assert(
    !unavailable.includes("\x1b[2m"),
    "disabled menu text was dimmed twice",
  );
  assertEquals(
    stripAnsi(frame).split("\n").filter((line) => line.includes("›")).length,
    1,
  );
});

Deno.test("menu selection focuses unavailable entries without activating them", async () => {
  for (
    const posture of [
      { unicode: true, marker: "×" as const },
      { unicode: false, marker: "x" as const },
    ]
  ) {
    const io = new FakeTerminalIO(
      ["\x1b[B\r\x1b[B\r"],
      { columns: 100, rows: 30, unicode: posture.unicode },
    );
    assertEquals(
      await requestSelection({
        label: "Choose an action",
        choices: entries,
        presentation: menuPresentation,
      }, { io }),
      "inspect",
    );

    const frames = paintedFrames(io);
    const blocked = frames.find((frame) =>
      stripAnsi(frame).includes("Temporarily unavailable")
    );
    assert(blocked !== undefined, "unavailable focus never painted its detail");
    assertMenuFrameClass(blocked, posture.marker);
    assertStringIncludes(
      stripAnsi(blocked),
      "Actions that continue this task.",
    );
    assertStringIncludes(stripAnsi(blocked), "wait for the running operation");

    const active = frames.filter((frame) =>
      !stripAnsi(frame).includes("Submitted")
    );
    assert(
      active.length >= 3,
      "initial, unavailable, and next focus frames were not all painted",
    );
    assertEquals(
      new Set(active.slice(0, 3).map((frame) => frame.split("\n").length)).size,
      1,
      "moving focus changed the menu frame height",
    );
  }
});

Deno.test("menu search shares focus, detail, and non-activation semantics", async () => {
  const io = new FakeTerminalIO(
    ["\r\x1b[B\r\x1b[B\r"],
    { columns: 100, rows: 30 },
  );
  assertEquals(
    await requestSearch({
      label: "Find an action",
      search: entries,
      presentation: menuPresentation,
    }, { io }),
    "inspect",
  );
  const frames = paintedFrames(io);
  const blocked = frames.find((frame) =>
    stripAnsi(frame).includes("Temporarily unavailable")
  );
  assert(blocked !== undefined, "search never focused the unavailable result");
  assertMenuFrameClass(blocked, "×");
});

Deno.test("menu search still matches descriptions moved into the inspector", async () => {
  const io = new FakeTerminalIO(["passes\r\r"], {
    columns: 62,
    rows: 20,
  });
  assertEquals(
    await requestSearch({
      label: "Find an action",
      search: entries,
      presentation: "menu",
    }, { io }),
    "checks",
  );
  const active = paintedFrames(io).find((frame) =>
    stripAnsi(frame).includes("passes▌")
  );
  assert(active !== undefined);
  assertStringIncludes(stripAnsi(active), "Run final checks");
  assert(!stripAnsi(active).includes("Review Proof and changes"));
});

Deno.test("menu may start on an unavailable choice for immediate inspection", async () => {
  const io = new FakeTerminalIO(["\x1b[B\r"], { columns: 62, rows: 20 });
  assertEquals(
    await requestSelection({
      label: "Choose an action",
      choices: entries,
      presentation: "menu",
      initialId: "blocked",
    }, { io }),
    "inspect",
  );
  const initial = paintedFrames(io)[0];
  assert(initial !== undefined);
  assertStringIncludes(stripAnsi(initial), "› × Continue with an agent");
  assertStringIncludes(stripAnsi(initial), "Temporarily unavailable");
});

Deno.test("menu detail and grouped rows fit constrained and resized viewports", async () => {
  for (const rows of [8, 12]) {
    const io = new FakeTerminalIO(["\r"], { columns: 32, rows });
    assertEquals(
      await requestSelection({
        label: "Choose an action",
        choices: entries,
        presentation: "menu",
        visibleCount: 20,
      }, { io }),
      "checks",
    );
    for (const frame of paintedFrames(io)) {
      assert(
        frame.split("\n").length <= rows,
        `menu painted beyond its ${rows}-row viewport`,
      );
    }
  }

  class ResizingMenuTerminal extends FakeTerminalIO {
    readonly #columns: readonly number[];
    #reads = 0;

    constructor() {
      super(["\x1b[B", "\x1b[B", "\r"], { columns: 70, rows: 20 });
      this.#columns = [32, 70, 70];
    }

    override read(): Promise<Uint8Array | null> {
      const columns = this.#columns[this.#reads];
      this.#reads += 1;
      if (columns !== undefined) this.resize(columns, 20);
      return super.read();
    }
  }

  const resized = new ResizingMenuTerminal();
  assertEquals(
    await requestSelection({
      label: "Choose an action",
      choices: entries,
      presentation: "menu",
    }, { io: resized }),
    "inspect",
  );
  const widths = paintedFrames(resized).flatMap((frame) => {
    const top = stripAnsi(frame).split("\n").find((line) =>
      line.startsWith("┌")
    );
    return top === undefined ? [] : [top.length];
  });
  assert(widths.includes(32));
  assert(widths.includes(TERMINAL_FRAME_MEASURE));
});
