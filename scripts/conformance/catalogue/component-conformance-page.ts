import type { Page } from "playwright-core";
import type { CatalogueTheme } from "./support.ts";
import { loadReadyBrowserPage } from "../../browser-conformance-support.ts";

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
  await loadReadyBrowserPage(
    page,
    url,
    '[data-discern-conformance-ready="true"]',
  );
}
