import { assert, assertEquals } from "@std/assert";
import { createCliBlock, renderMarkdownCli } from "../../src/cli/mod.ts";
import type {
  ApplicationDetailBlock,
  ApplicationSheet,
  TerminalApplicationView,
} from "../../src/cli/interactive/mod.ts";
import { renderDetailBlocks } from "../../src/cli/interactive/application/detail-render.ts";
import {
  ink,
  paintContext,
} from "../../src/cli/interactive/application/paint.ts";
import { parseStyledSource } from "../../src/cli/styled-sequences.ts";
import { FakeTerminalIO } from "../../src/cli/interactive/testing.ts";
import type { TerminalSurfaceRole } from "../../src/cli/theme.ts";
import { ApplicationDriver } from "../fixtures/application-driver.ts";
import { testView } from "../fixtures/application-views.ts";

const glyph = { unicode: "●", ascii: "*", tone: "success" } as const;

/** One sample of every detail block kind; a new kind must add its own. */
const EVERY_KIND: {
  readonly [K in ApplicationDetailBlock["kind"]]: ApplicationDetailBlock;
} = {
  heading: {
    kind: "heading",
    title: "Heading",
    aside: [{ text: "aside" }],
  },
  state: { kind: "state", glyph, label: "Ready", tone: "success" },
  text: { kind: "text", runs: [{ text: "Bold words", role: "title" }] },
  facts: {
    kind: "facts",
    rows: [{ label: "Label", value: [[{ text: "Value", tone: "warning" }]] }],
  },
  meter: { kind: "meter", value: 0.5, caption: "half" },
  marks: {
    kind: "marks",
    items: [{
      mark: glyph,
      runs: [{ text: "Mark" }],
      lines: [[{ text: "path/to/file", role: "code" }]],
    }],
  },
  rows: {
    kind: "rows",
    lead: { id: "id", width: 5 },
    columns: [{ id: "age", width: 3, align: "end" }],
    items: [{
      lead: [{ text: "a1b2", tone: "accent" }],
      text: [{ text: "Title", role: "title" }],
      cells: { age: [{ text: "2h", tone: "warning" }] },
    }],
  },
  hints: {
    kind: "hints",
    items: [{ key: "enter", label: "Open", primary: true }],
  },
  block: {
    kind: "block",
    content: createCliBlock(renderMarkdownCli, {
      source: "Some **strong** text with `code`.",
    }),
  },
  pending: { kind: "pending", label: "Loading" },
  section: {
    kind: "section",
    title: "Section",
    count: 2,
    blocks: [{ kind: "text", runs: [{ text: "Inner", role: "key" }] }],
  },
  markdown: {
    kind: "markdown",
    source: "# Title\n\nSome **strong** text with `code`.\n\n## Part\n\nMore.",
  },
};

const BLOCKS: readonly ApplicationDetailBlock[] = Object.values(EVERY_KIND);

/** The foreground and weight of every non-blank run of a styled line. */
function runs(line: string): readonly { bold: boolean; colour: string }[] {
  return parseStyledSource(line).flatMap((segment) => {
    if (segment.text.trim() === "") return [];
    let bold = false;
    let colour = "";
    const codes = segment.codes;
    for (let index = 0; index < codes.length; index += 1) {
      const code = codes[index];
      if (code === 38 || code === 48) {
        const length = codes[index + 1] === 2 ? 5 : 3;
        if (code === 38) colour = codes.slice(index, index + length).join(";");
        index += length - 1;
      } else if (code === 1) bold = true;
    }
    return [{ bold, colour }];
  });
}

const CAPABILITIES = new FakeTerminalIO([], {
  columns: 80,
  rows: 24,
  colorDepth: "truecolor",
}).capabilities();

/** Faint ink on each surface a receded region can sit on. */
function faintColours(): ReadonlySet<string> {
  const context = { ...paintContext(CAPABILITIES, {}, { phase: 0 }) };
  const surfaces: readonly (TerminalSurfaceRole | undefined)[] = [
    undefined,
    "surface",
    "selectionMuted",
    "raised",
  ];
  return new Set(
    surfaces.flatMap((surface) =>
      runs(ink(context, "x", { tone: "faint" }, surface)).map((run) =>
        run.colour
      )
    ),
  );
}

function assertReceded(lines: readonly string[], where: string): void {
  const faint = faintColours();
  for (const line of lines) {
    for (const run of runs(line)) {
      assert(!run.bold, `${where}: bold survived under a layer in ${line}`);
      assert(
        faint.has(run.colour),
        `${where}: ${run.colour} is not faint in ${JSON.stringify(line)}`,
      );
    }
  }
}

Deno.test("every detail block kind recedes under a layer", () => {
  const context = {
    ...paintContext(CAPABILITIES, {}, { phase: 0 }),
    recede: true,
  };
  for (const block of BLOCKS) {
    for (const surface of [undefined, "surface"] as const) {
      assertReceded(
        renderDetailBlocks(context, [block], {
          width: 60,
          wide: true,
          surface,
        }),
        block.kind,
      );
    }
  }
});

