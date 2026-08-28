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
