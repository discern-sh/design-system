/**
 * Where a scrolled viewport ends: while rows hide below it, the detail
 * column, zoom, a reading body, and a reader end after a whole unit —
 * never on a blank row, a title, or part of a unit — with the row naming
 * what is hidden directly beneath, at every review size; and paging moves
 * from where a page ended, so no line is ever skipped.
 */
import { assert } from "@std/assert";
import type {
  ApplicationDetailBlock,
  ApplicationLayer,
  TerminalApplicationView,
} from "../../src/cli/interactive/mod.ts";
import type { ApplicationHitTarget } from "../../src/cli/interactive/application/hits.ts";
import {
  APPLICATION_REVIEW_SIZES,
  applicationDemoView,
  DEMO_JOBS,
} from "../../scripts/playground/application.ts";
import {
  demoKeysReader,
  demoLogReader,
} from "../../scripts/playground/application-layers.ts";
import { ApplicationDriver } from "../fixtures/application-driver.ts";
import { testView } from "../fixtures/application-views.ts";

/**
 * Titled sections of three-line marks, each line naming its place, then a
 * note: a viewport may end only after `end s.i` or a note.
 */
const SECTIONS: readonly ApplicationDetailBlock[] = Array.from(
  { length: 6 },
  (_, section) => ({
    kind: "section" as const,
    title: `Block ${section}`,
    blocks: [
      {
        kind: "marks" as const,
        items: Array.from({ length: 3 }, (_, item) => ({
          mark: { unicode: "•", ascii: "*" },
          runs: [{ text: `Item ${section}.${item}` }],
          lines: [
            [{ text: `first ${section}.${item}` }],
            [{ text: `end ${section}.${item}` }],
          ],
        })),
      },
      { kind: "text" as const, runs: [{ text: `Note ${section}` }] },
    ],
  }),
);

/** Every line {@linkcode SECTIONS} shows, in order. */
const SECTION_LINES: readonly string[] = SECTIONS.flatMap((_, section) => [
  `Block ${section}`,
  ...[0, 1, 2].flatMap((item) => [
    `Item ${section}.${item}`,
    `first ${section}.${item}`,
    `end ${section}.${item}`,
  ]),
  `Note ${section}`,
]);

const WHOLE_END = /(?:end \d\.\d|Note \d)$/u;

function detailView(): TerminalApplicationView<string> {
  const view = testView(["a", "b"], { body: "master-detail" });
  if (view.body.kind !== "master-detail") throw new Error("master-detail");
  return {
    ...view,
    body: {
      ...view.body,
      detail: { ...view.body.detail, content: { a: SECTIONS, b: SECTIONS } },
    },
  };
}

function readerView(
  layer: ApplicationLayer<string>,
): TerminalApplicationView<string> {
  return { ...testView(["a"]), layers: [layer] };
}

const READER: ApplicationLayer<string> = {
  kind: "reader",
  id: "sections",
  scope: "global",
  title: "Sections",
  blocks: SECTIONS,
};

/** A long Markdown document of headed sections. */
const SOURCE = Array.from(
  { length: 8 },
  (_, section) =>
    `## Section ${section}\n\n${
      Array.from(
        { length: 3 },
        (_, paragraph) => `Paragraph ${section}.${paragraph} reads on.`,
      ).join("\n\n")
    }`,
).join("\n\n");

function readingView(): TerminalApplicationView<string> {
  return {
    header: { leading: [{ text: "Guide", role: "title" }] },
    body: {
      kind: "reading",
      id: "guide",
      content: { kind: "markdown", source: SOURCE },
    },
    footer: { left: [], right: [{ key: "q", label: "Close" }] },
  };
}

/** The rows of a region the last frame drew for targets of `kind`, trimmed. */
function region(
  driver: ApplicationDriver,
  kind: ApplicationHitTarget["kind"],
): readonly string[] | undefined {
  const hits = driver.hits.filter((hit) => hit.target.kind === kind);
  if (hits.length === 0) return undefined;
  const start = Math.min(...hits.map((hit) => hit.start));
  const end = Math.max(...hits.map((hit) => hit.end));
  const rows = [...new Set(hits.map((hit) => hit.row))].sort((a, b) => a - b);
  const lines = driver.text.split("\n");
  return rows.map((row) =>
    [...(lines[row] ?? "")].slice(start, end).join("").replace(
      /[│|╭╮╰╯]/gu,
      "",
    ).trim()
  );
}

/** The rows above the lower marker, if one shows. */
function aboveMarker(rows: readonly string[]): readonly string[] | undefined {
  const marker = rows.findIndex((row) => /↓ \d+ more/u.test(row));
  return marker > 0 ? rows.slice(0, marker) : undefined;
}

/** Scroll a driver one step at a time, checking each frame. */
function walk(
  driver: ApplicationDriver,
  key: string,
  check: (frame: number) => void,
): void {
  for (let step = 0; step < 60; step += 1) {
    check(step);
    const before = driver.text;
    driver.key(key);
    if (driver.text === before) break;
  }
}

type Surface = "split" | "zoom" | "reading" | "reader";

