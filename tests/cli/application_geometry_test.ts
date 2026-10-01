import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { measureText, stripAnsi } from "../../src/cli/mod.ts";
import {
  createTerminalApplicationModel,
  renderTerminalApplication,
  TERMINAL_APPLICATION_MINIMUM,
  type TerminalApplicationLayout,
} from "../../src/cli/interactive/mod.ts";
import { FakeTerminalIO } from "../../src/cli/interactive/testing.ts";
import {
  layoutListColumns,
  listGaps,
  renderListRow,
} from "../../src/cli/interactive/application/list-render.ts";
import { paintContext } from "../../src/cli/interactive/application/paint.ts";
import {
  applicationDemoView,
  DEMO_JOBS,
  DEMO_TIP,
} from "../../scripts/playground/application.ts";

/** The pinned matrix: width tiers, height tiers, and the minimum. */
const MATRIX: readonly {
  readonly columns: number;
  readonly rows: number;
  readonly layout: TerminalApplicationLayout;
  /** Whether the overlap flag column survives the column priority rule. */
  readonly flag: boolean;
  /** Whether the age column survives. */
  readonly age: boolean;
}[] = [
  { columns: 120, rows: 30, layout: "split", flag: true, age: true },
  { columns: 80, rows: 24, layout: "split", flag: false, age: true },
  { columns: 60, rows: 20, layout: "strip", flag: true, age: true },
  { columns: 40, rows: 20, layout: "strip", flag: false, age: true },
  { columns: 80, rows: 13, layout: "split", flag: false, age: true },
  { columns: 32, rows: 10, layout: "strip", flag: false, age: false },
];

const POSTURES = [
  { theme: "dark", colorDepth: "truecolor", unicode: true },
  { theme: "light", colorDepth: "truecolor", unicode: true },
  { theme: "dark", colorDepth: "ansi256", unicode: true },
  { theme: "light", colorDepth: "ansi16", unicode: true },
  { theme: "dark", colorDepth: "none", unicode: false },
] as const;

const TITLES = DEMO_JOBS.map((job) => job.title);

/** The list's item rows: a marker in the gutter, then a title; the strip names its key. */
function listRows(text: string, width: number): readonly string[] {
  return text.split("\n").map((line) => line.slice(0, width)).filter((row) =>
    TITLES.some((title) => row.slice(4).startsWith(title.slice(0, 8))) &&
    !row.includes("Space")
  );
}

Deno.test("application frames fill every pinned geometry and posture exactly", () => {
  for (const geometry of MATRIX) {
    for (const posture of POSTURES) {
      const io = new FakeTerminalIO([], {
        columns: geometry.columns,
        rows: geometry.rows,
        colorDepth: posture.colorDepth,
        unicode: posture.unicode,
      });
      const frame = renderTerminalApplication(
        createTerminalApplicationModel(applicationDemoView(undefined, DEMO_TIP))
          .model,
        io.size(),
        io.capabilities(),
        { theme: posture.theme, appearance: { accent: 220 } },
      );
      const where =
        `${geometry.columns}x${geometry.rows} ${posture.theme} ${posture.colorDepth}`;
      const lines = frame.frame.split("\n");
      assertEquals(lines.length, geometry.rows, where);
      for (const line of lines) {
        assertEquals(measureText(line), geometry.columns, `${where}: ${line}`);
      }
      assertEquals(frame.layout, geometry.layout, where);
      assertEquals(frame.report.selectedItemId, "quarterly-report", where);
      const text = stripAnsi(frame.frame);
      assertStringIncludes(text, "Quarterly", where);
      const flag = posture.unicode ? "⇄" : "&";
      const width = frame.model.lists.jobs?.density?.width ?? geometry.columns;
      const list = listRows(text, width);
      assertEquals(
        list.some((line) => line.includes(flag)),
        geometry.flag,
        where,
      );
      assertEquals(
        list.some((line) => /\b20m\b/u.test(line)),
        geometry.age,
        `${where}: age column`,
      );
    }
  }
});

