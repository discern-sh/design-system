import {
  CATALOGUE_400_PERCENT_REFLOW_VIEWPORT,
  createDecisionCopyPageVerifier,
  verifyDecisionCopyEnrollment,
} from "./metadata-copy.ts";
import type { Page } from "playwright-core";
import { catalogueRoutePaths } from "../../../catalogue/routes.ts";
import { withViewport } from "../../viewport.ts";
import {
  CATALOGUE_WIDE_VIEWPORT as WIDE_VIEWPORT,
  eventually,
  invariant,
  loadCataloguePage,
} from "./support.ts";

export async function verifyComponentDiscoveryJourneys(
  page: Page,
  origin: string,
  expectedComponents: readonly string[],
): Promise<void> {
  await withViewport(page, WIDE_VIEWPORT, async () => {
    const discoveryUrl = new URL(catalogueRoutePaths.components, origin);
    discoveryUrl.searchParams.set("theme", "dark");
    await loadCataloguePage(page, discoveryUrl.href);
    invariant(
      await page.getByRole("main").getByRole("heading", { level: 1 })
        .count() ===
        1,
      "Components discovery needs one h1",
    );
    invariant(
      await page.locator("main [data-discern-component]").count() === 0,
      "Components discovery mounted live specimens",
    );
    const collectionImages = page.locator("[data-discern-collection-image]");
    invariant(
      await collectionImages.count() > 0,
      "Component collections need generated member imagery",
    );
    const imageEvidence = await collectionImages.evaluateAll((images) =>
      images.map((image) => {
        const element = image as HTMLImageElement;
        return {
          source: element.getAttribute("src"),
          width: element.getAttribute("width"),
          height: element.getAttribute("height"),
          visible: getComputedStyle(element).display !== "none",
          theme: element.dataset.discernImageTheme,
        };
      })
    );
    invariant(
      imageEvidence.every(({ source, width, height }) =>
        source?.includes("/catalogue/generated/example-images/") &&
        Number(width) > 0 && Number(height) > 0
      ),
      "Collection imagery lost generated paths or intrinsic dimensions",
    );
    invariant(
      imageEvidence.some(({ visible, theme }) => visible && theme === "dark") &&
        !imageEvidence.some(({ visible, theme }) =>
          visible && theme === "light"
        ),
      "Dark discovery did not select the truthful generated image theme",
    );

    await page.getByRole("button", { name: /All Components \(/ }).click();
    invariant(
      new URL(page.url()).searchParams.get("all") === "1" &&
        new URL(page.url()).searchParams.get("theme") === "dark",
      "All Components did not enter URL state without losing Appearance",
    );
    invariant(
      await page.locator(".discern-catalogue-component-card").count() ===
        expectedComponents.length,
      "All Components did not enrol the complete live registry",
    );
    const groupSelect = page.getByRole("combobox", {
      name: "Group",
      exact: true,
    });
    const firstGroup = await groupSelect.locator("option").nth(1).getAttribute(
      "value",
    );
    invariant(firstGroup, "Components needs a first canonical Group option");
    await groupSelect.selectOption(firstGroup);
    invariant(
      new URL(page.url()).searchParams.get("group") === firstGroup,
      "Group selection did not enter URL state",
    );
    await page.goBack();
    await eventually(
      async () =>
        new URL(page.url()).searchParams.get("all") === "1" &&
        await groupSelect.inputValue() === "",
      "Back did not restore All Components controls and results",
    );
    await page.goForward();
    await eventually(
      async () => await groupSelect.inputValue() === firstGroup,
      "Forward did not restore the selected Component Group",
    );

    await page.getByRole("button", { name: "Reset directory" }).click();
    const query = page.getByRole("searchbox", { name: "Search Components" });
    await query.fill("call to action");
    const ctaResult = page.locator(".discern-catalogue-component-card").filter({
      has: page.getByRole("heading", {
        level: 3,
        name: "CTA band",
        exact: true,
      }),
    });
    invariant(
      await ctaResult.count() === 1 &&
        (await ctaResult.locator(".discern-catalogue-component-card__match")
            .textContent())?.includes("Matched alias: call to action") === true,
      "Component explorer disagreed with the global call-to-action alias reason",
    );
    await query.fill("future-no-such-component");
    invariant(
      new URL(page.url()).searchParams.get("q") ===
        "future-no-such-component",
      "Component query did not round-trip through the URL",
    );
    invariant(
      await page.getByRole("button", { name: "Return to collections" })
        .count() ===
        1,
      "Empty Component results need one recovery action",
    );
    await page.getByRole("button", { name: "Return to collections" }).click();
  });
}

export async function verifyComponentDiscoveryMetadata(
  page: Page,
  origin: string,
): Promise<{ readonly roles: number; readonly scans: number }> {
  const metadata = createDecisionCopyPageVerifier(page);
  const { verifyPage } = metadata;
  await withViewport(page, WIDE_VIEWPORT, async () => {
    const collections = new URL(catalogueRoutePaths.components, origin);
    collections.searchParams.set("theme", "dark");
    await loadCataloguePage(page, collections.href);
    await verifyDecisionCopyEnrollment(
      page,
      ".discern-catalogue-collection-card__description",
      "Purpose collection descriptions",
    );
    await verifyPage("Component collection metadata/dark");

    const results = new URL(catalogueRoutePaths.components, origin);
    results.searchParams.set("q", "call to action");
    results.searchParams.set("theme", "light");
    await loadCataloguePage(page, results.href);
    await verifyDecisionCopyEnrollment(
      page,
      ".discern-catalogue-component-card__description",
      "Component result descriptions",
    );
    await verifyDecisionCopyEnrollment(
      page,
      ".discern-catalogue-component-card__match",
      "Component result match reasons",
    );
    await verifyPage("Component result and match metadata/light", {
      scan: true,
    });
  });
  await withViewport(page, CATALOGUE_400_PERCENT_REFLOW_VIEWPORT, async () => {
    const results = new URL(catalogueRoutePaths.components, origin);
    results.searchParams.set("q", "call to action");
    results.searchParams.set("theme", "dark");
    await loadCataloguePage(page, results.href);
    await verifyPage("Component metadata at representative 400% reflow/dark");
  });
  return metadata.evidence;
}
