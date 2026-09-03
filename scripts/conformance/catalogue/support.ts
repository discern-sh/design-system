import type { Page } from "playwright-core";

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
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator(".discern-catalogue-shell").waitFor();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
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
    ? "Light pole"
    : "Dark pole";
  await disclosure.getByRole("radio", { name: label, exact: true }).check();
  await eventually(
    async () =>
      await page.locator(".discern-catalogue-shell").getAttribute(
        "data-discern-theme",
      ) === theme,
    `Catalogue did not apply the ${theme} theme policy`,
  );
}

/** Open the shared global Appearance disclosure and its four field axes. */
export async function openCatalogueAppearanceAxes(page: Page): Promise<void> {
  const appearance = page.locator(".discern-catalogue-appearance");
  if (await appearance.getAttribute("open") === null) {
    await appearance.locator(
      'summary[aria-label^="Change "][aria-label$="appearance"]',
    ).click();
  }
  const axes = appearance.getByRole("button", { name: /^Axes/ });
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