const SHEET: ApplicationSheet<string> = {
  kind: "sheet",
  id: "ask",
  scope: "global",
  anchor: "bottom",
  title: "Apply?",
  state: "ready",
  body: [{ kind: "text", runs: [{ text: "One line." }] }],
  buttons: [{ id: "keep", label: "Keep", role: "safe" }],
};

/** The rows between the header and the layer, which are the receded base. */
function baseRows(driver: ApplicationDriver): readonly string[] {
  const layerRows = new Set(
    driver.hits.flatMap((hit) => hit.target.kind === "layer" ? [hit.row] : []),
  );
  const rows = driver.last.frame.split("\n");
  return rows.filter((_, index) =>
    index > 0 && index < rows.length - 1 && !layerRows.has(index)
  );
}

Deno.test("the base beneath a layer recedes in every body", async (t) => {
  const detail = testView(["a", "b"]);
  if (detail.body.kind !== "master-detail") throw new Error("expected detail");
  const views: Record<string, TerminalApplicationView<string>> = {
    "master-detail": {
      ...detail,
      body: {
        ...detail.body,
        detail: { ...detail.body.detail, content: { a: BLOCKS } },
      },
    },
    list: testView(["a", "b"], { body: "list" }),
    empty: {
      ...detail,
      body: {
        kind: "empty",
        title: "Nothing yet",
        body: [{ text: "Start with a new item.", role: "title" }],
        primary: { key: "enter", label: "New item", action: "new" },
        secondary: [{ key: "ctrl-k", label: "Commands" }],
        list: detail.body.list,
      },
    },
    reading: {
      ...detail,
      footer: { left: [{ key: ["up", "down"], label: "Scroll" }] },
      body: {
        kind: "reading",
        id: "guide",
        content: createCliBlock(renderMarkdownCli, {
          source: "# Guide\n\nSome **strong** words and `code`.",
        }),
      },
    },
  };
  for (const [name, view] of Object.entries(views)) {
    await t.step(name, () => {
      const driver = new ApplicationDriver(
        { ...view, layers: [SHEET] },
        { columns: 100, rows: 40, colorDepth: "truecolor" },
      );
      assertReceded(baseRows(driver), name);
      for (const row of baseRows(driver)) {
        assert(
          !/PgUp|PgDn/u.test(row),
          `${name}: a receded marker names a key the layer owns now`,
        );
      }
    });
  }
});

Deno.test("a receded backdrop draws no overflow markers and gives their rows to content", () => {
  const driver = new ApplicationDriver(
    {
      ...testView(["a", "b"]),
      layers: [SHEET],
    },
    { columns: 80, rows: 12, colorDepth: "none" },
  );
  const view = testView(["a", "b"]);
  if (view.body.kind !== "master-detail") throw new Error("expected detail");
  driver.update({
    ...view,
    body: {
      ...view.body,
      detail: {
        ...view.body.detail,
        content: {
          a: Array.from({ length: 30 }, (_, index) => ({
            kind: "text" as const,
            runs: [{ text: `line ${index}` }],
          })),
        },
      },
    },
    layers: [SHEET],
  });
  const rows = baseRows(driver);
  // The backdrop cannot scroll while the layer is open, so nothing names
  // what it hides; the rows a marker would take show lines instead.
  for (const row of rows) assert(!/more|PgUp|PgDn/u.test(row), row);
  const lines = rows.filter((row) => /line \d+/u.test(row));
  assert(lines.length > 0, rows.join("\n"));
  // The detail's last row above the layer holds a line, not a marker.
  assert(/line \d+/u.test(rows.at(-1) ?? ""), rows.join("\n"));
});

Deno.test("a receded list fills its rows, cuts a group partway, and keeps its gaps", () => {
  const items = Array.from({ length: 12 }, (_, index) => ({
    id: `i${index}`,
    group: index < 4 ? "first" : index < 8 ? "second" : "third",
  }));
  const view: TerminalApplicationView<string> = {
    ...testView(items, {
      body: "list",
      groups: [
        { id: "first", title: "First" },
        { id: "second", title: "Second" },
        { id: "third", title: "Third" },
      ],
    }),
    layers: [SHEET],
  };
  for (const rows of [12, 16, 20]) {
    const driver = new ApplicationDriver(view, {
      columns: 80,
      rows,
      colorDepth: "none",
    });
    const base = baseRows(driver);
    const text = base.join("\n");
    assert(!/more/u.test(text), `${rows}: a receded marker\n${text}`);
    // The last row above the layer shows a row of the list.
    assert((base.at(-1) ?? "").trim() !== "", `${rows}\n${text}`);
    // Groups keep the blank row between them.
    const second = base.findIndex((row) => row.includes("Second"));
    if (second > 0) {
      assertEquals((base[second - 1] ?? "x").trim(), "", `${rows}\n${text}`);
    }
  }
});
