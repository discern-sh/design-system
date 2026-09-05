import type { Page } from "playwright-core";
import type { CatalogueTheme } from "./support.ts";

export function conformanceUrl(
  origin: string,
  theme: CatalogueTheme,
  component?: string,
): string {
  const url = new URL("/catalogue/", origin);
  url.searchParams.set("conformance", "1");
  url.searchParams.set("theme", theme);
  if (component) url.searchParams.set("component", component);
  return url.href;
}

export async function loadConformancePage(
  page: Page,
  url: string,
): Promise<void> {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator('[data-discern-conformance-ready="true"]').waitFor();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}