Deno.test("every visible row's label and age end on one column per frame", () => {
  for (const geometry of MATRIX) {
    const io = new FakeTerminalIO([], {
      columns: geometry.columns,
      rows: geometry.rows,
      colorDepth: "none",
    });
    const frame = renderTerminalApplication(
      createTerminalApplicationModel(applicationDemoView()).model,
      io.size(),
      io.capabilities(),
    );
    const width = frame.model.lists.jobs?.density?.width ?? geometry.columns;
    const ends = new Set(
      listRows(stripAnsi(frame.frame), width).map((row) =>
        row.trimEnd().length
      ),
    );
    assertEquals(
      ends.size,
      1,
      `${geometry.columns}x${geometry.rows}: ${[...ends]}`,
    );
  }
});

Deno.test("a master-detail list is sized to its content and never squeezes the detail", () => {
  for (const [columns, expected] of [[120, 52], [100, 52], [80, 41]] as const) {
    const io = new FakeTerminalIO([], { columns, rows: 24 });
    const frame = renderTerminalApplication(
      createTerminalApplicationModel(applicationDemoView()).model,
      io.size(),
      io.capabilities(),
    );
    assertEquals(
      frame.model.lists.jobs?.density?.width,
      expected,
      `${columns}`,
    );
  }
});

Deno.test("the header, message line, and footer keep their places by height tier", () => {
  const rowsOf = (rows: number) => {
    const io = new FakeTerminalIO([], {
      columns: 80,
      rows,
      colorDepth: "none",
    });
    return stripAnsi(
      renderTerminalApplication(
        createTerminalApplicationModel(applicationDemoView(undefined, DEMO_TIP))
          .model,
        io.size(),
        io.capabilities(),
      ).frame,
    ).split("\n");
  };
  const roomy = rowsOf(24);
  assertStringIncludes(roomy[0] ?? "", "Studio");
  assertEquals(
    roomy[1]?.trim(),
    "",
    "a blank row under the header from 20 rows",
  );
  assertStringIncludes(roomy[22] ?? "", "Tip");
  assertStringIncludes(roomy[23] ?? "", "Run sample");
  const middle = rowsOf(16);
  assert((middle[1]?.trim() ?? "") !== "", "no blank row below 20 rows");
  const short = rowsOf(12);
  assertStringIncludes(
    short[11] ?? "",
    "Tip",
    "below 14 rows a message replaces the footer",
  );
});

Deno.test("below the minimum the notice names the size it needs", () => {
  for (
    const [columns, rows] of [
      [TERMINAL_APPLICATION_MINIMUM.columns - 1, 10],
      [32, TERMINAL_APPLICATION_MINIMUM.rows - 1],
      [12, 4],
    ] as const
  ) {
    const io = new FakeTerminalIO([], { columns, rows });
    const frame = renderTerminalApplication(
      createTerminalApplicationModel(applicationDemoView()).model,
      io.size(),
      io.capabilities(),
    );
    assertEquals(frame.layout, "too-small");
    const lines = frame.frame.split("\n");
    assertEquals(lines.length, rows);
    for (const line of lines) assertEquals(measureText(line), columns);
    if (columns >= 30) {
      assertStringIncludes(
        stripAnsi(frame.frame),
        `Needs 32 × 10; now ${columns} × ${rows}`,
      );
    }
  }
});

Deno.test("a selection under a layer recedes to the muted fill and keeps its bar", () => {
  const io = new FakeTerminalIO([], { columns: 40, rows: 10 });
  const capabilities = {
    ...io.capabilities(),
    colorDepth: "truecolor" as const,
  };
  const context = paintContext(capabilities, {}, { phase: 0 });
  const view = applicationDemoView();
  if (view.body.kind !== "master-detail") throw new Error("expected a list");
  const list = view.body.list;
  const [group] = list.groups;
  const [item] = group?.items ?? [];
  if (group === undefined || item === undefined) throw new Error("no item");
  const row = { kind: "item" as const, group, item, key: `i:${item.id}` };
  const layout = layoutListColumns(list, 40, listGaps(list, false));
  const background = (role: "selection" | "selectionMuted") => {
    const fill = context.theme.surfaces[role];
    return `48;2;${fill.red};${fill.green};${fill.blue}`;
  };
  const active = renderListRow(context, row, layout, 40, true);
  const receded = renderListRow(context, row, layout, 40, true, true);
  assert(active.includes(background("selection")));
  assert(receded.includes(background("selectionMuted")));
  assert(!receded.includes(background("selection")));
  assertEquals(stripAnsi(receded), stripAnsi(active));
  assert(stripAnsi(receded).startsWith("▌ ✓ Quarterly report"));
});
