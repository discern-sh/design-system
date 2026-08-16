import { assert, assertEquals, assertThrows } from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  renderDiffstatCli,
  renderTableCli,
  type TableCliProps,
} from "../../src/cli/mod.ts";
import { measureText } from "../../src/cli/text.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

Deno.test("Diffstat renders exact narrow, standard, wide, and sign-preserving degraded bars", () => {
  const render = (capabilities: TerminalCapabilities) =>
    renderDiffstatCli(
      { added: 14, removed: 5, maxWidth: capabilities.columns },
      capabilities,
    );
  for (
    const [columns, expected] of [
      [10, "+14 −5 ++−"],
      [20, "+14 −5 ++++−"],
      [40, "+14 −5 ++++−"],
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testTerminalCapabilities({ colorDepth, columns: 20 });
    assertStyledFrame(render(capabilities), "+14 −5 ++++−", capabilities);
  }
  const ascii = testTerminalCapabilities({ columns: 20, unicode: false });
  assertExactFrame(render(ascii), "+14 -5 ++++-", ascii);
});

const TABLE_PROPS = {
  columns: [{ header: "Name" }, { header: "State" }, { header: "Count" }],
  rows: [["Alpha", "Ready", "12"], ["Beta", "Queued", "3"]],
  numeric: true,
  striped: true,
  caption: "Checks",
} as const satisfies TableCliProps;

type RichHeaderWithoutResponsive = {
  readonly columns: readonly [{
    readonly header: readonly [{
      readonly kind: "strong";
      readonly content: "Heading";
    }];
  }];
  readonly rows: readonly [readonly ["Value"]];
};

type RichCellWithoutResponsive = {
  readonly columns: readonly [{ readonly header: "Heading" }];
  readonly rows: readonly [
    readonly [
      readonly [{
        readonly kind: "emphasis";
        readonly content: "Value";
      }],
    ],
  ];
};

const RICH_HEADER_REQUIRES_RESPONSIVE: RichHeaderWithoutResponsive extends
  TableCliProps ? false
  : true = true;
const RICH_CELL_REQUIRES_RESPONSIVE: RichCellWithoutResponsive extends
  TableCliProps ? false
  : true = true;

Deno.test("Table types require the responsive discriminant for rich headers and cells", () => {
  assert(RICH_HEADER_REQUIRES_RESPONSIVE);
  assert(RICH_CELL_REQUIRES_RESPONSIVE);
});

Deno.test("Table renders exact narrow, standard, wide, and box-degraded columns", () => {
  const render = (capabilities: TerminalCapabilities) =>
    renderTableCli(
      { ...TABLE_PROPS, width: capabilities.columns },
      capabilities,
    );
  const narrow =
    "Checks\n┌─────┬────┬────┐\n│ Na… │ S… │ C… │\n├─────┼────┼────┤\n│ Al… │ R… │ 12 │\n│ Be… │ Q… │  3 │\n└─────┴────┴────┘";
  const standard =
    "Checks\n┌────────┬─────────┬─────────┐\n│ Name   │ State   │   Count │\n├────────┼─────────┼─────────┤\n│ Alpha  │ Ready   │      12 │\n│ Beta   │ Queued  │       3 │\n└────────┴─────────┴─────────┘";
  const wide =
    "Checks\n┌─────────────┬──────────────┬─────────────┐\n│ Name        │ State        │       Count │\n├─────────────┼──────────────┼─────────────┤\n│ Alpha       │ Ready        │          12 │\n│ Beta        │ Queued       │           3 │\n└─────────────┴──────────────┴─────────────┘";
  for (
    const [columns, expected] of [[17, narrow], [30, standard], [
      44,
      wide,
    ]] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testTerminalCapabilities({ colorDepth, columns: 30 });
    assertStyledFrame(render(capabilities), standard, capabilities);
  }
  const ascii = testTerminalCapabilities({ columns: 30, unicode: false });
  assertExactFrame(
    render(ascii),
    "Checks\n+--------+---------+---------+\n| Name   | State   |   Count |\n+--------+---------+---------+\n| Alpha  | Ready   |      12 |\n| Beta   | Queued  |       3 |\n+--------+---------+---------+",
    ascii,
  );
});

const RICH_TABLE_PROPS = {
  layout: "responsive",
  caption: "Rich evidence",
  columns: [{
    header: ["Item ", { kind: "emphasis", content: "type" }],
  }, {
    header: "Reference",
    align: "center",
  }, {
    header: "Qty",
    align: "end",
  }],
  rows: [[
    ["日本 ", { kind: "strong", content: "ready" }, " 😀"],
    [{
      kind: "link",
      label: ["docs ", { kind: "emphasis", content: "now" }],
      destination: "https://example.test/docs",
    }],
    "12",
  ], [
    ["Line one", { kind: "hard-break" }, "Line two"],
    "",
    "3",
  ]],
  striped: true,
  width: 44,
} as const satisfies TableCliProps;

Deno.test("Table responsive grids preserve rich wrapped cells, empties, hard breaks, and alignment exactly", () => {
  const capabilities = testTerminalCapabilities({ columns: 44 });
  const noColour =
    "Rich evidence\n┌─────────────────┬─────────────────┬──────┐\n│ Item _type_     │    Reference    │  Qty │\n├─────────────────┼─────────────────┼──────┤\n│ 日本 **ready**  │   docs _now_    │   12 │\n│ 😀              │ (https://exampl │      │\n│                 │  e.test/docs)   │      │\n├─────────────────┼─────────────────┼──────┤\n│ Line one        │                 │    3 │\n│ Line two        │                 │      │\n└─────────────────┴─────────────────┴──────┘";
  assertExactFrame(
    renderTableCli(RICH_TABLE_PROPS, capabilities),
    noColour,
    capabilities,
  );

  const styledPlaintext =
    "Rich evidence\n┌─────────────────┬──────────────┬─────────┐\n│ Item type       │  Reference   │     Qty │\n├─────────────────┼──────────────┼─────────┤\n│ 日本 ready 😀   │   docs now   │      12 │\n├─────────────────┼──────────────┼─────────┤\n│ Line one        │              │       3 │\n│ Line two        │              │         │\n└─────────────────┴──────────────┴─────────┘";
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const styledCapabilities = testTerminalCapabilities({
      colorDepth,
      columns: 44,
    });
    const output = renderTableCli(RICH_TABLE_PROPS, styledCapabilities);
    assertStyledFrame(output, styledPlaintext, styledCapabilities);
    assert(output.includes("https://example.test/docs"));
    assertEquals(output, renderTableCli(RICH_TABLE_PROPS, styledCapabilities));
  }

  const ascii = testTerminalCapabilities({ columns: 44, unicode: false });
  assertExactFrame(
    renderTableCli(RICH_TABLE_PROPS, ascii),
    "Rich evidence\n+-----------------+-----------------+------+\n| Item _type_     |    Reference    |  Qty |\n+-----------------+-----------------+------+\n| 日本 **ready**  |   docs _now_    |   12 |\n| 😀              | (https://exampl |      |\n|                 |  e.test/docs)   |      |\n+-----------------+-----------------+------+\n| Line one        |                 |    3 |\n| Line two        |                 |      |\n+-----------------+-----------------+------+",
    ascii,
  );
});

