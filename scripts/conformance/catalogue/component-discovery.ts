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
  await verifyDiscoveryControlStability(page, origin);
  await verifyDiscoveryPresentation(page, origin);
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

    await page.getByRole("link", { name: "Browse all components" }).click();
    invariant(
      new URL(page.url()).searchParams.get("all") === "1" &&
        new URL(page.url()).searchParams.get("theme") === "dark",
      "All Components did not enter URL state without losing Appearance",
    );
    await eventually(
      async () =>
        await page.locator(".discern-catalogue-component-card").count() ===
          expectedComponents.length,
      "Browse all components did not enrol the complete live registry",
    );
    await page.locator(".discern-catalogue-discovery__filters summary").click();
    const groupSelect = page.getByRole("combobox", {
      name: "Group",
      exact: true,
      includeHidden: true,
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

    await page.getByRole("link", { name: "Browse collections" }).click();
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
      await page.getByRole("link", { name: "Browse collections" })
        .count() ===
        1,
      "Empty Component results need one recovery action",
    );
    await page.getByRole("link", { name: "Browse collections" }).click();
    await verifyDiscoveryReturnJourney(page, origin);
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

async function verifyDiscoveryReturnJourney(
  page: Page,
  origin: string,
): Promise<void> {
  const url = new URL(
    "/catalogue/components/?q=command&availability=cli&group=workflow&all=1&theme=dark",
    origin,
  );
  await loadCataloguePage(page, url.href);
  const card = page.locator("#component-result-command");
  const inspect = card.locator(".discern-catalogue-component-card__inspect");
  const href = await inspect.getAttribute("href");
  invariant(
    href && new URL(href, origin).searchParams.has("return"),
    "Native result link lost shareable return context",
  );
  await inspect.click();
  await page.locator("[data-discern-component=command]").waitFor();
  invariant(
    new URL(page.url()).searchParams.get("surface") === "cli",
    "CLI discovery did not open a CLI detail",
  );
  await page.getByRole("radio", { name: /^All \d+$/ }).check();
  invariant(
    new URL(page.url()).searchParams.has("return"),
    "Detail controls dropped discovery context",
  );
  const next = page.locator('a[rel="next"]');
  await next.click();
  await page.locator(".discern-catalogue-detail").waitFor();
  await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", {
    name: "Back to results",
  }).click();
  await verifyRestoredResult(page);
  // A cold new tab follows only the href, without sharing history or storage.
  const context = await page.context().browser()!.newContext({
    viewport: page.viewportSize(),
  });
  const tab = await context.newPage();
  try {
    await loadCataloguePage(tab, new URL(href, origin).href);
    await tab.getByRole("navigation", { name: "Breadcrumb" }).getByRole(
      "link",
      { name: "Back to results" },
    ).click();
    await verifyRestoredResult(tab);
  } finally {
    await context.close();
  }
  await inspect.click();
  await page.locator(".discern-catalogue-detail").waitFor();
  await page.goBack();
  await verifyRestoredResult(page);
  await page.goForward();
  await page.locator(".discern-catalogue-detail").waitFor();
  invariant(
    new URL(page.url()).searchParams.has("return"),
    "Forward lost the detail's return context",
  );
}

async function verifyRestoredResult(page: Page): Promise<void> {
  await page.locator("#component-result-command").waitFor();
  await eventually(
    async () =>
      await page.getByRole("searchbox", { name: "Search Components" })
        .inputValue() === "command",
    "Return lost the query",
  );
  const url = new URL(page.url());
  invariant(
    url.searchParams.get("availability") === "cli" &&
      url.searchParams.get("group") === "workflow" &&
      url.searchParams.get("theme") === "dark",
    "Return lost filters or Appearance",
  );
  await eventually(
    async () =>
      await page.locator(
        "#component-result-command .discern-catalogue-component-card__inspect",
      ).evaluate((link) => link === document.activeElement),
    "Return did not focus the original result",
  );
  const bounds = await page.locator("#component-result-command").boundingBox();
  invariant(
    bounds && bounds.y < (page.viewportSize()?.height ?? 0) &&
      bounds.y + bounds.height > 0,
    "Return did not reveal the original result",
  );
}

