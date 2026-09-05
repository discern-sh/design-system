import { assertEquals, assertThrows } from "@std/assert";
import { catalogueNavigation } from "../catalogue/routes.ts";
import {
  assertCatalogueBrowserCheckRunners,
  assertCatalogueFamilyBrowserCoverage,
  catalogueBrowserCheckPlan,
} from "../scripts/conformance/catalogue/browser-check-plan.ts";

Deno.test("every Catalogue route family enrols exactly one family browser check", () => {
  assertCatalogueFamilyBrowserCoverage(catalogueNavigation);
  assertCatalogueBrowserCheckRunners(
    catalogueBrowserCheckPlan.map(({ id }) => id),
  );
});

Deno.test("a future route family cannot land without a browser-check owner", () => {
  assertThrows(
    () =>
      assertCatalogueFamilyBrowserCoverage([
        ...catalogueNavigation,
        { id: "future-family" as never },
      ]),
    Error,
    "future-family needs exactly one family browser check; found none",
  );
});

Deno.test("a declared family check cannot be orphaned by the orchestrator", () => {
  for (const check of catalogueBrowserCheckPlan) {
    assertThrows(
      () =>
        assertCatalogueBrowserCheckRunners(
          catalogueBrowserCheckPlan
            .filter(({ id }) => id !== check.id)
            .map(({ id }) => id),
        ),
      Error,
      check.id,
    );
  }
});

Deno.test("Catalogue route checks stay separate from the public Component population", () => {
  assertEquals(
    catalogueBrowserCheckPlan.find(({ id }) => id === "component-contracts")
      ?.familyIds,
    [],
  );
  assertEquals(
    catalogueBrowserCheckPlan.find(({ id }) => id === "components")?.familyIds,
    ["components"],
  );
  assertEquals(
    catalogueBrowserCheckPlan.find(({ id }) => id === "compare")?.familyIds,
    ["compare"],
  );
});