Deno.test("Table responsive narrow layout keeps every labelled relationship without truncation", () => {
  const props = {
    layout: "responsive",
    caption: "Checks that wrap losslessly",
    columns: [
      { header: "Name" },
      { header: "State", align: "center" },
      { header: "Count", align: "end" },
    ],
    rows: [["Alpha 日本語 😀", "Ready now", "12"], ["Beta", "", ""]],
    striped: true,
    width: 20,
  } as const;
  const unicode = testTerminalCapabilities({ columns: 20 });
  const expected =
    "Checks that wrap\nlosslessly\nName:\n  Alpha 日本語 😀\n       State:\n      Ready now\n              Count:\n                  12\n\nName:\n  Beta\n       State:\n          ∅\n              Count:\n                   ∅";
  assertExactFrame(renderTableCli(props, unicode), expected, unicode);
  assertEquals(renderTableCli(props, unicode), renderTableCli(props, unicode));

  const ascii = testTerminalCapabilities({ columns: 20, unicode: false });
  assertExactFrame(
    renderTableCli(props, ascii),
    "Checks that wrap\nlosslessly\nName:\n  Alpha 日本語 😀\n       State:\n      Ready now\n              Count:\n                  12\n\nName:\n  Beta\n       State:\n       (empty)\n              Count:\n             (empty)",
    ascii,
  );
});

