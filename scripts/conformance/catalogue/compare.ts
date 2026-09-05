import {
  CATALOGUE_400_PERCENT_REFLOW_VIEWPORT,
  createDecisionCopyPageVerifier,
  verifyDecisionCopyEnrollment,
} from "./metadata-copy.ts";
import type { Page } from "playwright-core";
import { catalogueRoutePaths } from "../../../catalogue/routes.ts";
import { withViewport } from "../../viewport.ts";
import {
  CATALOGUE_NARROW_VIEWPORT as NARROW_VIEWPORT,
  CATALOGUE_WIDE_VIEWPORT as WIDE_VIEWPORT,
  eventually,
  invariant,
  loadCataloguePage,
} from "./support.ts";
import { verifyInlineOverflowCueEdges } from "./overflow-cue.ts";

export async function verifyCompareJourneys(
  page: Page,
  origin: string,
  expectedComponents: readonly string[],
): Promise<void> {
  await withViewport(page, WIDE_VIEWPORT, async () => {
    const compareUrl = new URL(catalogueRoutePaths.compare, origin);
    compareUrl.searchParams.set("theme", "dark");
    compareUrl.searchParams.set("accent", "violet");
    await loadCataloguePage(page, compareUrl.href);
    invariant(
      await page.locator(".discern-catalogue-collection-card").count() === 0 &&
        await page.locator("[data-discern-compare-item]").count() === 0,
      "Bare Compare repeated the Components directory or mounted specimens",
    );
    const scopeSelect = page.getByLabel("Comparison scope");
    const firstScope = await scopeSelect.locator("option").nth(1).getAttribute(
      "value",
    );
    invariant(firstScope, "Compare needs a focused scope choice");
    await scopeSelect.selectOption(firstScope);
    await eventually(
      async () => await page.locator("[data-discern-compare-item]").count() > 0,
      "Compare scope did not mount its bounded population",
    );
    const compareItems = page.locator("[data-discern-compare-item]");
    invariant(
      await compareItems.locator(
            ".discern-catalogue-component__evidence",
          ).count() === 0 &&
        await page.getByRole("main").getByRole("heading", { level: 1 })
            .count() ===
          1 &&
        await page.getByRole("main").getByRole("heading", { level: 2 })
            .count() > 0 &&
        await page.getByRole("main").getByRole("heading", { level: 3 })
            .count() ===
          await compareItems.count(),
      "Compare density or heading hierarchy regressed",
    );
    for (let index = 0; index < await compareItems.count(); index += 1) {
      invariant(
        await compareItems.nth(index).locator(
          "[data-discern-example-state], [data-discern-cli-example-state], [data-discern-example-unavailable]",
        ).count() === 1,
        "Compare item did not lead with exactly one named specimen",
      );
    }
    invariant(
      await page.locator(".discern-catalogue-review__jump-list a").count() ===
        await compareItems.count(),
      "Compare jump list does not cover its exact population",
    );
    await page.getByRole("button", { name: "Set all to CLI" }).click();
    invariant(
      new URL(page.url()).searchParams.get("surface") === "cli" &&
        new URL(page.url()).searchParams.get("theme") === "dark" &&
        new URL(page.url()).searchParams.get("accent") === "300" &&
        new URL(page.url()).searchParams.get("field") === "1,1,1,1",
      "Set all to CLI did not enter URL state without losing Appearance",
    );
    await compareItems.first().getByRole("button", {
      name: "Web",
      exact: true,
    }).click();
    invariant(
      new URL(page.url()).searchParams.has("surfaces"),
      "Individual Compare surface override did not enter URL state",
    );
    await page.getByRole("button", {
      name: "Reset individual overrides",
    }).click();
    invariant(
      !new URL(page.url()).searchParams.has("surfaces"),
      "Reset individual overrides left stale URL evidence",
    );

    const customSlugs = expectedComponents.slice(0, 2);
    invariant(customSlugs.length === 2, "Custom Compare needs two Components");
    const customUrl = new URL(catalogueRoutePaths.compare, origin);
    customUrl.searchParams.set("components", customSlugs.join(","));
    await loadCataloguePage(page, customUrl.href);
    invariant(
      await page.locator("[data-discern-compare-item]").count() === 2,
      "Custom Compare did not restore its shareable population",
    );
    await page.locator("[data-discern-compare-item]").first().getByRole(
      "button",
      { name: "Remove" },
    ).click();
    invariant(
      await page.locator("[data-discern-compare-item]").count() === 1 &&
        new URL(page.url()).searchParams.get("components") === customSlugs[1],
      "Custom removal lost order-stable URL state",
    );

    const completeUrl = new URL(catalogueRoutePaths.compare, origin);
    completeUrl.searchParams.set("scope", "all");
    await loadCataloguePage(page, completeUrl.href);
    invariant(
      await page.locator("[data-discern-compare-item]").count() ===
          expectedComponents.length &&
        await page.locator(
            "[data-discern-compare-item] .discern-catalogue-component__evidence",
          ).count() === 0 &&
        await page.getByText(
            `Complete system · ${expectedComponents.length} Component previews`,
          ).count() === 1,
      "Complete-system Compare lost its secondary weight/count posture",
    );
  });
  await withViewport(page, NARROW_VIEWPORT, async () => {
    const dense = expectedComponents.filter((slug) =>
      slug === "table" || slug === "command"
    );
    const slugs = dense.length === 2 ? dense : expectedComponents.slice(0, 2);
    const url = new URL(catalogueRoutePaths.compare, origin);
    url.searchParams.set("components", slugs.join(","));
    if (slugs.includes("table") && slugs.includes("command")) {
      url.searchParams.set(
        "examples",
        "table:dense-overflow,command:overflow",
      );
    }
    await loadCataloguePage(page, url.href);
    const containment = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    invariant(
      containment.scrollWidth <= containment.clientWidth + 1,
      `Narrow Compare overflowed the document (${containment.scrollWidth}/${containment.clientWidth})`,
    );
    const scope = page.getByLabel("Comparison scope");
    await scope.focus();
    await page.keyboard.press("Tab");
    const focus = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      const style = active ? getComputedStyle(active) : undefined;
      return {
        tag: active?.tagName.toLowerCase(),
        outline: Number.parseFloat(style?.outlineWidth ?? "0"),
      };
    });
    invariant(
      focus.tag !== "body" && focus.outline >= 2,
      "Keyboard Compare control lost visible focus at narrow width",
    );

    const allCompare = new URL(catalogueRoutePaths.compare, origin);
    allCompare.searchParams.set("scope", "all");
    await loadCataloguePage(page, allCompare.href);
    await verifyInlineOverflowCueEdges(
      page.locator(".discern-catalogue-review__jump-cue"),
      "Compare jump list",
    );
    const completeContainment = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    invariant(
      completeContainment.scrollWidth <= completeContainment.clientWidth + 1,
      "Complete Compare cue escaped the narrow document",
    );
  });
}

export async function verifyCompareMetadata(
  page: Page,
  origin: string,
): Promise<{ readonly roles: number; readonly scans: number }> {
  const metadata = createDecisionCopyPageVerifier(page);
  const { verifyPage } = metadata;
  await withViewport(page, WIDE_VIEWPORT, async () => {
    const compare = new URL(catalogueRoutePaths.compare, origin);
    compare.searchParams.set("group", "workflow");
    compare.searchParams.set("theme", "dark");
    await loadCataloguePage(page, compare.href);
    await verifyDecisionCopyEnrollment(
      page,
      ".discern-catalogue-compare-item > header p",
      "Compare Component descriptions",
    );
    await verifyPage("Compare Component metadata/dark");
  });
  await withViewport(page, CATALOGUE_400_PERCENT_REFLOW_VIEWPORT, async () => {
    const compare = new URL(catalogueRoutePaths.compare, origin);
    compare.searchParams.set("group", "workflow");
    compare.searchParams.set("theme", "dark");
    await loadCataloguePage(page, compare.href);
    await verifyPage("Compare metadata at representative 400% reflow/dark");
  });
  return metadata.evidence;
}
