import type { Page } from "playwright-core";
import { scanBrowserAccessibility } from "../../browser-conformance-support.ts";
import { withViewport } from "../../viewport.ts";
import { CATALOGUE_NARROW_VIEWPORT } from "./support.ts";

/**
 * The landing page served at the site root must carry its one page-owned theme
 * behavior, one h1, one main landmark, and an accessible document in both
 * colour schemes.
 */
export async function verifyLandingPage(
  page: Page,
  origin: string,
  failures: string[],
): Promise<number> {
  let scans = 0;
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await page.goto(`${origin}/`, { waitUntil: "networkidle" });
    const shape = await page.evaluate(() => ({
      scripts: document.querySelectorAll("script").length,
      headings: document.querySelectorAll("h1").length,
      mains: document.querySelectorAll("main").length,
      root: document.documentElement.hasAttribute("data-discern-root"),
      themeToggle: document.querySelectorAll(
        "[data-discern-theme-control]",
      ).length,
    }));
    if (shape.scripts !== 1) {
      failures.push(
        `landing/${scheme}: expected one page-owned theme behavior, found ${shape.scripts} scripts`,
      );
    }
    if (shape.themeToggle !== 1) {
      failures.push(
        `landing/${scheme}: expected one theme control, found ${shape.themeToggle}`,
      );
    }
    if (shape.headings !== 1) {
      failures.push(
        `landing/${scheme}: expected exactly one h1, found ${shape.headings}`,
      );
    }
    if (shape.mains !== 1) {
      failures.push(
        `landing/${scheme}: expected exactly one main landmark, found ${shape.mains}`,
      );
    }
    if (!shape.root) {
      failures.push(`landing/${scheme}: html must carry data-discern-root`);
    }
    try {
      const results = await scanBrowserAccessibility(page, "body");
      scans += 1;
      for (const violation of results.violations) {
        const targets = violation.nodes.map((node) => {
          const summary = node.failureSummary?.replace(/\s+/g, " ").trim();
          return `${JSON.stringify(node.target)}${
            summary ? ` — ${summary}` : ""
          }`;
        }).join("; ");
        failures.push(
          `landing/${scheme}: ${violation.id} (${
            violation.impact ?? "unknown impact"
          }) at ${targets}`,
        );
      }
    } catch (error) {
      failures.push(
        `landing/${scheme}: accessibility scan failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto(`${origin}/`, { waitUntil: "networkidle" });
  const themeControl = page.locator("[data-discern-theme-control]");
  const themeBefore = await page.locator("[data-discern-root]").getAttribute(
    "data-discern-theme",
  );
  await themeControl.click();
  const themeAfter = await page.locator("[data-discern-root]").getAttribute(
    "data-discern-theme",
  );
  const destinationAfter = await themeControl.getAttribute("aria-label");
  if (themeBefore !== "light" || themeAfter !== "dark") {
    failures.push(
      `landing/theme: expected light → dark, observed ${themeBefore} → ${themeAfter}`,
    );
  }
  if (destinationAfter !== "Switch to the light theme") {
    failures.push(
      `landing/theme: dark state names ${
        JSON.stringify(destinationAfter)
      } instead of the light destination`,
    );
  }
  await page.reload({ waitUntil: "networkidle" });
  const persistedTheme = await page.locator("[data-discern-root]").getAttribute(
    "data-discern-theme",
  );
  if (persistedTheme !== "dark") {
    failures.push(
      `landing/theme: persisted dark preference restored as ${persistedTheme}`,
    );
  }
  await page.evaluate(() =>
    localStorage.removeItem("discern-design-system-theme")
  );
  await withViewport(page, CATALOGUE_NARROW_VIEWPORT, async () => {
    await page.goto(`${origin}/`, { waitUntil: "networkidle" });
    const narrow = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      navDisplay: getComputedStyle(
        document.querySelector(".discern-site-header__nav")!,
      ).display,
      metricsWidth: document.querySelector(".discern-metrics-band__list")!
        .getBoundingClientRect().width,
      metricsInnerWidth: document.querySelector(
        ".discern-metrics-band__inner",
      )!.getBoundingClientRect().width,
      heroDecoration: getComputedStyle(
        document.querySelector(".discern-hero-block--atmospheric")!,
        "::before",
      ).content,
    }));
    const overflow = narrow.overflow;
    if (overflow > 0) {
      failures.push(
        `landing/reflow: the document scrolls ${overflow}px horizontally at ${CATALOGUE_NARROW_VIEWPORT.width}px — wide content must scroll inside its own frame`,
      );
    }
    if (narrow.navDisplay !== "none") {
      failures.push(
        `landing/reflow: campaign navigation remains ${narrow.navDisplay} at ${CATALOGUE_NARROW_VIEWPORT.width}px`,
      );
    }
    if (narrow.metricsWidth < narrow.metricsInnerWidth * 0.95) {
      failures.push(
        `landing/reflow: headerless metrics occupy ${narrow.metricsWidth}px of a ${narrow.metricsInnerWidth}px band`,
      );
    }
    if (narrow.heroDecoration !== "none") {
      failures.push(
        `landing/reflow: atmospheric hero still paints clipped pseudo-content ${narrow.heroDecoration}`,
      );
    }
  });
  await page.emulateMedia({ colorScheme: null, reducedMotion: "reduce" });
  return scans;
}
