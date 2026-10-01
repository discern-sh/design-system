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
  renderListViewport,
} from "../../src/cli/interactive/application/list-render.ts";
import { flattenList } from "../../src/cli/interactive/application/list-model.ts";
import { renderDetailBlocks } from "../../src/cli/interactive/application/detail-render.ts";
import { paintContext } from "../../src/cli/interactive/application/paint.ts";
import type { DetailBlock } from "../../src/cli/interactive/mod.ts";
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

Deno.test("below the split the detail is a strip of whole facts with the Space key", () => {
  const strip = (rows: number, colorDepth: "truecolor" | "none") => {
    const io = new FakeTerminalIO([], { columns: 60, rows, colorDepth });
    return stripAnsi(
      renderTerminalApplication(
        createTerminalApplicationModel(applicationDemoView()).model,
        io.size(),
        io.capabilities(),
      ).frame,
    ).split("\n");
  };
  const tall = strip(20, "truecolor");
  assertStringIncludes(tall[17] ?? "", "✓ Quarterly report  Ready");
  assert(tall[17]?.trimEnd().endsWith("Space"));
  assertEquals(
    tall[18]?.trim(),
    "Passed 20m ago · 14 files  +212 −18",
    "whole facts joined by a separator",
  );
  assert(!tall[16]?.includes("─"), "a painted strip needs no rule");
  const short = strip(12, "truecolor");
  assert(
    short[10]?.trim().startsWith("Passed 20m ago · 14 files"),
    "one line of whole facts below 14 rows",
  );
  assert(short[10]?.trimEnd().endsWith("Space"));
  const plain = strip(20, "none");
  assert(
    plain[16]?.trim().startsWith("─"),
    "without fills a rule introduces it",
  );
});

Deno.test("the header drops chips, then liveness, then counts as it narrows", () => {
  const view = applicationDemoView();
  const header = (columns: number) => {
    const io = new FakeTerminalIO([], {
      columns,
      rows: 20,
      colorDepth: "none",
    });
    const chipped = {
      ...view,
      header: {
        ...view.header,
        chips: [{ runs: [{ text: "! 2 stale" }] }, {
          runs: [{ text: "Update ready" }],
        }],
      },
    };
    return stripAnsi(
      renderTerminalApplication(
        createTerminalApplicationModel(chipped).model,
        io.size(),
        io.capabilities(),
      ).frame,
    ).split("\n")[0] ?? "";
  };
  assertStringIncludes(
    header(100),
    "! 2 stale   Update ready   1 to review    Live",
  );
  assertEquals(header(60).includes("Update ready"), false);
  assertStringIncludes(header(60), "! 2 stale  1 to review   Live");
  assertStringIncludes(header(40), "1 to review   Live");
  assertEquals(header(32).includes("Live"), false);
  assertStringIncludes(header(32), "1 to review");
  assertStringIncludes(header(32), "Studio");
});

Deno.test("every detail block line fits the width it was given", () => {
  // Every block kind, with text long enough to wrap and short enough to take
  // the one-line path, so a prefix that a fast path forgets fails here.
  const blocks: readonly DetailBlock[] = [
    {
      kind: "heading",
      title: "A heading title",
      aside: "an-aside",
      subtitle: "A subtitle that is long enough to wrap",
    },
    {
      kind: "state",
      glyph: { unicode: "✓", ascii: "v" },
      label: "Ready",
      tone: "success",
      qualifier: "four steps ahead",
    },
    {
      kind: "text",
      runs: [{ text: "Text that wraps across a narrow width more than once." }],
    },
    {
      kind: "facts",
      rows: [{
        label: "Label",
        value: [[{
          text: "A value long enough to wrap twice in a narrow detail",
        }]],
      }],
    },
    { kind: "meter", value: 0.4, caption: "two of five" },
    {
      kind: "marks",
      items: [
        {
          mark: { unicode: "→", ascii: ">" },
          runs: [{ text: "x".repeat(35) }],
        },
        {
          mark: { unicode: "=", ascii: "=" },
          runs: [{ text: "A consequence that wraps onto a hanging line" }],
        },
      ],
    },
    {
      kind: "hints",
      items: [{
        key: "enter",
        label: "Open",
        description: "Open the selected thing",
      }],
    },
    { kind: "pending", label: "Loading the rest…" },
    {
      kind: "section",
      title: "Section",
      count: 2,
      caption: "with a caption",
      blocks: [{ kind: "text", runs: [{ text: "Nested text" }] }],
    },
  ];
  for (const unicode of [true, false]) {
    for (let width = 8; width <= 80; width += 1) {
      const context = paintContext(
        { colorDepth: "truecolor", unicode, columns: width },
        {},
        { phase: 0 },
      );
      for (const wide of [true, false]) {
        for (
          const line of renderDetailBlocks(context, blocks, {
            width,
            wide,
            surface: "surface",
          })
        ) {
          assert(
            measureText(line) <= width,
            `${JSON.stringify(stripAnsi(line))} is wider than ${width}`,
          );
        }
      }
    }
  }
});

Deno.test("a list viewport of any height keeps the selection in view", () => {
  const view = applicationDemoView();
  const list = view.body.kind === "master-detail" ? view.body.list : undefined;
  if (list === undefined) throw new Error("expected a list");
  const rows = flattenList(list, {
    folds: new Set(),
    densityFolds: new Set(),
    separators: true,
  });
  const context = paintContext(
    { colorDepth: "none", unicode: true, columns: 60 },
    {},
    { phase: 0 },
  );
  const layout = layoutListColumns(list, 60, listGaps(list, true));
  for (let height = 1; height <= rows.rows.length + 1; height += 1) {
    for (const [selected, row] of rows.rows.entries()) {
      if (row.kind !== "item") continue;
      for (const scroll of [0, rows.rows.length]) {
        const rendered = renderListViewport(context, {
          rows,
          list,
          layout,
          width: 60,
          height,
          selected,
          scroll,
          filtering: false,
        });
        assert(
          rendered.line !== undefined && rendered.line < height,
          `row ${selected} hides in a ${height}-row viewport`,
        );
        assertEquals(rendered.lines.length, height);
      }
    }
  }
});
