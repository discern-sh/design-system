import type { Page } from "playwright-core";
import {
  catalogueComponentPath,
  catalogueNavigation,
  catalogueRoutePaths,
} from "../../../catalogue/routes.ts";
import { scanBrowserAccessibility } from "../../browser-conformance-support.ts";
import { withViewport } from "../../viewport.ts";
import {
  verifyDecisionCopyEnrollment,
  verifyDecisionCopyLegibility,
} from "./metadata-copy.ts";
import {
  CATALOGUE_NARROW_VIEWPORT,
  CATALOGUE_WIDE_VIEWPORT,
  eventually,
  invariant,
  loadCataloguePage,
} from "./support.ts";

export interface CatalogueShellEvidence {
  readonly routeShapes: number;
  readonly axeScans: number;
  readonly drawerChecks: number;
  readonly navigationChecks: number;
  readonly searchChecks: number;
  readonly appearanceChecks: number;
  readonly reflowChecks: number;
  readonly metadataRoleChecks: number;
}

async function verifyNavigationState(
  page: Page,
  origin: string,
): Promise<number> {
  const url = new URL(catalogueRoutePaths.components, origin);
  url.searchParams.set("group", "layout");
  await loadCataloguePage(page, url.href);
  const state = await page.evaluate(() => {
    const navigation = document.querySelector<HTMLElement>(
      'nav[aria-label="Catalogue"]',
    );
    const primary = navigation?.querySelector<HTMLElement>(
      'a[href="/catalogue/components/"]',
    );
    const local = navigation?.querySelector<HTMLElement>(
      'a[href*="group=layout"]',
    );
    const badge = local?.querySelector<HTMLElement>("small");
    const visual = (node: HTMLElement | null | undefined) => {
      if (node == null) return undefined;
      const style = getComputedStyle(node);
      return {
        background: style.backgroundColor,
        borderWidth: style.borderInlineStartWidth,
        color: style.color,
        fontWeight: style.fontWeight,
        textDecoration: style.textDecorationLine,
      };
    };
    return {
      sharedComponent: navigation?.classList.contains("discern-docs-nav") ??
        false,
      primaryCurrent: primary?.getAttribute("aria-current"),
      localCurrent: local?.getAttribute("aria-current"),
      primary: visual(primary),
      local: visual(local),
      badgeDecoration: badge == null
        ? undefined
        : getComputedStyle(badge).textDecorationLine,
    };
  });
  invariant(
    state.sharedComponent,
    "Catalogue navigation bypassed the public DocsNav component",
  );
  invariant(
    state.primaryCurrent === "page" && state.localCurrent === "location",
    `Catalogue navigation lost page/location semantics: ${
      JSON.stringify(state)
    }`,
  );
  invariant(
    state.primary !== undefined && state.local !== undefined &&
      state.primary.background === state.local.background &&
      state.primary.color === state.local.color &&
      state.primary.fontWeight === state.local.fontWeight,
    `Catalogue current rows do not share one visual state: ${
      JSON.stringify(state)
    }`,
  );
  invariant(
    state.primary?.borderWidth === "0px" &&
      state.local?.borderWidth === "0px",
    `Catalogue current rows restored an active border rail: ${
      JSON.stringify(state)
    }`,
  );
  invariant(
    state.primary?.textDecoration === "none" &&
      state.local?.textDecoration === "none" &&
      state.badgeDecoration === "none",
    `Catalogue current rows restored an underlined label or badge: ${
      JSON.stringify(state)
    }`,
  );
  return 5;
}

async function verifyRouteShape(page: Page, origin: string): Promise<number> {
  const paths = [
    ...catalogueNavigation.map(({ path }) => path),
    catalogueComponentPath("command"),
    catalogueComponentPath("missing-future-component"),
  ];
  for (const path of paths) {
    await loadCataloguePage(page, new URL(path, origin).href);
    const shape = await page.evaluate(() => ({
      headings: document.querySelectorAll("main h1").length,
      mains: document.querySelectorAll("main").length,
      catalogueNavigations: document.querySelectorAll(
        'nav[aria-label="Catalogue"]',
      ).length,
    }));
    invariant(shape.headings === 1, `${path} rendered ${shape.headings} h1s`);
    invariant(
      shape.mains === 1,
      `${path} rendered ${shape.mains} main landmarks`,
    );
    invariant(
      shape.catalogueNavigations === 1,
      `${path} rendered ${shape.catalogueNavigations} Catalogue navigations`,
    );
  }
  return paths.length;
}

