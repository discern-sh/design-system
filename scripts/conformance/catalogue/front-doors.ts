import type { Page } from "playwright-core";
import {
  catalogueNavigation,
  catalogueRoutePaths,
} from "../../../catalogue/routes.ts";
import { scanBrowserAccessibility } from "../../browser-conformance-support.ts";
import { withViewport } from "../../viewport.ts";
import { CATALOGUE_NARROW_VIEWPORT } from "./support.ts";

interface LinkProjection {
  readonly label: string;
  readonly path: string;
}

function projectedRoutesEqual(
  actual: readonly LinkProjection[],
  expected: readonly LinkProjection[],
): boolean {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

async function verifyLandingOrientation(
  page: Page,
  origin: string,
  failures: string[],
): Promise<void> {
  await page.goto(`${origin}/`, { waitUntil: "networkidle" });
  const expected = catalogueNavigation.map(({ label, path }) => ({
    label,
    path,
  }));
  const shape = await page.evaluate(() => {
    const links = (selector: string) =>
      [...document.querySelectorAll<HTMLAnchorElement>(selector)].map((
        link,
      ) => ({ label: link.textContent?.trim() ?? "", path: link.pathname }));
    const ids = [...document.querySelectorAll<HTMLElement>("[id]")].map(
      ({ id }) => id,
    );
    const primary = document.querySelector<HTMLAnchorElement>(
      "main [data-discern-primary-catalogue-action]",
    );
    const headings = [...document.querySelectorAll<HTMLElement>(
      "main h1, main h2, main h3, main h4, main h5, main h6",
    )].map(({ tagName }) => Number(tagName.slice(1)));
    const onThisPage = [...document.querySelectorAll<HTMLAnchorElement>(
      'nav[aria-label="On this page"] a',
    )].map((link) => {
      const id = decodeURIComponent(link.hash.slice(1));
      const target = document.getElementById(id);
      return {
        id,
        label: link.textContent?.replace(/^\d+/, "").trim() ?? "",
        targetExists: target !== null,
        targetFocusable: target?.getAttribute("tabindex") === "-1",
        targetHasHeading: target?.querySelector("h2, h3") !== null,
      };
    });
    return {
      header: links(
        '[data-discern-catalogue-navigation="landing-header"] .discern-site-header__nav a',
      ),
      footer: links(
        '[data-discern-catalogue-navigation="landing-footer"] .discern-site-footer__nav > div:first-child a',
      ),
      primary: primary === null ? null : {
        label: primary.textContent?.trim() ?? "",
        path: primary.pathname,
        visible: primary.getClientRects().length > 0,
      },
      uniqueIds: new Set(ids).size === ids.length,
      headingHierarchy: headings[0] === 1 &&
        headings.every((level, index) =>
          index === 0 || level <= (headings[index - 1] ?? 0) + 1
        ),
      onThisPage,
    };
  });
  if (!projectedRoutesEqual(shape.header, expected)) {
    failures.push(
      `landing/routes: header differs from canonical order (${
        shape.header.map(({ label }) => label).join(", ")
      })`,
    );
  }
  if (!projectedRoutesEqual(shape.footer, expected)) {
    failures.push(
      `landing/routes: footer differs from canonical order (${
        shape.footer.map(({ label }) => label).join(", ")
      })`,
    );
  }
  if (
    shape.primary?.label !== "Find a Component" ||
    shape.primary.path !== catalogueRoutePaths.components ||
    !shape.primary.visible
  ) {
    failures.push(
      `landing/action: primary Catalogue action is ${
        JSON.stringify(shape.primary)
      }`,
    );
  }
  if (!shape.uniqueIds) {
    failures.push("landing/anchors: document ids are not unique");
  }
  if (!shape.headingHierarchy) {
    failures.push("landing/headings: main heading hierarchy skips a level");
  }
  for (const target of shape.onThisPage) {
    if (
      !target.targetExists || !target.targetFocusable ||
      !target.targetHasHeading
    ) {
      failures.push(
        `landing/anchors: ${target.label} points to an incomplete target ${target.id}`,
      );
    }
  }

  const skip = page.getByRole("link", { name: "Skip to content" });
  await skip.focus();
  await skip.press("Enter");
  if (
    !await page.locator("#main-content").evaluate((node) =>
      document.activeElement === node
    )
  ) {
    failures.push("landing/anchors: Skip link did not focus main content");
  }

  const pageLinks = page.locator('nav[aria-label="On this page"] a');
  for (let index = 0; index < await pageLinks.count(); index += 1) {
    const link = pageLinks.nth(index);
    const hash = await link.getAttribute("href");
    await link.focus();
    await link.press("Enter");
    const state = await page.evaluate((href) => {
      const target = href === null ? null : document.querySelector(href);
      return {
        hash: globalThis.location.hash,
        focused: target !== null && document.activeElement === target,
      };
    }, hash);
    if (hash === null || state.hash !== hash || !state.focused) {
      failures.push(
        `landing/anchors: keyboard activation of ${hash} produced ${state.hash} and focused=${state.focused}`,
      );
    }
  }
}

async function verifyOverviewDirectory(
  page: Page,
  origin: string,
  failures: string[],
): Promise<void> {
  await page.goto(new URL(catalogueRoutePaths.overview, origin).href, {
    waitUntil: "networkidle",
  });
  await page.locator(".discern-catalogue-overview h1").waitFor();
  const expected = catalogueNavigation.slice(1).map(({ label, path }) => ({
    label,
    path,
  }));
  const shape = await page.evaluate(() => {
    const primary = document.querySelector<HTMLAnchorElement>(
      ".discern-catalogue-overview [data-discern-primary-catalogue-action]",
    );
    const cards = [...document.querySelectorAll<HTMLAnchorElement>(
      ".discern-catalogue-overview [data-discern-catalogue-destination]",
    )].map((card) => ({
      id: card.dataset.discernCatalogueDestination ?? "",
      label: card.querySelector("h2")?.textContent?.trim() ?? "",
      path: card.pathname,
      count: card.querySelector("small")?.textContent?.trim() ?? "",
      action: card.querySelector(".discern-catalogue-route-card__action")
        ?.textContent?.trim() ?? "",
    }));
    const visibleImages = [...document.querySelectorAll<HTMLImageElement>(
      ".discern-catalogue-route-card__image img",
    )].filter((image) => getComputedStyle(image).display !== "none");
    return {
      primary: primary === null ? null : {
        label: primary.textContent?.trim() ?? "",
        path: primary.pathname,
        visible: primary.getClientRects().length > 0,
      },
      cards,
      visibleImages: visibleImages.length,
      imageSourceBacked: visibleImages[0]?.src.includes(
        "/catalogue/generated/example-images/",
      ) === true,
    };
  });
  if (
    shape.primary?.label !== "Find a Component" ||
    shape.primary.path !== catalogueRoutePaths.components ||
    !shape.primary.visible
  ) {
    failures.push(
      `overview/action: primary Catalogue action is ${
        JSON.stringify(shape.primary)
      }`,
    );
  }
  if (
    !projectedRoutesEqual(
      shape.cards.map(({ label, path }) => ({ label, path })),
      expected,
    )
  ) {
    failures.push(
      `overview/routes: cards differ from canonical order (${
        shape.cards.map(({ label }) => label).join(", ")
      })`,
    );
  }
  for (const card of shape.cards) {
    if (!/^\d+\s+\S/.test(card.count)) {
      failures.push(
        `overview/routes: ${card.label} count is not labelled (${
          JSON.stringify(card.count)
        })`,
      );
    }
    if (card.action === "" || card.path === catalogueRoutePaths.overview) {
      failures.push(
        `overview/routes: ${card.label} lacks a direct bounded action`,
      );
    }
  }
  if (shape.visibleImages !== 1 || !shape.imageSourceBacked) {
    failures.push(
      `overview/images: expected one generated representative image, found ${shape.visibleImages}`,
    );
  }
}

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
  await verifyLandingOrientation(page, origin, failures);
  await verifyOverviewDirectory(page, origin, failures);
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
      compactActionVisible: (document.querySelector<HTMLElement>(
        '.discern-site-header__actions a[href="/catalogue/components/"]',
      )?.getClientRects().length ?? 0) > 0,
      footerRouteLinks: [...document.querySelectorAll<HTMLElement>(
        '[data-discern-catalogue-navigation="landing-footer"] .discern-site-footer__nav > div:first-child a',
      )].filter((link) => link.getClientRects().length > 0).length,
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
    if (!narrow.compactActionVisible) {
      failures.push(
        "landing/reflow: narrow header lost its Find a Component action",
      );
    }
    if (narrow.footerRouteLinks !== catalogueNavigation.length) {
      failures.push(
        `landing/reflow: narrow footer exposes ${narrow.footerRouteLinks} of ${catalogueNavigation.length} Catalogue routes`,
      );
    }

    await page.goto(new URL(catalogueRoutePaths.overview, origin).href, {
      waitUntil: "networkidle",
    });
    await page.locator(".discern-catalogue-overview h1").waitFor();
    const overviewNarrow = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      primaryVisible: (document.querySelector<HTMLElement>(
        ".discern-catalogue-overview [data-discern-primary-catalogue-action]",
      )?.getClientRects().length ?? 0) > 0,
      routeLinks: [...document.querySelectorAll<HTMLElement>(
        ".discern-catalogue-overview [data-discern-catalogue-destination]",
      )].filter((link) => link.getClientRects().length > 0).length,
    }));
    if (overviewNarrow.overflow > 0) {
      failures.push(
        `overview/reflow: the document scrolls ${overviewNarrow.overflow}px horizontally at ${CATALOGUE_NARROW_VIEWPORT.width}px`,
      );
    }
    if (
      !overviewNarrow.primaryVisible ||
      overviewNarrow.routeLinks !== catalogueNavigation.length - 1
    ) {
      failures.push(
        `overview/reflow: primary visible=${overviewNarrow.primaryVisible}; route links=${overviewNarrow.routeLinks}`,
      );
    }
  });
  await page.emulateMedia({ colorScheme: null, reducedMotion: "reduce" });
  return scans;
}
