import { assert, assertEquals } from "@std/assert";
import { createCliBlock, renderMarkdownCli } from "../../src/cli/mod.ts";
import type {
  ApplicationLayer,
  DetailBlock,
  TerminalApplicationView,
} from "../../src/cli/interactive/mod.ts";
import { ApplicationDriver } from "../fixtures/application-driver.ts";
import { FakeTerminalIO } from "../../src/cli/interactive/testing.ts";
import { stripAnsi } from "../../src/cli/mod.ts";
import { createLayerModel } from "../../src/cli/interactive/application/layer-model.ts";
import { renderLayer } from "../../src/cli/interactive/application/layer-render.ts";
import { paintContext } from "../../src/cli/interactive/application/paint.ts";
import { scrollDetail } from "../../src/cli/interactive/application/detail-render.ts";
import { DEMO_JOBS } from "../../scripts/playground/application.ts";
import { demoActionsMenu } from "../../scripts/playground/application-layers.ts";

const IMAGE = DEMO_JOBS.find((job) => job.id === "image-resize") ??
  DEMO_JOBS[0];
if (IMAGE === undefined) throw new Error("the sample has no jobs");
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

Deno.test("a short menu always shows its highlighted item", async (t) => {
  for (const rows of [10, 11, 12, 13]) {
    for (const columns of [32, 40]) {
      await t.step(`${columns}x${rows}`, () => {
        const menu = demoActionsMenu(IMAGE);
        const driver = new ApplicationDriver(
          { ...testView(["a"]), layers: [menu] },
          { columns, rows, colorDepth: "none" },
        );
        const labels = new Map<string, string>([
          ...menu.sections.flatMap((section) =>
            section.items.map((item) =>
              [`item:${item.id}`, item.label] as const
            )
          ),
          ...menu.sections.flatMap((section) =>
            (section.unavailable ?? []).map((item) =>
              [`unavailable:${item.id}`, item.label] as const
            )
          ),
        ]);
        for (let turn = 0; turn < labels.size; turn += 1) {
          const focus = driver.state.layers.actions?.focusedControlId ?? "";
          const label = labels.get(focus);
          if (label !== undefined) {
            assert(
              driver.text.includes(label.slice(0, 8)),
              `${focus} is off screen:\n${driver.text}`,
            );
          }
          driver.key("down");
        }
      });
    }
  }
});

Deno.test("every line of a tiny viewport is on screen at some scroll", async (t) => {
  for (const rows of [10, 11, 12, 13, 14, 16]) {
    await t.step(`sheet at 60x${rows}`, () => {
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
        { columns: 60, rows, colorDepth: "none" },
      );
      const seen = new Set<string>();
      for (let turn = 0; turn < LINES + 5; turn += 1) {
        for (const match of driver.text.matchAll(/line (\d\d)/gu)) {
          seen.add(match[1] ?? "");
        }
        driver.key("down");
      }
      assertEquals(seen.size, LINES, [...seen].sort().join(" "));
      assertEquals(driver.state.fullyRead.ask, true);
    });
    await t.step(`menu at 32x${rows}`, () => {
      const driver = new ApplicationDriver(
        withLayer({
          kind: "menu",
          id: "pick",
          scope: "global",
          title: "Pick one of the lines below",
          aside: "Forty lines to choose from",
          footnote: [{ text: "Every line is a choice; Enter picks it." }],
          sections: [{
            title: "Lines",
            items: Array.from({ length: LINES }, (_, index) => ({
              id: `i${index}`,
              label: line(index),
              action: `pick:${index}`,
              description: [{ text: `Picks ${line(index)} and closes.` }],
            })),
          }],
        }),
        { columns: 32, rows, colorDepth: "none" },
      );
      for (let turn = 0; turn < LINES; turn += 1) {
        const focus = driver.state.layers.pick?.focusedControlId ?? "";
        const index = Number(focus.replace("item:i", ""));
        assert(
          driver.text.includes(line(index)),
          `the highlighted ${line(index)} is off screen:\n${driver.text}`,
        );
        driver.key("down");
      }
    });
  }
});

Deno.test("every scroll position set of a panel shows every body line", async (t) => {
  const capabilities = new FakeTerminalIO([], {
    columns: 60,
    rows: 24,
    colorDepth: "none",
  }).capabilities();
  const reader: ApplicationLayer<string> = {
    kind: "reader",
    id: "notes",
    scope: "global",
    title: "Notes",
    blocks: [MARKS],
  };
  const sheet: ApplicationLayer<string> = {
    kind: "sheet",
    id: "ask",
    scope: "global",
    title: "Apply?",
    state: "ready",
    body: [MARKS],
    buttons: [{ id: "keep", label: "Keep", role: "safe" }],
  };
  for (const layer of [reader, sheet]) {
    for (let height = 4; height <= 12; height += 1) {
      await t.step(`${layer.kind} in ${height} rows`, () => {
        const seen = new Set<string>();
        let model = createLayerModel(layer);
        let previous = -1;
        for (let requested = 0; requested < LINES * 2; requested += 1) {
          const paint = renderLayer(
            { ...paintContext(capabilities, {}, { phase: 0 }) },
            layer,
            { ...model, scroll: requested },
            { width: 60, height, stretch: false, narrow: false },
            undefined,
            true,
          );
          for (const lineText of paint.lines) {
            for (const match of stripAnsi(lineText).matchAll(/line (\d\d)/gu)) {
              seen.add(match[1] ?? "");
            }
          }
          if (paint.model.scroll === previous) break;
          previous = paint.model.scroll;
          model = paint.model;
        }
        assertEquals(seen.size, LINES, `missing lines in ${height} rows`);
      });
    }
  }
});

Deno.test("every line of a detail viewport is on screen at some scroll", () => {
  const capabilities = new FakeTerminalIO([], {
    columns: 40,
    rows: 24,
    colorDepth: "none",
  }).capabilities();
  const context = paintContext(capabilities, {}, { phase: 0 });
  const lines = Array.from({ length: LINES }, (_, index) => line(index));
  for (const padding of [false, true]) {
    for (let height = 1; height <= 8; height += 1) {
      const seen = new Set<string>();
      let previous = -1;
      for (let requested = 0; requested < LINES * 2; requested += 1) {
        const viewport = scrollDetail(
          context,
          lines,
          height,
          requested,
          40,
          padding,
        );
        for (const text of viewport.lines) {
          if (text.startsWith("line")) seen.add(text);
        }
        if (viewport.scroll === previous) break;
        previous = viewport.scroll;
      }
      assertEquals(seen.size, LINES, `height ${height}, padding ${padding}`);
    }
  }
});