async function verifyReflowAndAccessibility(
  page: Page,
  origin: string,
): Promise<{ readonly reflow: number; readonly scans: number }> {
  let reflow = 0;
  let scans = 0;
  for (
    const viewport of [CATALOGUE_WIDE_VIEWPORT, CATALOGUE_NARROW_VIEWPORT]
  ) {
    await withViewport(page, viewport, async () => {
      for (const theme of ["light", "dark"] as const) {
        const url = new URL(catalogueRoutePaths.overview, origin);
        url.searchParams.set("theme", theme);
        await loadCataloguePage(page, url.href);
        const overflow = await page.evaluate(() =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
        );
        invariant(
          overflow <= 0,
          `Catalogue scrolls ${overflow}px horizontally at ${viewport.width}px/${theme}`,
        );
        reflow += 1;
        const accessibility = await scanBrowserAccessibility(
          page,
          ".discern-catalogue-shell",
        );
        invariant(
          accessibility.violations.length === 0,
          `Catalogue shell ${viewport.width}px/${theme} failed accessibility: ${
            accessibility.violations.map(({ id }) => id).join(", ")
          }`,
        );
        scans += 1;
      }
    });
  }
  return { reflow, scans };
}

async function verifySkipLink(page: Page, origin: string): Promise<void> {
  await loadCataloguePage(
    page,
    new URL(catalogueRoutePaths.overview, origin).href,
  );
  const firstInteractive = await page.evaluate(() => {
    const selector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");
    return document.querySelector<HTMLElement>(selector)?.className ?? "";
  });
  invariant(
    String(firstInteractive).includes("discern-skip-link"),
    `Catalogue's first interactive element is ${String(firstInteractive)}`,
  );
  const skip = page.getByRole("link", { name: "Skip to content" });
  await skip.focus();
  await skip.press("Enter");
  await eventually(
    () =>
      page.locator("#discern-catalogue-main").evaluate((node) =>
        document.activeElement === node
      ),
    "Skip link did not focus the stable main-content target",
  );
}

async function verifyDrawer(page: Page, origin: string): Promise<number> {
  return await withViewport(page, CATALOGUE_NARROW_VIEWPORT, async () => {
    await loadCataloguePage(
      page,
      new URL(catalogueRoutePaths.overview, origin).href,
    );
    const trigger = page.getByRole("button", {
      name: "Open Catalogue navigation",
    });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Catalogue navigation" });
    await dialog.waitFor();
    invariant(
      await page.getByRole("button", {
        name: "Close Catalogue navigation",
      }).count() === 1,
      "Drawer must expose one announced close action",
    );
    await eventually(
      () =>
        page.getByRole("button", {
          name: "Close Catalogue navigation",
        }).evaluate((node) => document.activeElement === node),
      "Drawer did not place initial focus on its Close action",
    );
    const modalState = await page.evaluate(() => ({
      overflow: document.body.style.overflow,
      background: [...document.querySelectorAll<HTMLElement>(
        "[data-discern-drawer-background]",
      )].map(({ inert }) => inert),
    }));
    invariant(
      modalState.overflow === "hidden",
      "Drawer did not lock body scroll",
    );
    invariant(
      modalState.background.length >= 3 &&
        modalState.background.every(Boolean),
      "Drawer did not make every marked background surface inert",
    );

    const first = dialog.getByRole("link", { name: /discern/i }).first();
    const last = dialog.getByRole("link", { name: /Interface builder/i });
    await first.focus();
    await first.press("Shift+Tab");
    invariant(
      await last.evaluate((node) => document.activeElement === node),
      "Shift+Tab escaped the start of the drawer",
    );
    await last.press("Tab");
    invariant(
      await first.evaluate((node) => document.activeElement === node),
      "Tab escaped the end of the drawer",
    );
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    invariant(
      await trigger.evaluate((node) => document.activeElement === node),
      "Escape did not restore the drawer trigger",
    );

    await trigger.click();
    const backdrop = page.locator(".discern-catalogue-nav-backdrop");
    const backdropBox = await backdrop.boundingBox();
    invariant(backdropBox !== null, "Drawer backdrop has no clickable bounds");
    await backdrop.click({
      position: {
        x: backdropBox.width - 8,
        y: backdropBox.height / 2,
      },
    });
    await dialog.waitFor({ state: "hidden" });
    invariant(
      await trigger.evaluate((node) => document.activeElement === node),
      "Backdrop dismissal did not restore the drawer trigger",
    );
    return 8;
  });
}