/** A driver showing a viewport of each surface, or undefined at a size without one. */
function open(
  surface: Surface,
  view: TerminalApplicationView<string>,
  columns: number,
  rows: number,
): ApplicationDriver | undefined {
  const driver = new ApplicationDriver(view, {
    columns,
    rows,
    colorDepth: "none",
    ...(surface === "reading" ? { keymap: [{ key: "q", action: "q" }] } : {}),
  });
  if (surface === "zoom") driver.key("space");
  const kind = surface === "reader"
    ? "layer"
    : surface === "reading"
    ? "reading"
    : "detail";
  return region(driver, kind) === undefined ? undefined : driver;
}

function scrollKey(surface: Surface): string {
  return surface === "split" || surface === "zoom" ? "shift-down" : "down";
}

function kindOf(surface: Surface): ApplicationHitTarget["kind"] {
  return surface === "reader"
    ? "layer"
    : surface === "reading"
    ? "reading"
    : "detail";
}

Deno.test("a viewport that hides rows ends after a whole unit, its marker directly beneath", async (t) => {
  const cases:
    readonly (readonly [Surface, TerminalApplicationView<string>])[] = [
      ["split", detailView()],
      ["zoom", detailView()],
      ["reader", readerView(READER)],
    ];
  let checked = 0;
  for (const [surface, view] of cases) {
    for (const { columns, rows } of APPLICATION_REVIEW_SIZES) {
      await t.step(`${surface} at ${columns}x${rows}`, () => {
        const driver = open(surface, view, columns, rows);
        if (driver === undefined) return;
        walk(driver, scrollKey(surface), (step) => {
          const above = aboveMarker(region(driver, kindOf(surface)) ?? []);
          if (above === undefined) return;
          checked += 1;
          // A viewport too short for any whole unit beneath its title cuts
          // the unit it shows; one that shows a unit's end ends at one.
          const last = above.at(-1) ?? "";
          assert(
            WHOLE_END.test(last) || !above.some((row) => WHOLE_END.test(row)),
            `step ${step}: the viewport ends on "${last}"\n${driver.text}`,
          );
        });
      });
    }
  }
  assert(checked > 100, `only ${checked} frames hid rows`);
});

Deno.test("a viewport never ends on a blank row or a heading above its marker", async (t) => {
  const job = DEMO_JOBS[0];
  if (job === undefined) throw new Error("no sample job");
  const cases:
    readonly (readonly [Surface, TerminalApplicationView<string>])[] = [
      ["split", applicationDemoView(DEMO_JOBS)],
      ["zoom", applicationDemoView(DEMO_JOBS)],
      ["reading", readingView()],
      ["reader", readerView(demoKeysReader())],
      ["reader", readerView(demoLogReader(job))],
    ];
  let checked = 0;
  for (const [surface, view] of cases) {
    for (const { columns, rows } of APPLICATION_REVIEW_SIZES) {
      for (let item = 0; item < (surface === "split" ? 5 : 1); item += 1) {
        await t.step(`${surface} item ${item} at ${columns}x${rows}`, () => {
          const driver = open(surface, view, columns, rows);
          if (driver === undefined) return;
          for (let move = 0; move < item; move += 1) driver.key("down");
          walk(driver, scrollKey(surface), (step) => {
            const above = aboveMarker(region(driver, kindOf(surface)) ?? []);
            if (above === undefined) return;
            checked += 1;
            const last = above.at(-1) ?? "";
            assert(
              last !== "" && !/^(?:## )?Section \d$/u.test(last) &&
                !/^[─-]+$/u.test(last),
              `step ${step}: the viewport ends on "${last}"\n${driver.text}`,
            );
          });
        });
      }
    }
  }
  assert(checked > 100, `only ${checked} frames hid rows`);
});

Deno.test("paging the detail or a reading body never skips a line", async (t) => {
  const reading = SOURCE.split("\n").filter((line) => line !== "").map((
    line,
  ) => line.replace(/^## /u, ""));
  const cases: readonly (readonly [
    Surface,
    TerminalApplicationView<string>,
    readonly string[],
  ])[] = [
    ["split", detailView(), SECTION_LINES],
    ["zoom", detailView(), SECTION_LINES],
    ["reading", readingView(), reading],
  ];
  for (const [surface, view, expected] of cases) {
    for (const { columns, rows } of APPLICATION_REVIEW_SIZES) {
      await t.step(`${surface} at ${columns}x${rows}`, () => {
        const driver = open(surface, view, columns, rows);
        if (driver === undefined) return;
        const seen = new Set<string>();
        const read = () => {
          for (const row of region(driver, kindOf(surface)) ?? []) {
            seen.add(row.replace(/^(?:[•*]\s+|## )/u, ""));
          }
        };
        walk(driver, "page-down", read);
        const missing = expected.filter((line) => !seen.has(line));
        assert(
          missing.length === 0,
          `Page Down never shows ${missing.join(", ")}`,
        );
        seen.clear();
        walk(driver, "page-up", read);
        const above = expected.filter((line) => !seen.has(line));
        assert(above.length === 0, `Page Up never shows ${above.join(", ")}`);
      });
    }
  }
});
