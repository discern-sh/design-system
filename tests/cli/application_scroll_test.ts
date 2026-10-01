import { assert, assertEquals } from "@std/assert";
import { createCliBlock, renderMarkdownCli } from "../../src/cli/mod.ts";
import type {
  ApplicationLayer,
  DetailBlock,
  TerminalApplicationView,
} from "../../src/cli/interactive/mod.ts";
import { ApplicationDriver } from "../fixtures/application-driver.ts";
import { testView } from "../fixtures/application-views.ts";

const LINES = 40;

function line(index: number): string {
  return `line ${String(index + 1).padStart(2, "0")}`;
}

const MARKS: DetailBlock = {
  kind: "marks",
  items: Array.from({ length: LINES }, (_, index) => ({
    mark: { unicode: "·", ascii: "-", tone: "faint" as const },
    runs: [{ text: line(index) }],
  })),
};

/** The highest numbered line on screen, outside the header and footer. */
function lastShown(driver: ApplicationDriver): number {
  let last = -1;
  for (const row of driver.text.split("\n").slice(1, -1)) {
    for (const match of row.matchAll(/line (\d\d)/gu)) {
      last = Math.max(last, Number(match[1]));
    }
  }
  return last;
}

/**
 * Step one line at a time from the top: each step must show a new last
 * line until the end is in view, and steps past the end change nothing.
 */
function assertEveryStepReveals(
  driver: ApplicationDriver,
  step: () => void,
  where: string,
): void {
  let previous = lastShown(driver);
  assert(previous > 0 && previous < LINES, `${where}: nothing to scroll`);
  for (let turn = 0; turn < LINES + 5; turn += 1) {
    step();
    const current = lastShown(driver);
    if (previous === LINES) {
      assertEquals(current, LINES, `${where}: scrolled past the end`);
      continue;
    }
    assert(
      current > previous,
      `${where}: step ${
        turn + 1
      } showed nothing new (last line ${current})\n${driver.text}`,
    );
    previous = current;
  }
}

function detailView(): TerminalApplicationView<string> {
  const view = testView(["a", "b"]);
  if (view.body.kind !== "master-detail") throw new Error("expected detail");
  return {
    ...view,
    body: {
      ...view.body,
      detail: { ...view.body.detail, content: { a: [MARKS] } },
    },
  };
}

function withLayer(layer: ApplicationLayer<string>) {
  return { ...testView(["a"]), layers: [layer] };
}

Deno.test("every scroll step reveals a new line until the end", async (t) => {
  const sizes = [[120, 30], [80, 24], [80, 13], [60, 20], [40, 12]] as const;
  for (const [columns, rows] of sizes) {
    const options = { columns, rows, colorDepth: "none" as const };
    if (columns >= 80) {
      await t.step(`detail at ${columns}x${rows}`, () => {
        const driver = new ApplicationDriver(detailView(), options);
        assertEveryStepReveals(
          driver,
          () => driver.key("shift-down"),
          "detail",
        );
      });
    }
    await t.step(`zoom at ${columns}x${rows}`, () => {
      const driver = new ApplicationDriver(detailView(), options);
      driver.key("space");
      assertEveryStepReveals(driver, () => driver.key("shift-down"), "zoom");
    });
    await t.step(`reading at ${columns}x${rows}`, () => {
      const driver = new ApplicationDriver({
        ...testView(["a"]),
        footer: { left: [{ key: ["up", "down"], label: "Scroll" }] },
        body: {
          kind: "reading",
          id: "guide",
          content: createCliBlock(renderMarkdownCli, {
            source: Array.from(
              { length: LINES },
              (_, index) => `- ${line(index)}`,
            ).join("\n"),
          }),
        },
      }, options);
      assertEveryStepReveals(driver, () => driver.key("down"), "reading");
    });
    await t.step(`reader at ${columns}x${rows}`, () => {
      const driver = new ApplicationDriver(
        withLayer({
          kind: "reader",
          id: "notes",
          scope: "global",
          title: "Notes",
          blocks: [MARKS],
        }),
        options,
      );
      assertEveryStepReveals(driver, () => driver.key("down"), "reader");
    });
    await t.step(`sheet at ${columns}x${rows}`, () => {
      const driver = new ApplicationDriver(
        withLayer({
          kind: "sheet",
          id: "ask",
          scope: "global",
          title: "Apply?",
          state: "ready",
          body: [MARKS],
          buttons: [
            { id: "keep", label: "Keep", role: "safe" },
            { id: "go", label: "Apply", role: "confirm", action: "go" },
          ],
        }),
        options,
      );
      assertEveryStepReveals(driver, () => driver.key("down"), "sheet");
    });
  }
});
