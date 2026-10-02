/**
 * How a sheet lays out its foot and scrolled body: the row naming what the
 * body hides follows the body's last whole unit, the footnote stays with
 * the buttons, and buttons stand on one row or one per row.
 */
import { assert, assertEquals } from "@std/assert";
import { TERMINAL_GLYPHS } from "../../src/cli/mod.ts";
import type {
  ApplicationLayer,
  ApplicationSheet,
} from "../../src/cli/interactive/mod.ts";
import {
  APPLICATION_REVIEW_SIZES,
  applicationDemoView,
  DEMO_JOBS,
} from "../../scripts/playground/application.ts";
import {
  demoDeleteSheet,
  demoNewJobForm,
  demoRunSheet,
} from "../../scripts/playground/application-layers.ts";
import { ApplicationDriver } from "../fixtures/application-driver.ts";

function job(id: string) {
  const found = DEMO_JOBS.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no sample job ${id}`);
  return found;
}

function driver(
  layer: ApplicationLayer<string>,
  columns: number,
  rows: number,
  colorDepth: "none" | "truecolor" = "none",
): ApplicationDriver {
  return new ApplicationDriver(
    applicationDemoView(DEMO_JOBS, undefined, { layers: [layer] }),
    { columns, rows, colorDepth },
  );
}

const mark = {
  unicode: TERMINAL_GLYPHS.changes.unicode,
  ascii: TERMINAL_GLYPHS.changes.ascii,
};

/** A sheet of three-line consequences, each ending with `end<N>`. */
function unitSheet(count = 8): ApplicationSheet<string> {
  return {
    kind: "sheet",
    id: "units",
    scope: "global",
    title: "Review the plan",
    state: "ready",
    body: [{
      kind: "marks",
      items: Array.from({ length: count }, (_, index) => ({
        mark,
        runs: [{ text: `Consequence ${index}` }],
        lines: [[{ text: `first ${index}` }], [{ text: `end${index}` }]],
      })),
    }],
    footnote: [{ text: "Nothing changes until you choose Go." }],
    buttons: [
      { id: "keep", label: "Keep", role: "safe" },
      { id: "go", label: "Go", role: "confirm", action: "go" },
    ],
  };
}

/** The row index of the first line containing `text`, or -1. */
function rowOf(lines: readonly string[], text: string): number {
  return lines.findIndex((line) => line.includes(text));
}

Deno.test("a scrolled sheet body ends at a whole unit, the down marker directly beneath it", async (t) => {
  for (const { columns, rows } of APPLICATION_REVIEW_SIZES) {
    // At the minimum size the marker shares the buttons' foot and the body
    // keeps every row it can.
    if (columns < 40) continue;
    await t.step(`${columns}x${rows}`, () => {
      const sheet = driver(unitSheet(), columns, rows);
      for (let step = 0; step < 30; step += 1) {
        const lines = sheet.text.split("\n");
        const marker = lines.findIndex((line) => /↓ \d+ more/u.test(line));
        if (marker < 0) break;
        const above = lines[marker - 1] ?? "";
        assert(
          /end\d|Review the plan|↑ \d+ more/u.test(above),
          `step ${step}: the body ends inside a unit or on a blank row\n${sheet.text}`,
        );
        sheet.key("down");
      }
    });
  }
});

Deno.test("the footnote stays with the buttons while the body scrolls", async (t) => {
  for (const { columns, rows } of APPLICATION_REVIEW_SIZES) {
    if (rows < 20) continue;
    await t.step(`${columns}x${rows}`, () => {
      const sheet = driver(unitSheet(), columns, rows);
      const lines = sheet.text.split("\n");
      const footnote = rowOf(lines, "Nothing changes until");
      const marker = lines.findIndex((line) => /↓ \d+ more/u.test(line));
      const buttons = rowOf(lines, "Go )");
      assert(marker >= 0, `the body should overflow\n${sheet.text}`);
      assert(
        footnote > marker && footnote <= buttons,
        `the footnote left the buttons\n${sheet.text}`,
      );
    });
  }
});

Deno.test("a panel's markers share one alignment where its foot names what is hidden", () => {
  const sheet = driver(unitSheet(), 80, 20);
  sheet.key("down", "down", "down", "down");
  const lines = sheet.text.split("\n");
  const up = lines.find((line) => /↑ \d+ more/u.test(line)) ?? "";
  const down = lines.find((line) => /↓ \d+ more/u.test(line)) ?? "";
  assertEquals(up.indexOf("↑"), down.indexOf("↓"), sheet.text);
});

/** Each screen row holding buttons, with how many it holds. */
function buttonRows(sheet: ApplicationDriver): readonly number[] {
  const counts = new Map<number, number>();
  for (const hit of sheet.hits) {
    if (
      hit.target.kind === "control" &&
      hit.target.control.startsWith("button:")
    ) counts.set(hit.row, (counts.get(hit.row) ?? 0) + 1);
  }
  return [...counts.values()];
}

Deno.test("buttons stand on one row or one per row while the panel has rows", async (t) => {
  const layers = [
    () => demoRunSheet(job("image-resize")),
    () => demoDeleteSheet(job("photo-archive")),
    () => demoNewJobForm(),
  ];
  for (const make of layers) {
    const layer = make();
    for (const [columns, rows] of [[120, 30], [80, 24], [60, 24], [40, 24]]) {
      for (const depth of ["none", "truecolor"] as const) {
        await t.step(`${layer.id} at ${columns}x${rows} ${depth}`, () => {
          const counts = buttonRows(
            driver(layer, columns ?? 80, rows ?? 24, depth),
          );
          assert(
            counts.length === 1 || counts.every((count) => count === 1),
            `buttons split ${JSON.stringify(counts)}`,
          );
        });
      }
    }
  }
  // Without the rows, buttons pack as many to a row as fit.
  const short = buttonRows(
    driver(demoDeleteSheet(job("photo-archive")), 32, 10),
  );
  assert(short.length < 3, JSON.stringify(short));
});
