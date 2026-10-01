/**
 * What a frame shows starts at a beginning and never ends on a title: the
 * detail beneath a layer in its column starts at a block's first line, and
 * a section title in a scrolled panel keeps with its first row.
 */
import { assert } from "@std/assert";
import type {
  ApplicationDetailBlock,
  ApplicationLayer,
  ApplicationPalette,
  ApplicationSheet,
  TerminalApplicationView,
} from "../../src/cli/interactive/mod.ts";
import { ApplicationDriver } from "../fixtures/application-driver.ts";
import { testView } from "../fixtures/application-views.ts";

/** Six sections, each a titled run of three recognisable text blocks. */
const SECTIONS: readonly ApplicationDetailBlock[] = Array.from(
  { length: 6 },
  (_, section) => ({
    kind: "section" as const,
    title: `Block ${section + 1}`,
    blocks: [1, 2, 3].map((line) => ({
      kind: "text" as const,
      runs: [{ text: `b${section + 1} part ${line}` }],
    })),
  }),
);

function withLayer(layer: ApplicationLayer<string>): TerminalApplicationView<
  string
> {
  const view = testView(["a"]);
  if (view.body.kind !== "master-detail") throw new Error("master-detail");
  return {
    ...view,
    body: {
      ...view.body,
      detail: { ...view.body.detail, content: { a: SECTIONS } },
    },
    layers: [layer],
  };
}

function sheet(lines: number): ApplicationSheet<string> {
  return {
    kind: "sheet",
    id: "review",
    scope: "item",
    title: "Review",
    state: "ready",
    body: Array.from({ length: lines }, (_, index) => ({
      kind: "text" as const,
      runs: [{ text: `Consequence ${index + 1}` }],
    })),
    buttons: [{ id: "keep", label: "Keep", role: "safe" }],
  };
}

Deno.test("the detail beneath a layer in its column starts at a block's first line", () => {
  for (const rows of [24, 30, 40]) {
    for (let lines = 0; lines <= 16; lines += 1) {
      const driver = new ApplicationDriver(withLayer(sheet(lines)), {
        columns: 120,
        rows,
        colorDepth: "none",
      });
      const panel = driver.hits.filter((hit) => hit.target.kind === "layer");
      const left = Math.min(...panel.map((hit) => hit.start));
      const bottom = Math.max(...panel.map((hit) => hit.row));
      const below = driver.text.split("\n").slice(bottom + 1, -1).map((line) =>
        [...line].slice(left).join("").replace(/^[│|]/u, "").trim()
      ).filter((line) => line !== "");
      const label = `${lines} consequences at 120x${rows}`;
      if (below.length === 0) continue;
      assert(
        /^Block \d/u.test(below[0] ?? ""),
        `${label}: the detail beneath starts mid-block\n${driver.text}`,
      );
      for (const line of below) {
        const part = /^b(\d) part/u.exec(line);
        if (part === null) continue;
        assert(
          below.some((other) => other.startsWith(`Block ${part[1]}`)),
          `${label}: "${line}" shows without its section's title\n${driver.text}`,
        );
      }
    }
  }
});

const PALETTE: ApplicationPalette<string> = {
  kind: "palette",
  id: "palette",
  scope: "global",
  placeholder: "Search",
  sections: ["Go to", "Create", "Session", "Help", "Views"].map((
    title,
    section,
  ) => ({
    title,
    items: Array.from({ length: 3 + (section % 2) }, (_, item) => ({
      id: `${section}-${item}`,
      label: `Choice ${section + 1}.${item + 1}`,
      action: `run:${section}-${item}`,
    })),
  })),
};
const TITLES = new Set(PALETTE.sections.map((section) => section.title));

Deno.test("a scrolled panel never ends on a section title while rows hide below it", () => {
  for (
    const [columns, rows] of [[80, 24], [80, 16], [60, 20], [40, 20]] as const
  ) {
    for (let rowsHigh: number = rows; rowsHigh >= 12; rowsHigh -= 1) {
      const driver = new ApplicationDriver(
        { ...testView(["a"]), layers: [PALETTE] },
        { columns, rows: rowsHigh, colorDepth: "none" },
      );
      for (let step = 0; step < 18; step += 1) {
        const lines = driver.text.split("\n").map((line) =>
          line.replace(/[│|]/gu, "").trim()
        );
        const marker = lines.findIndex((line) => /more · PgDn/u.test(line));
        if (marker > 0) {
          const before = lines.slice(0, marker).filter((line) => line !== "");
          const last = before.at(-1) ?? "";
          assert(
            !TITLES.has(last),
            `${columns}x${rowsHigh} after ${step} moves: "${last}" ends the viewport\n${driver.text}`,
          );
        }
        driver.key("down");
      }
    }
  }
});

Deno.test("a scrolled list never ends on a group's header while rows hide below it", () => {
  const groups = Array.from({ length: 8 }, (_, index) => ({
    id: `g${index}`,
    title: `Group ${index}`,
  }));
  const items = Array.from({ length: 20 }, (_, index) => ({
    id: `i${index}`,
    group: `g${index % 8}`,
  }));
  for (const body of ["list", "master-detail"] as const) {
    for (const columns of [120, 80, 40]) {
      for (let rows = 10; rows <= 30; rows += 1) {
        const driver = new ApplicationDriver(
          testView(items, { groups, body }),
          { columns, rows, colorDepth: "none" },
        );
        const width = body === "list" || columns < 80 ? columns : 36;
        for (let step = 0; step < 24; step += 1) {
          const lines = driver.text.split("\n").map((line) =>
            [...line].slice(0, width).join("").trim()
          );
          const marker = lines.findIndex((line) => /↓ \d+ more/u.test(line));
          if (marker > 0) {
            const last = lines.slice(0, marker).filter((line) => line !== "")
              .at(-1) ?? "";
            assert(
              !/^Group \d/u.test(last),
              `${body} ${columns}x${rows} after ${step} moves: "${last}" ends the list\n${driver.text}`,
            );
          }
          driver.key(step < 20 ? "down" : "up");
        }
      }
    }
  }
});
