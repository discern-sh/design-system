import { assert, assertEquals } from "@std/assert";
import { cliCompositionRecipes } from "../../catalogue/cli-compositions.ts";
import { inspectTerminalLayout } from "../../src/cli/projection.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";

const viewports = [
  { columns: 40, rows: 24 },
  { columns: 80, rows: 24 },
  { columns: 120, rows: 30 },
] as const;

Deno.test("complete CLI compositions stay deterministic and width-safe", () => {
  assertEquals(cliCompositionRecipes.length, 5);
  assertEquals(
    new Set(cliCompositionRecipes.map((recipe) => recipe.id)).size,
    cliCompositionRecipes.length,
    "CLI composition ids must be unique",
  );

  const inspections = [];
  for (const recipe of cliCompositionRecipes) {
    assert(recipe.components.length > 1, `${recipe.id} is not a composition`);
    assert(
      recipe.source.includes("@discern-sh/design-system/cli"),
      `${recipe.id} does not expose copyable consumer source`,
    );
    for (const viewport of viewports) {
      const capabilities = testTerminalCapabilities({
        columns: viewport.columns,
        colorDepth: "truecolor",
      });
      const output = recipe.render(capabilities, "dark", viewport.rows);
      assertEquals(
        recipe.render(capabilities, "dark", viewport.rows),
        output,
        `${recipe.id} changed across identical renders`,
      );
      const inspection = inspectTerminalLayout(output, viewport);
      assertEquals(
        inspection.overflowRows,
        [],
        `${recipe.id} overflowed at ${viewport.columns} columns`,
      );
      inspections.push(inspection);
    }
  }

  assert(
    inspections.some((inspection) => inspection.rowsBelowFold > 0),
    "no composition demonstrates a below-fold layout",
  );
  assert(
    inspections.some((inspection) => inspection.spareRows > 0),
    "no composition demonstrates a layout that fits its viewport",
  );
});
