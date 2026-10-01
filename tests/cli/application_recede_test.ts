import { assert } from "@std/assert";
import { createCliBlock, renderMarkdownCli } from "../../src/cli/mod.ts";
import type {
  ApplicationSheet,
  DetailBlock,
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
const EVERY_KIND: { readonly [K in DetailBlock["kind"]]: DetailBlock } = {
  heading: { kind: "heading", title: "Heading", aside: "aside" },
  state: { kind: "state", glyph, label: "Ready", tone: "success" },
  text: { kind: "text", runs: [{ text: "Bold words", role: "title" }] },
  facts: {
    kind: "facts",
    rows: [{ label: "Label", value: [[{ text: "Value", tone: "warning" }]] }],
  },
  meter: { kind: "meter", value: 0.5, caption: "half" },
  marks: { kind: "marks", items: [{ mark: glyph, runs: [{ text: "Mark" }] }] },
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
};

const BLOCKS: readonly DetailBlock[] = Object.values(EVERY_KIND);

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
    });
  }
});