async function verifyDiscoveryPresentation(
  page: Page,
  origin: string,
): Promise<void> {
  for (const width of [1366, 390, 320]) {
    await withViewport(page, { width, height: 850 }, async () => {
      await loadCataloguePage(
        page,
        new URL("/catalogue/components/?theme=light", origin).href,
      );
      const name = await page.locator(".discern-catalogue-collection-card h3")
        .first().boundingBox();
      invariant(
        name && name.y < (width > 640 ? 500 : 620),
        `First useful collection is too far down at ${width}px`,
      );
      const surface = page.getByRole("radio", { name: "CLI", exact: true });
      await surface.check();
      const results = page.locator(".discern-catalogue-component-card");
      invariant(await results.count() > 0, "CLI filtering lost all components");
      invariant(
        await results.filter({ hasText: "Web only" }).count() === 0,
        "CLI filter admitted an exempt component",
      );
      await loadCataloguePage(
        page,
        new URL("/catalogue/components/?q=button&theme=dark", origin).href,
      );
      const button = page.locator(
        '#component-result-button img[data-discern-image-theme="dark"]',
      );
      const image = await button.boundingBox();
      invariant(
        image && image.height >= 32 && image.height <= 64,
        "Thin control strips must retain recognizable control height",
      );
      await loadCataloguePage(
        page,
        new URL("/catalogue/components/?q=article-layout&theme=light", origin)
          .href,
      );
      const layout = page.locator(
        '#component-result-article-layout img[data-discern-image-theme="light"]',
      );
      const frame = await layout.boundingBox();
      invariant(
        frame && frame.height >= 180,
        "Broad layout lost meaningful structure",
      );
      invariant(
        await page.evaluate(() =>
          document.documentElement.scrollWidth <= innerWidth
        ),
        "Discovery overflowed the viewport",
      );
    });
  }
}

/** Primary controls keep their allocation while filtering or revealing options. */
export async function verifyDiscoveryControlStability(
  page: Page,
  origin: string,
): Promise<void> {
  for (const width of [1440, 1280, 1024, 1000, 768, 390, 320]) {
    await withViewport(page, { width, height: 850 }, async () => {
      await loadCataloguePage(
        page,
        new URL("/catalogue/components/", origin).href,
      );
      const controls = page.locator(".discern-catalogue-explorer-controls");
      const bounds = () =>
        controls.locator(
          'input[type="search"], .discern-segmented-control__surface, summary',
        ).evaluateAll((elements) =>
          elements.map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              x: rect.x + scrollX,
              y: rect.y + scrollY,
              width: rect.width,
              height: rect.height,
            };
          })
        );
      const original = await bounds();
      const verify = async (action: string) => {
        const current = await bounds();
        invariant(
          current.length === original.length,
          "Filtering replaced a primary control",
        );
        invariant(
          current.every((rect, index) => {
            const before = original[index]!;
            return (Object.keys(rect) as (keyof typeof rect)[]).every((key) =>
              Math.abs(rect[key] - before[key]) < 1
            );
          }),
          `Discovery controls moved at ${width}px after ${action}: ${
            JSON.stringify({ original, current })
          }`,
        );
        invariant(
          await page.evaluate(() =>
            document.documentElement.scrollWidth <= innerWidth
          ),
          `Discovery controls overflowed at ${width}px after ${action}`,
        );
      };
      for (const radio of await controls.getByRole("radio").all()) {
        await radio.check();
        await verify(`choosing ${await radio.inputValue()}`);
      }
      await controls.getByRole("radio", { name: "Any", exact: true }).check();
      invariant(
        new URL(page.url()).searchParams.get("all") === "1" &&
          await page.locator("#component-results-title").count() === 1,
        "Choosing Any must broaden results without switching to collections",
      );
      await controls.locator("summary").click();
      await verify("opening filters");
      for (const select of await controls.getByRole("combobox").all()) {
        const value = await select.locator("option").nth(1).getAttribute(
          "value",
        );
        invariant(value, "Discovery needs a declared filter option");
        await select.selectOption(value);
        await verify(`choosing ${value}`);
        await select.selectOption("");
        await verify(`clearing ${value}`);
        invariant(
          await select.isVisible(),
          "Clearing a filter collapsed the other controls",
        );
      }
      const group = controls.getByRole("combobox", {
        name: "Group",
        exact: true,
      });
      await group.selectOption({ index: 1 });
      await controls.locator("summary").click();
      await verify("closing active filters");
      const search = controls.getByRole("searchbox");
      await search.fill("button");
      await verify("searching");
      await search.fill("");
      await verify("clearing search");
    });
  }
}
