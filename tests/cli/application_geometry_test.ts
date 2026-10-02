import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { measureText, stripAnsi } from "../../src/cli/mod.ts";
import {
  createTerminalApplicationModel,
  renderTerminalApplication,
  TERMINAL_APPLICATION_MINIMUM,
  type TerminalApplicationLayout,
  type TerminalApplicationView,
} from "../../src/cli/interactive/mod.ts";
import { FakeTerminalIO } from "../../src/cli/interactive/testing.ts";
import {
  layoutListColumns,
  listGaps,
  neededListWidth,
  renderListRow,
  renderListViewport,
} from "../../src/cli/interactive/application/list-render.ts";
import { flattenList } from "../../src/cli/interactive/application/list-model.ts";
import { modelState } from "../../src/cli/interactive/application/model.ts";
import {
  layoutDetailBlocks,
  renderDetailBlocks,
  renderStrip,
} from "../../src/cli/interactive/application/detail-render.ts";
import { paintContext } from "../../src/cli/interactive/application/paint.ts";
import { ApplicationDriver } from "../fixtures/application-driver.ts";
import type {
  ApplicationDetailBlock,
  ApplicationList,
} from "../../src/cli/interactive/mod.ts";
import {
  APPLICATION_REVIEW_SIZES,
  applicationDemoView,
  DEMO_JOBS,
  DEMO_KEYMAP,
  DEMO_TIP,
} from "../../scripts/playground/application.ts";

/** What the demonstration shows at one review size. */
interface GeometryExpectation {
  readonly layout: TerminalApplicationLayout;
  /** Whether the overlap flag column survives the column priority rule. */
  readonly flag: boolean;
  /** Whether the age column survives. */
  readonly age: boolean;
}

/** The expectation for every review size, keyed `<columns>x<rows>`. */
const EXPECTED: Readonly<Record<string, GeometryExpectation>> = {
  "120x30": { layout: "split", flag: true, age: true },
  "80x24": { layout: "split", flag: false, age: true },
  "60x20": { layout: "strip", flag: true, age: true },
  "40x20": { layout: "strip", flag: false, age: true },
  "80x13": { layout: "split", flag: false, age: true },
  "32x10": { layout: "strip", flag: false, age: false },
};

const sizeKey = (size: { columns: number; rows: number }): string =>
  `${size.columns}x${size.rows}`;

/** The pinned matrix: every review size with what it must show. */
const MATRIX = APPLICATION_REVIEW_SIZES.map((size) => {
  const expected = EXPECTED[sizeKey(size)];
  if (expected === undefined) {
    throw new Error(`review size ${sizeKey(size)} has no expectation`);
  }
  return { ...size, ...expected };
});

Deno.test("the pinned matrix expects exactly the review sizes, minimum included", () => {
  assertEquals(
    Object.keys(EXPECTED),
    APPLICATION_REVIEW_SIZES.map(sizeKey),
  );
  assert(
    APPLICATION_REVIEW_SIZES.some((size) =>
      sizeKey(size) === sizeKey(TERMINAL_APPLICATION_MINIMUM)
    ),
    "the review sizes include the minimum",
  );
});

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
        createTerminalApplicationModel(
          applicationDemoView(undefined, DEMO_TIP),
          {
            keymap: DEMO_KEYMAP,
          },
        )
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
      const width = modelState(frame.model).lists.jobs?.density?.width ??
        geometry.columns;
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
    for (const unicode of [true, false]) {
      const io = new FakeTerminalIO([], {
        columns: geometry.columns,
        rows: geometry.rows,
        colorDepth: "none",
        unicode,
      });
      const frame = renderTerminalApplication(
        createTerminalApplicationModel(applicationDemoView(), {
          keymap: DEMO_KEYMAP,
        }).model,
        io.size(),
        io.capabilities(),
      );
      const width = modelState(frame.model).lists.jobs?.density?.width ??
        geometry.columns;
      const ends = new Set(
        listRows(stripAnsi(frame.frame), width).map((row) =>
          row.trimEnd().length
        ),
      );
      assertEquals(
        ends.size,
        1,
        `${geometry.columns}x${geometry.rows} unicode ${unicode}: ${[...ends]}`,
      );
    }
  }
});