async function verifySearch(
  page: Page,
  origin: string,
): Promise<{ readonly checks: number; readonly metadataRoles: number }> {
  let metadataRoles = 0;
  await loadCataloguePage(
    page,
    new URL(catalogueRoutePaths.overview, origin).href,
  );
  const trigger = page.getByRole("button", { name: "Find in the Catalogue" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Search the Catalogue" });
  const input = dialog.getByRole("searchbox", { name: "Search the Catalogue" });
  invariant(
    await input.evaluate((node) => document.activeElement === node),
    "Global search did not focus its input",
  );
  const starts = await dialog.locator(".discern-search-palette__result-title")
    .allTextContents();
  invariant(
    JSON.stringify(starts) === JSON.stringify([
      "Components",
      "Foundations",
      "Compositions",
    ]),
    `Empty search starts differ from route authority: ${starts.join(", ")}`,
  );

  await input.fill("marketing site");
  const reason = dialog.locator(".discern-catalogue-search-match", {
    hasText: "Matched purpose",
  }).first();
  invariant(
    (await reason.textContent())?.includes("Matched purpose") === true,
    "Supporting global search match did not explain its purpose field",
  );
  await verifyDecisionCopyEnrollment(
    dialog,
    ".discern-catalogue-search-match",
    "Global search match reasons",
  );
  metadataRoles += await verifyDecisionCopyLegibility(
    dialog,
    "Global search match metadata",
  );
  await input.fill("nothing resembles this query");
  invariant(
    await dialog.getByRole("link", { name: "View all Components" }).count() ===
        1 &&
      await dialog.getByRole("button", { name: "Clear search" }).count() === 1,
    "No-result posture lacks direct recovery actions",
  );
  await verifyDecisionCopyEnrollment(
    dialog,
    ".discern-catalogue-search-recovery p",
    "Global search recovery explanation",
  );
  metadataRoles += await verifyDecisionCopyLegibility(
    dialog,
    "Global search recovery metadata",
  );
  await dialog.getByRole("button", { name: "Clear search" }).click();
  invariant(
    await input.inputValue() === "",
    "Clear search did not reset the query",
  );
  await dialog.getByRole("button", {
    name: "Close search the catalogue",
  }).click();
  await dialog.waitFor({ state: "hidden" });
  invariant(
    await trigger.evaluate((node) => document.activeElement === node),
    "Search Close did not restore its trigger",
  );

  await trigger.click();
  await input.fill("call to action");
  const cta = dialog.locator(
    `.discern-search-palette__result[href="${
      catalogueComponentPath("cta-band")
    }"]`,
  );
  invariant(await cta.count() === 1, "Call to action did not find CTA band");
  invariant(
    (await cta.locator(".discern-catalogue-search-match").textContent())
      ?.includes("Matched alias: call to action") === true,
    "Global alias match did not explain why call to action found CTA band",
  );
  await cta.click();
  await page.locator('[data-discern-component="cta-band"] h1').waitFor();
  invariant(
    new URL(page.url()).pathname === catalogueComponentPath("cta-band"),
    "Global search did not route directly to CTA band",
  );
  return { checks: 8, metadataRoles };
}

async function verifyAppearance(page: Page, origin: string): Promise<number> {
  await page.evaluate(() => {
    localStorage.removeItem("discern-catalogue-accent-hue");
    localStorage.removeItem("discern-catalogue-theme");
  });
  const url = new URL(catalogueRoutePaths.overview, origin);
  url.searchParams.set("theme", "light");
  await loadCataloguePage(page, url.href);
  const appearance = page.locator(
    '.discern-catalogue-appearance > summary[aria-label="Change appearance"]',
  );
  await appearance.click();
  const accent = page.getByRole("combobox", {
    name: "Accent review preset",
  });
  invariant(
    await accent.locator("option").count() >= 10,
    "Appearance does not expose a representative safe preset range",
  );
  invariant(
    await page.getByText(/full colour spectrum/i).count() === 1,
    "Appearance does not explain full-spectrum coordinated consumer themes",
  );
  const accentStyle = await accent.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      appearance: style.appearance,
      height: node.getBoundingClientRect().height,
      publicControl: node.classList.contains("discern-control") &&
        node.parentElement?.classList.contains("discern-select") === true,
    };
  });
  invariant(
    accentStyle.publicControl && accentStyle.appearance === "none" &&
      accentStyle.height >= 42,
    `Appearance bypassed the public Select contract: ${
      JSON.stringify(accentStyle)
    }`,
  );
  await accent.selectOption("violet");
  invariant(
    await accent.inputValue() === "violet",
    "Accent preset did not update",
  );
  invariant(
    new URL(page.url()).searchParams.get("accent") === "violet",
    "Accent preset did not update the shareable URL",
  );
  invariant(
    await page.evaluate(() =>
      localStorage.getItem("discern-catalogue-accent-hue") === "violet"
    ),
    "Accent preset did not persist",
  );
  await page.getByRole("button", { name: "Switch to the dark theme" }).click();
  await eventually(
    () =>
      page.locator(".discern-catalogue-shell").getAttribute(
        "data-discern-theme",
      ).then((theme) => theme === "dark"),
    "Appearance Theme control did not update the shell",
  );
  invariant(
    new URL(page.url()).searchParams.get("theme") === "dark",
    "Appearance Theme control left stale URL state",
  );
  await page.reload({ waitUntil: "networkidle" });
  invariant(
    await page.locator(".discern-catalogue-shell").getAttribute(
      "data-discern-theme",
    ) === "dark",
    "Shareable dark Appearance did not survive reload",
  );
  await appearance.click();
  invariant(
    await page.getByRole("combobox", {
      name: "Accent review preset",
    }).inputValue() ===
      "violet",
    "Persisted accent preset did not restore",
  );

  await page.evaluate(() => {
    const previous = new URL(location.href);
    previous.searchParams.set("theme", "light");
    history.pushState(history.state, "", previous);
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await eventually(
    () =>
      page.locator(".discern-catalogue-shell").getAttribute(
        "data-discern-theme",
      ).then((theme) => theme === "light"),
    "Appearance did not restore a Back/Forward URL state",
  );
  await page.goBack({ waitUntil: "networkidle" });
  await eventually(
    () =>
      page.locator(".discern-catalogue-shell").getAttribute(
        "data-discern-theme",
      ).then((theme) => theme === "dark"),
    "Back did not restore the previous Appearance state",
  );
  await page.evaluate(() => {
    localStorage.removeItem("discern-catalogue-accent-hue");
    localStorage.removeItem("discern-catalogue-theme");
  });
  return 11;
}

async function verifyPopulationPostures(
  page: Page,
  origin: string,
): Promise<void> {
  await loadCataloguePage(
    page,
    new URL(catalogueRoutePaths.components, origin).href,
  );
  invariant(
    await page.locator("[data-discern-component]").count() === 0,
    "Component explorer mounted specimen populations",
  );
  await loadCataloguePage(
    page,
    new URL(catalogueRoutePaths.compare, origin).href,
  );
  invariant(
    await page.locator("[data-discern-component]").count() === 0,
    "Unscoped Compare mounted specimen populations",
  );
  const compare = new URL(catalogueRoutePaths.compare, origin);
  compare.searchParams.set("group", "core");
  await loadCataloguePage(page, compare.href);
  invariant(
    await page.locator("[data-discern-component]").count() > 0,
    "Deliberately scoped Compare did not render specimens",
  );
  const detail = new URL(catalogueComponentPath("command"), origin);
  await loadCataloguePage(page, detail.href);
  invariant(
    await page.locator("details[open]").count() === 0,
    "Supporting Component disclosures opened by default",
  );
}

/** Exercise the shared Catalogue shell as a human-facing browser contract. */
export async function verifyCatalogueShell(
  page: Page,
  origin: string,
): Promise<CatalogueShellEvidence> {
  const routeShapes = await verifyRouteShape(page, origin);
  const accessibility = await verifyReflowAndAccessibility(page, origin);
  await verifySkipLink(page, origin);
  const drawerChecks = await verifyDrawer(page, origin);
  const navigationChecks = await verifyNavigationState(page, origin);
  const searchChecks = await verifySearch(page, origin);
  const appearanceChecks = await verifyAppearance(page, origin);
  await verifyPopulationPostures(page, origin);
  return {
    routeShapes,
    axeScans: accessibility.scans,
    drawerChecks,
    navigationChecks,
    searchChecks: searchChecks.checks,
    appearanceChecks,
    reflowChecks: accessibility.reflow,
    metadataRoleChecks: searchChecks.metadataRoles,
  };
}
