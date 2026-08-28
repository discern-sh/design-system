import { assertThrows } from "@std/assert";
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
  assertThrows(
    () =>
      assertCatalogueBrowserCheckRunners(
        catalogueBrowserCheckPlan
          .filter(({ id }) => id !== "compositions")
          .map(({ id }) => id),
      ),
    Error,
    "compositions",
  );
});