Deno.test("a master-detail list is sized to its content and never squeezes the detail", () => {
  for (const [columns, expected] of [[120, 52], [100, 52], [80, 41]] as const) {
    const io = new FakeTerminalIO([], { columns, rows: 24 });
    const frame = renderTerminalApplication(
      createTerminalApplicationModel(applicationDemoView(), {
        keymap: DEMO_KEYMAP,
      }).model,
      io.size(),
      io.capabilities(),
    );
    assertEquals(
      modelState(frame.model).lists.jobs?.density?.width,
      expected,
      `${columns}`,
    );
  }
});

/** A list of titles with priority columns, for content-sizing checks. */
function sizedList(
  titles: readonly string[],
  widths: readonly number[],
  minTitle?: number,
): ApplicationList<string> {
  return {
    id: "sized",
    groups: [{
      id: "all",
      title: "All",
      items: titles.map((title, index) => ({
        id: `item-${index}`,
        title,
        marker: { unicode: "●", ascii: "*" },
        cells: Object.fromEntries(
          widths.map((width, column) => [`c${column}`, [{
            text: "x".repeat(width),
          }]]),
        ),
      })),
    }],
    columns: widths.map((width, column) => ({
      id: `c${column}`,
      width,
      priority: column,
    })),
    ...(minTitle === undefined ? {} : { minTitle }),
  };
}

