import type { Locator, Page } from "playwright-core";
import { preserveCatalogueAppearanceHref } from "../../../catalogue/shell/appearance-state.ts";
import { loadReadyBrowserPage } from "../../browser-conformance-support.ts";

export const CATALOGUE_WIDE_VIEWPORT = { width: 1440, height: 1000 } as const;
export const CATALOGUE_TERMINAL_VIEWPORT = {
  width: 1920,
  height: 1200,
} as const;
export const CATALOGUE_NARROW_VIEWPORT = { width: 390, height: 844 } as const;
export type CatalogueTheme = "light" | "dark";

export function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

export async function eventually(
  predicate: () => boolean | Promise<boolean>,
  failure: string,
): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(failure);
}

export async function loadCataloguePage(
  page: Page,
  url: string,
): Promise<void> {
  await loadReadyBrowserPage(page, url, ".discern-catalogue-shell");
}

/** Select one global Catalogue theme policy through the shared public control. */
export async function selectCatalogueTheme(
  page: Page,
  theme: "system" | CatalogueTheme,
): Promise<void> {
  const disclosure = page.locator(".discern-catalogue-appearance");
  if (await disclosure.getAttribute("open") === null) {
    await disclosure.locator('summary[aria-label="Change appearance"]').click();
  }
  const label = theme === "system"
    ? "System"
    : theme === "light"
    ? "Light"
    : "Dark";
  await disclosure.getByRole("radio", { name: label, exact: true }).check();
  await eventually(
    async () =>
      await page.locator(".discern-catalogue-shell").getAttribute(
        "data-discern-theme",
      ) === theme,
    `Catalogue did not apply the ${theme} theme policy`,
  );
}

/** Open the shared global Appearance disclosure and its primary axes. */
export async function openCatalogueAppearanceAxes(page: Page): Promise<void> {
  const appearance = page.locator(".discern-catalogue-appearance");
  if (await appearance.getAttribute("open") === null) {
    await appearance.locator(
      'summary[aria-label^="Change "][aria-label$="appearance"]',
    ).click();
  }
  const axes = appearance.getByRole("button", { name: /Axes/ });
  if (await axes.getAttribute("aria-expanded") !== "true") {
    await axes.click();
  }
}

/** Set one numeric Appearance control and wait for its double-frame commit. */
export async function setCatalogueAppearanceInput(
  input: ReturnType<Page["locator"]>,
  value: number,
): Promise<void> {
  await input.fill(String(value));
  await input.evaluate(async () => {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
  });
}

/** Select an exact search destination, including the current portable Appearance. */
export function catalogueSearchResult(page: Page, href: string): Locator {
  const destination = preserveCatalogueAppearanceHref(
    new URL(page.url()),
    href,
  );
  return page.getByRole("dialog", { name: "Search the Catalogue" }).locator(
    `.discern-search-palette__result[href=${JSON.stringify(destination)}]`,
  );
}
