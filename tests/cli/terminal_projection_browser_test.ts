import { assert, assertEquals } from "@std/assert";
import { launchBrowser } from "../../scripts/browser.ts";
import {
  inspectTerminalLayout,
  projectTerminalInspectorHtml,
} from "../../src/cli/projection.ts";
import { measureText } from "../../src/cli/text.ts";

const COLUMNS = 20;
const INNER_COLUMNS = COLUMNS - 2;

function framedRow(content: string): string {
  return `│${content}${" ".repeat(INNER_COLUMNS - measureText(content))}│`;
}

Deno.test("browser projection pins Unicode advances to terminal cells", async () => {
  const frame = [
    `┌${"─".repeat(INNER_COLUMNS)}┐`,
    framedRow("   ◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨"),
    framedRow("界🎨"),
    `└${"─".repeat(INNER_COLUMNS)}┘`,
  ].join("\n");
  assertEquals(
    inspectTerminalLayout(frame, { columns: COLUMNS, rows: 4 }).overflowRows,
    [],
    "the fixture must fit its logical terminal viewport",
  );

  const browser = await launchBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(projectTerminalInspectorHtml(frame, {
      columns: COLUMNS,
      rows: 4,
      title: "Unicode cell alignment",
    }));
    const facts = await page.locator("[data-discern-terminal-row]")
      .evaluateAll((rows) =>
        rows.slice(0, 4).map((row) => {
          const cells = row.querySelectorAll<HTMLElement>(
            "[data-discern-terminal-cell]",
          );
          const finalCell = cells.item(cells.length - 1);
          const rowBounds = row.getBoundingClientRect();
          const finalBounds = finalCell?.getBoundingClientRect();
          return {
            cells: cells.length,
            rightEdgeDelta: finalBounds === undefined
              ? Number.POSITIVE_INFINITY
              : Math.abs(finalBounds.right - rowBounds.right),
          };
        })
      );

    assertEquals(
      facts.map(({ cells }) => cells),
      [20, 14, 4, 20],
      "every non-ASCII grapheme must occupy an explicit terminal cell box",
    );
    for (const [index, fact] of facts.entries()) {
      assert(
        fact.rightEdgeDelta <= 0.5,
        `row ${
          index + 1
        } ended ${fact.rightEdgeDelta}px outside its terminal track`,
      );
    }
  } finally {
    await browser.close();
  }
});