Deno.test("Table responsive mode defines empty, header-only, normalized, and many-column tables", () => {
  const capabilities = testTerminalCapabilities({ columns: 22 });
  assertEquals(
    renderTableCli(
      { layout: "responsive", columns: [], rows: [], width: 22 },
      capabilities,
    ),
    "",
  );
  assertExactFrame(
    renderTableCli(
      {
        layout: "responsive",
        caption: "No data",
        columns: [],
        rows: [],
        width: 22,
      },
      capabilities,
    ),
    "No data",
    capabilities,
  );
  assertExactFrame(
    renderTableCli(
      {
        layout: "responsive",
        columns: [{ header: "A" }, { header: "B", align: "end" }],
        rows: [],
        width: 20,
      },
      capabilities,
    ),
    "┌─────────┬────────┐\n│ A       │      B │\n└─────────┴────────┘",
    capabilities,
  );
  assertExactFrame(
    renderTableCli(
      {
        layout: "responsive",
        columns: [{ header: "A" }, { header: "B" }, { header: "C" }],
        rows: [["one"]],
        width: 22,
      },
      capabilities,
    ),
    "┌──────┬──────┬──────┐\n│ A    │ B    │ C    │\n├──────┼──────┼──────┤\n│ one  │      │      │\n└──────┴──────┴──────┘",
    capabilities,
  );

  const manyColumns = Array.from(
    { length: 8 },
    (_, index) => ({ header: `H${index + 1}` }),
  );
  const manyValues = Array.from({ length: 8 }, (_, index) => `V${index + 1}`);
  const narrow = testTerminalCapabilities({ columns: 12 });
  assertExactFrame(
    renderTableCli(
      {
        layout: "responsive",
        columns: manyColumns,
        rows: [manyValues],
        width: 12,
      },
      narrow,
    ),
    "H1:\n  V1\nH2:\n  V2\nH3:\n  V3\nH4:\n  V4\nH5:\n  V5\nH6:\n  V6\nH7:\n  V7\nH8:\n  V8",
    narrow,
  );
});

Deno.test("Table responsive mode rejects malformed semantics while legacy validation stays strict", () => {
  const capabilities = testTerminalCapabilities({ columns: 30 });
  assertThrows(
    () =>
      renderTableCli(
        { columns: [{ header: "A" }], rows: [[""]], width: 30 },
        capabilities,
      ),
    TypeError,
    "non-empty and control-free",
  );
  assertThrows(
    () =>
      renderTableCli(
        {
          layout: "responsive",
          columns: [{ header: "A" }],
          rows: [["safe", "unlabelled"]],
          width: 30,
        },
        capabilities,
      ),
    TypeError,
    "2 cells for 1 columns",
  );
  for (const hostile of ["raw\u001b[31m", "format\u200bmark"] as const) {
    assertThrows(
      () =>
        renderTableCli(
          {
            layout: "responsive",
            columns: [{ header: "A" }],
            rows: [[hostile]],
            width: 30,
          },
          capabilities,
        ),
      TypeError,
      "control and format",
    );
  }
  assertThrows(
    () =>
      renderTableCli(
        {
          columns: [{ header: [{ kind: "strong", content: "A" }] }],
          rows: [["value"]],
          width: 30,
        } as unknown as TableCliProps,
        capabilities,
      ),
    TypeError,
    "requires layout",
  );
});

Deno.test("Table responsive frames remain width-bounded across capability postures", () => {
  for (const columns of [4, 12, 22, 44]) {
    for (
      const colorDepth of [
        "none",
        "ansi16",
        "ansi256",
        "truecolor",
      ] as const
    ) {
      for (const unicode of [true, false]) {
        const capabilities = testTerminalCapabilities({
          colorDepth,
          columns,
          unicode,
        });
        const output = renderTableCli(
          { ...RICH_TABLE_PROPS, width: columns },
          capabilities,
        );
        assertEquals(
          output,
          renderTableCli(
            { ...RICH_TABLE_PROPS, width: columns },
            capabilities,
          ),
        );
        for (const line of stripAnsi(output).split("\n")) {
          assert(
            measureText(line) <= columns,
            `${JSON.stringify(line)} exceeded ${columns} columns`,
          );
        }
      }
    }
  }
});