Deno.test("a content-sized list never drops a column at the width it was sized to", () => {
  const titleSets = [
    ["a"],
    ["ab", "abc"],
    ["fifteen chars!!"],
    ["exactly sixteen!"],
    ["a title of twenty-two"],
    ["a title much longer than the thirty-two cell cap"],
  ];
  const columnSets = [[], [3], [10, 4], [12, 8, 6], [20, 9, 9, 4]];
  for (const titles of titleSets) {
    for (const widths of columnSets) {
      for (const minTitle of [undefined, 1, 8, 16, 24, 40]) {
        const list = sizedList(titles, widths, minTitle);
        for (const roomy of [true, false]) {
          const gaps = listGaps(list, roomy);
          for (const maxTitle of [8, 16, 32]) {
            const needed = neededListWidth(list, gaps, maxTitle);
            const layout = layoutListColumns(list, needed, gaps);
            const at = JSON.stringify({ titles, widths, minTitle, maxTitle });
            assertEquals(layout.columns.length, widths.length, at);
            const longest = Math.max(...titles.map(measureText));
            assert(layout.title >= Math.min(longest, maxTitle), at);
          }
        }
      }
    }
  }
  // Short titles beside wide columns: the split keeps every column it sized.
  const list = sizedList(["Build", "Test", "Ship"], [12, 10, 9]);
  const view: TerminalApplicationView<string> = {
    header: { leading: [{ text: "Sized" }] },
    body: {
      kind: "master-detail",
      list,
      detail: { follows: "sized", content: {} },
    },
    footer: { left: [], right: [] },
  };
  for (const columns of [120, 140]) {
    const io = new FakeTerminalIO([], { columns, rows: 24 });
    const frame = renderTerminalApplication(
      createTerminalApplicationModel(view).model,
      io.size(),
      io.capabilities(),
    );
    const row = stripAnsi(frame.frame).split("\n").find((line) =>
      line.includes("Build")
    ) ?? "";
    for (const width of [12, 10, 9]) {
      assertStringIncludes(row, "x".repeat(width), `${columns}: ${row}`);
    }
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
        createTerminalApplicationModel(
          applicationDemoView(undefined, DEMO_TIP),
          {
            keymap: DEMO_KEYMAP,
          },
        )
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
      createTerminalApplicationModel(applicationDemoView(), {
        keymap: DEMO_KEYMAP,
      }).model,
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
        createTerminalApplicationModel(applicationDemoView(), {
          keymap: DEMO_KEYMAP,
        }).model,
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

Deno.test("the header drops chips, then shortens its identity, then drops counts, and keeps liveness last", () => {
  const view = applicationDemoView();
  const header = (
    columns: number,
    bar: Partial<TerminalApplicationView<string>["header"]> = {
      chips: [{ runs: [{ text: "! 2 stale" }] }, {
        runs: [{ text: "Update ready" }],
      }],
    },
  ) => {
    const io = new FakeTerminalIO([], {
      columns,
      rows: 20,
      colorDepth: "none",
    });
    const shown = { ...view, header: { ...view.header, ...bar } };
    return stripAnsi(
      renderTerminalApplication(
        createTerminalApplicationModel(shown, { keymap: DEMO_KEYMAP }).model,
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
  // Once the chips are gone the identity closes its own gaps before the
  // counts or liveness give way.
  assert(
    /Studio · jobs {4,}1 to review {3}Live/u.test(header(40)),
    header(40),
  );
  for (let columns = 36; columns <= 120; columns += 1) {
    assert(
      !/jobs {1,3}\S/u.test(header(columns)),
      `${columns}: the identity runs into the right side`,
    );
  }
  // At the minimum the identity shortens to its floor and everything else
  // stays.
  assert(/Studio… {2,}1 to review {3}Live/u.test(header(32)), header(32));
  // Counts go before liveness: a state the person must see stays longest.
  const offline = {
    leading: [
      { text: "a-project-with-a-long-name", role: "title" as const },
      { text: "  ·  ", tone: "faint" as const },
      { text: "main", tone: "muted" as const },
    ],
    trailing: [{ text: "3 need you" }],
    liveness: {
      state: "stale" as const,
      labels: {
        idle: "Live",
        busy: "Refreshing",
        retrying: "Retrying",
        stale: "Offline",
      },
    },
  };
  for (let columns = 32; columns <= 120; columns += 1) {
    const line = header(columns, offline);
    assertStringIncludes(line, "! Offline", `${columns}: liveness went`);
    const identity = line.trim().split(/ {2,}/u)[0] ?? "";
    assert(
      line.includes("3 need you") || measureText(identity) >= 8,
      `${columns}: the counts went before the identity reached its floor\n${line}`,
    );
    assert(
      !/ …|·…/u.test(line),
      `${columns}: a cut before a separator\n${line}`,
    );
  }
  assertEquals(header(32, offline).includes("need you"), false);
  assertStringIncludes(header(40, offline), "3 need you");
  // A title beside its path yields the path first and stays whole.
  const titled = {
    leading: [
      { text: "Library", tone: "muted" as const },
      { text: "  ›  ", tone: "faint" as const },
      { text: "A document with a long title", role: "title" as const },
    ],
    trailing: [{ text: "guides/a-document-with-a-long-title.md" }],
    yields: "trailing" as const,
  };
  for (let columns = 32; columns <= 120; columns += 1) {
    const line = header(columns, titled);
    if (line.includes("guides/")) {
      assertStringIncludes(line, "Library  ›  A document with a long title");
    }
  }
  assertStringIncludes(
    header(60, titled),
    "Library  ›  A document with a long title",
  );
  assertEquals(header(60, titled).includes("guides/"), false);
});

Deno.test("every detail block line fits the width it was given", () => {
  // Every block kind, with text long enough to wrap and short enough to take
  // the one-line path, so a prefix that a fast path forgets fails here.
  const blocks: readonly ApplicationDetailBlock[] = [
    {
      kind: "heading",
      title: "A heading title",
      aside: [{ text: "an-aside" }],
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
      kind: "marks",
      compact: true,
      items: [{
        mark: { unicode: "✕", ascii: "x" },
        runs: [{ text: "A compact evidence line that wraps" }],
        lines: [[{ text: "with a location line beneath its text" }]],
      }],
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

Deno.test("a compact marks block sets its text one space after the mark and its lines at the text", () => {
  const context = paintContext(
    { colorDepth: "none", unicode: true, columns: 40 },
    {},
    { phase: 0 },
  );
  const block = (compact: boolean): ApplicationDetailBlock => ({
    kind: "marks",
    ...(compact ? { compact } : {}),
    items: [{
      mark: { unicode: "✕", ascii: "x" },
      runs: [{ text: "Failing test name that wraps here" }],
      lines: [[{ text: "tests/feature_test.ts:42" }]],
    }],
  });
  const layout = { width: 28, wide: false, surface: undefined };
  const compact = renderDetailBlocks(context, [block(true)], layout).map(
    stripAnsi,
  );
  assertEquals(compact, [
    "✕ Failing test name that",
    "  wraps here",
    "  tests/feature_test.ts:42",
  ]);
  const roomy = renderDetailBlocks(context, [block(false)], layout).map(
    stripAnsi,
  );
  assertEquals(roomy, [
    "✕  Failing test name that",
    "   wraps here",
    "     tests/",
    "     feature_test.ts:42",
  ]);
  // Each item is one unit a viewport keeps whole.
  const { continued } = layoutDetailBlocks(context, [block(true)], layout);
  assertEquals([...continued], [1, 2]);
});

Deno.test("a block that renders nothing leaves no trace, and a section never heads nothing", () => {
  const hints: ApplicationDetailBlock = {
    kind: "hints",
    items: [{ key: "enter", label: "Open", description: "Open it" }],
  };
  // Below the wide tier every one of these renders no lines.
  const silent: readonly ApplicationDetailBlock[] = [
    hints,
    {
      kind: "section",
      title: "Next",
      count: 1,
      caption: "keys",
      blocks: [hints],
    },
    { kind: "section", title: "Next", blocks: [hints, hints] },
    { kind: "section", title: "Empty", blocks: [] },
  ];
  const base: readonly ApplicationDetailBlock[] = [
    { kind: "heading", title: "Title", aside: [{ text: "aside" }] },
    {
      kind: "state",
      glyph: { unicode: "●", ascii: "*" },
      label: "Ready",
      tone: "success",
    },
    { kind: "text", runs: [{ text: "A sentence beneath the state." }] },
    {
      kind: "section",
      title: "Shown",
      blocks: [hints, { kind: "text", runs: [{ text: "Visible" }] }],
    },
    { kind: "pending", label: "Loading" },
  ];
  for (const width of [24, 40, 60]) {
    const context = paintContext(
      { colorDepth: "truecolor", unicode: true, columns: width },
      {},
      { phase: 0 },
    );
    const narrow = { width, wide: false, surface: "surface" } as const;
    const without = renderDetailBlocks(context, base, narrow);
    for (const block of silent) {
      assertEquals(renderDetailBlocks(context, [block], narrow), []);
      for (let at = 0; at <= base.length; at += 1) {
        assertEquals(
          renderDetailBlocks(context, [
            ...base.slice(0, at),
            block,
            ...base.slice(at),
          ], narrow),
          without,
          `${JSON.stringify(block)} at ${at} left a trace at ${width} columns`,
        );
      }
    }
    // A section with something left to show keeps its title.
    assertStringIncludes(stripAnsi(without.join("\n")), "Shown\nVisible");
  }
  // Wide, the section heads the hints it holds.
  const context = paintContext(
    { colorDepth: "truecolor", unicode: true, columns: 60 },
    {},
    { phase: 0 },
  );
  const wide = renderDetailBlocks(context, [silent[1] ?? hints], {
    width: 60,
    wide: true,
    surface: "surface",
  }).map((line) => stripAnsi(line).trimEnd());
  assertEquals(wide, ["Next  1  keys", "↵  Open   Open it"]);
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

Deno.test("chrome rows keep their two-cell gutters at every width", async (t) => {
  const long = "Photo archive migration from the old storage server";
  const jobs = DEMO_JOBS.map((job) =>
    job.id === "photo-archive" ? { ...job, title: long } : job
  );
  const scenes = [
    { name: "list", keys: ["down", "down"] },
    { name: "zoom", keys: ["down", "down", "space"] },
  ] as const;
  for (const scene of scenes) {
    for (const columns of [32, 34, 40, 60, 80, 120]) {
      await t.step(`${scene.name} at ${columns}`, () => {
        const driver = new ApplicationDriver(
          applicationDemoView(jobs, {
            id: "moved",
            runs: [{ text: `${long} paused until its source returns` }],
            trailing: [{ text: "u Undo" }],
          }),
          { columns, rows: 20, colorDepth: "none" },
        );
        driver.key(...scene.keys);
        const lines = driver.text.split("\n");
        const chrome = [
          lines[0],
          lines.at(-1),
          lines.at(-2),
          ...(driver.last.layout === "zoom" ? [lines[2]] : []),
          ...(driver.last.layout === "strip"
            ? [lines.at(-3), lines.at(-4)]
            : []),
        ];
        for (const line of chrome) {
          if (line === undefined || line.trim() === "") continue;
          assert(
            line.startsWith("  ") && line.endsWith("  "),
            `${scene.name} at ${columns}: text in a gutter\n${line}`,
          );
        }
      });
    }
  }
});

Deno.test("a truncated word never leaves a space before its ellipsis", () => {
  for (const geometry of MATRIX) {
    for (const unicode of [true, false]) {
      const driver = new ApplicationDriver(applicationDemoView(), {
        columns: geometry.columns,
        rows: geometry.rows,
        colorDepth: "none",
        unicode,
      });
      assert(
        !/ (…|\.\.\.)/u.test(driver.text),
        `${geometry.columns}x${geometry.rows}:\n${driver.text}`,
      );
    }
  }
});

Deno.test("without fills a rule parts the list from its detail", () => {
  for (const columns of [80, 120]) {
    for (const unicode of [true, false]) {
      const driver = new ApplicationDriver(applicationDemoView(), {
        columns,
        rows: 24,
        colorDepth: "none",
        unicode,
      });
      const width = modelState(driver.model).lists.jobs?.density?.width ?? 0;
      const rule = unicode ? "│" : "|";
      const body = driver.text.split("\n").slice(2, -1);
      for (const row of body) {
        assertEquals([...row][width], rule, `${columns} ${unicode}: ${row}`);
      }
    }
  }
});

Deno.test("a one-line strip shows a fact that fits and never cuts a word of its title", () => {
  const context = paintContext(
    new FakeTerminalIO([], { columns: 40, colorDepth: "none" }).capabilities(),
    {},
    { phase: 0 },
  );
  const strip = {
    title: [
      { text: "x " },
      { text: "Image resize", role: "title" as const },
      { text: "  " },
      { text: "Failed", tone: "danger" as const },
    ],
    facts: [[{ text: "Failed 2h ago at step 2" }], [{ text: "Hourly" }]],
  };
  const [facts] = renderStrip(context, strip, [], 26, 1, undefined, true);
  assertStringIncludes(stripAnsi(facts ?? ""), "Hourly");
  const [title] = renderStrip(
    context,
    { ...strip, facts: [] },
    [],
    26,
    1,
    undefined,
    true,
  );
  const shown = stripAnsi(title ?? "");
  assertStringIncludes(shown, "Image resize");
  assert(!shown.includes("Fail"), shown);
});

Deno.test("zoom counts exactly the items Up and Down walk, at every height", () => {
  // Folding follows the height; the breadcrumb keeps its count at full width.
  for (const rows of new Set(MATRIX.map((geometry) => geometry.rows))) {
    const geometry = { columns: 120, rows };
    const driver = new ApplicationDriver(applicationDemoView(), {
      columns: geometry.columns,
      rows: geometry.rows,
      colorDepth: "none",
    });
    driver.key("space");
    assertEquals(driver.last.layout, "zoom", `${geometry.columns}`);
    const position = () => {
      const match = /(\d+) of (\d+)/u.exec(driver.text.split("\n")[2] ?? "") ??
        /(\d+) of (\d+)/u.exec(driver.text);
      assert(match !== null, `no position\n${driver.text}`);
      return [Number(match[1]), Number(match[2])] as const;
    };
    const [first, total] = position();
    assertEquals(first, 1, `${geometry.columns}x${geometry.rows}`);
    let steps = 1;
    for (let guard = 0; guard < 50; guard += 1) {
      const before = driver.state.lists.jobs?.selectedId;
      driver.key("down");
      if (driver.state.lists.jobs?.selectedId === before) break;
      steps += 1;
      assertEquals(
        position(),
        [steps, total],
        `${geometry.columns}x${geometry.rows}`,
      );
    }
    assertEquals(
      steps,
      total,
      `${geometry.columns}x${geometry.rows}: Down walked ${steps} of ${total}`,
    );
  }
});

Deno.test("zoom shows the blocks the split shows at its width tier, larger", () => {
  for (
    const [columns, shown] of [[120, true], [100, true], [80, false], [
      60,
      false,
    ]] as const
  ) {
    const driver = new ApplicationDriver(applicationDemoView(), {
      columns,
      rows: 30,
      colorDepth: "none",
    });
    driver.key("space");
    assertEquals(
      driver.text.includes("Lend the terminal to a short child"),
      shown,
      `${columns}: hints ${shown ? "show" : "hide"} in zoom\n${driver.text}`,
    );
  }
});
