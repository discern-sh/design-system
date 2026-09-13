import type { Page } from "playwright-core";
import {
  catalogueComponentPath,
  catalogueNavigation,
  catalogueRoutePaths,
  foundationsPaths,
} from "../../../catalogue/routes.ts";
import {
  catalogueAppearanceStorageKey,
  legacyCatalogueAppearanceStorageKeys,
} from "../../../catalogue/shell/appearance-state.ts";
import { scanBrowserAccessibility } from "../../browser-conformance-support.ts";
import { withViewport } from "../../viewport.ts";
import {
  verifyDecisionCopyEnrollment,
  verifyDecisionCopyLegibility,
} from "./metadata-copy.ts";
import {
  CATALOGUE_NARROW_VIEWPORT,
  CATALOGUE_WIDE_VIEWPORT,
  catalogueSearchResult,
  eventually,
  invariant,
  loadCataloguePage,
  openCatalogueAppearanceAxes,
  setCatalogueAppearanceInput,
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
      'a[href^="/catalogue/components/"]',
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
  const trigger = page.getByRole("button", { name: "Search the Catalogue" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Search the Catalogue" });
  const input = dialog.getByRole("searchbox", { name: "Search the Catalogue" });
  invariant(
    await input.evaluate((node) => document.activeElement === node),
    "Global search did not focus its input",
  );
  const starts = await dialog.locator(".discern-search-palette__result-title")
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const copy = node.cloneNode(true) as HTMLElement;
        copy.querySelector('[aria-hidden="true"]')?.remove();
        return copy.textContent;
      })
    );
  const expectedStarts = catalogueNavigation.slice(1, 4).map(({ label }) =>
    label
  );
  invariant(
    JSON.stringify(starts) === JSON.stringify(expectedStarts),
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
      await dialog.getByRole("link", { name: "Browse Glyphs" }).count() === 1 &&
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
  const cta = catalogueSearchResult(page, catalogueComponentPath("cta-band"));
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

async function appearanceRootState(page: Page) {
  return await page.locator(".discern-catalogue-shell").evaluate((root) => {
    const style = getComputedStyle(root);
    return {
      accent: root.hasAttribute("data-discern-accent"),
      theme: root.getAttribute("data-discern-theme"),
      hue: style.getPropertyValue("--discern-accent-hue").trim(),
      darkness: style.getPropertyValue("--discern-darkness").trim(),
      structure: style.getPropertyValue("--discern-structure").trim(),
      emphasis: style.getPropertyValue("--discern-emphasis").trim(),
      density: style.getPropertyValue("--discern-density").trim(),
    };
  });
}

async function verifyAppearance(page: Page, origin: string): Promise<number> {
  let checks = 0;
  await page.evaluate(
    (keys) => keys.forEach((key) => localStorage.removeItem(key)),
    [
      catalogueAppearanceStorageKey,
      ...Object.values(legacyCatalogueAppearanceStorageKeys),
    ],
  );

  for (
    const path of [
      catalogueRoutePaths.overview,
      catalogueComponentPath("button"),
      `${catalogueRoutePaths.compare}?group=core`,
      catalogueRoutePaths.foundations,
    ]
  ) {
    const route = new URL(path, origin);
    route.searchParams.set("theme", "light");
    route.searchParams.set("accent", "none");
    route.searchParams.set("field", "0,1,1,1");
    await loadCataloguePage(page, route.href);
    await openCatalogueAppearanceAxes(page);
    invariant(
      await page.locator(
            ".discern-catalogue-appearance [data-discern-axis]",
          ).count() === 4 &&
        await page.getByRole("slider", { name: "Accent hue slider" })
            .count() ===
          0 &&
        await page.getByRole("combobox", { name: "Accent" }).count() === 1,
      `${path} does not expose the complete global Appearance control`,
    );
    checks += 1;
  }

  const buttonUrl = new URL(catalogueComponentPath("button"), origin);
  buttonUrl.searchParams.set("theme", "light");
  buttonUrl.searchParams.set("accent", "145.5");
  buttonUrl.searchParams.set("field", "0.25,1,0.8,1");
  await loadCataloguePage(page, buttonUrl.href);
  await page.getByRole("radio", { name: "All 5", exact: true }).check();
  await openCatalogueAppearanceAxes(page);
  const primary = page.locator("main .discern-button--primary").first();
  const secondary = page.locator("main .discern-button--secondary").first();
  const density = page.locator(
    '.discern-catalogue-appearance [data-discern-axis="density"] input[type="range"]',
  );
  const structure = page.locator(
    '.discern-catalogue-appearance [data-discern-axis="structure"] input[type="range"]',
  );
  const darkness = page.locator(
    '.discern-catalogue-appearance [data-discern-axis="darkness"] input[type="range"]',
  );
  const emphasis = page.locator(
    '.discern-catalogue-appearance [data-discern-axis="emphasis"] input[type="range"]',
  );
  const buttonMeasure = async () =>
    await primary.evaluate((node) => {
      const style = getComputedStyle(node);
      const root = getComputedStyle(
        node.closest("[data-discern-root]") as HTMLElement,
      );
      return {
        blockSize: node.getBoundingClientRect().height,
        fontSize: style.fontSize,
        paddingInline: style.paddingInlineStart,
        xs: root.getPropertyValue("--discern-font-size-xs").trim(),
      };
    });
  await setCatalogueAppearanceInput(density, 0.5);
  const compact = await buttonMeasure();
  await setCatalogueAppearanceInput(density, 2);
  const airy = await buttonMeasure();
  invariant(
    compact.paddingInline !== airy.paddingInline &&
      compact.fontSize === airy.fontSize &&
      compact.xs === airy.xs &&
      compact.blockSize >= 40 && airy.blockSize >= 40,
    `Density did not change Button spacing while preserving text/touch floors: ${
      JSON.stringify({ compact, airy })
    }`,
  );
  checks += 1;

  await setCatalogueAppearanceInput(structure, 0);
  const flat = await Promise.all([
    primary.evaluate((node) => getComputedStyle(node).boxShadow),
    secondary.evaluate((node) => getComputedStyle(node).borderColor),
  ]);
  await setCatalogueAppearanceInput(structure, 2);
  const strong = await Promise.all([
    primary.evaluate((node) => getComputedStyle(node).boxShadow),
    secondary.evaluate((node) => getComputedStyle(node).borderColor),
  ]);
  await primary.focus();
  const focus = await primary.evaluate((node) => {
    const style = getComputedStyle(node);
    return { outline: style.outlineColor, shadow: style.boxShadow };
  });
  invariant(
    JSON.stringify(flat) !== JSON.stringify(strong) &&
      focus.outline !== "rgba(0, 0, 0, 0)",
    `Structure did not change real Button edges/shadows with focus intact: ${
      JSON.stringify({ flat, strong, focus })
    }`,
  );
  checks += 1;

  await openCatalogueAppearanceAxes(page);
  const buttonColours = async () => ({
    primary: await primary.evaluate((node) =>
      getComputedStyle(node).backgroundColor
    ),
    secondary: await secondary.evaluate((node) =>
      getComputedStyle(node).backgroundColor
    ),
    accentSoft: await page.locator(".discern-catalogue-shell").evaluate(
      (node) =>
        getComputedStyle(node).getPropertyValue("--discern-color-accent-100")
          .trim(),
    ),
  });
  const darknessColours: string[] = [];
  for (const value of [0.2, 0.5, 0.8]) {
    await setCatalogueAppearanceInput(darkness, value);
    darknessColours.push(JSON.stringify(await buttonColours()));
  }
  invariant(
    new Set(darknessColours).size === darknessColours.length,
    `Accent roles did not move continuously with Darkness: ${darknessColours}`,
  );
  await setCatalogueAppearanceInput(emphasis, 0.6);
  const quiet = await buttonColours();
  await setCatalogueAppearanceInput(emphasis, 1.4);
  const vivid = await buttonColours();
  invariant(
    quiet.accentSoft !== vivid.accentSoft,
    `Accent soft roles did not move with Emphasis: ${
      JSON.stringify({ quiet, vivid })
    }`,
  );
  checks += 2;

  const hue = page.getByRole("spinbutton", { name: "Hue" });
  const hueColours = new Map<number, string>();
  for (const value of [0, 360, 145.5, 20]) {
    await setCatalogueAppearanceInput(hue, value);
    hueColours.set(
      value,
      await primary.evaluate((node) => {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const context = canvas.getContext("2d");
        if (context == null) return "unpainted";
        context.fillStyle = getComputedStyle(node).backgroundColor;
        context.fillRect(0, 0, 1, 1);
        return Array.from(context.getImageData(0, 0, 1, 1).data).join(",");
      }),
    );
  }
  invariant(
    hueColours.get(0) === hueColours.get(360) &&
      hueColours.get(0) !== hueColours.get(145.5) &&
      hueColours.get(145.5) !== hueColours.get(20),
    `Arbitrary numeric Accent hues did not reach real Buttons: ${
      JSON.stringify(Object.fromEntries(hueColours))
    }`,
  );
  const fieldBeforeHueShortcut = new URL(page.url()).searchParams.get("field");
  await page.getByRole("combobox", { name: "Accent" }).selectOption(
    "violet",
  );
  const afterNamedHue = new URL(page.url());
  invariant(
    afterNamedHue.searchParams.get("accent") === "300" &&
      page.url().includes("appearance=") === false &&
      afterNamedHue.searchParams.get("field") === fieldBeforeHueShortcut,
    "Named hue shortcut did not set numeric 300 while preserving axes",
  );
  checks += 2;

  const palette = page.getByRole("combobox", { name: "Accent" });
  const fieldBeforePalette = afterNamedHue.searchParams.get("field");
  await palette.selectOption("none");
  invariant(
    new URL(page.url()).searchParams.get("accent") === "none" &&
      await page.getByRole("slider", { name: "Accent hue slider" }).count() ===
        0,
    "Monochrome did not retire the hue controls",
  );
  await palette.selectOption("custom");
  const afterPalette = new URL(page.url());
  invariant(
    afterPalette.searchParams.get("accent") === "300" &&
      afterPalette.searchParams.get("field") === fieldBeforePalette,
    "Accent → monochrome → Accent erased the remembered hue or axes",
  );
  await setCatalogueAppearanceInput(density, 1.3);
  const afterAxis = new URL(page.url());
  invariant(
    afterAxis.searchParams.get("accent") === "300",
    "Moving an axis erased the Accent hue",
  );
  checks += 2;

  await page.reload({ waitUntil: "networkidle" });
  const reloaded = await appearanceRootState(page);
  invariant(
    reloaded.accent && reloaded.hue === "300" &&
      reloaded.density === "1.3",
    `Canonical Appearance did not survive reload: ${JSON.stringify(reloaded)}`,
  );
  const stored = await page.evaluate(
    (key) => localStorage.getItem(key),
    catalogueAppearanceStorageKey,
  );
  invariant(
    stored?.includes("accent=300") === true && stored.includes("field="),
    `Orthogonal Appearance state did not persist canonically: ${stored}`,
  );
  const exactBeforeNavigation = new URL(page.url());
  await page.locator('nav[aria-label="Catalogue"]').getByRole("link", {
    name: "Foundations",
    exact: true,
  }).click();
  const navigated = new URL(page.url());
  for (const name of ["theme", "accent", "field"]) {
    invariant(
      navigated.searchParams.get(name) ===
        exactBeforeNavigation.searchParams.get(name),
      `Local navigation lost Appearance parameter ${name}`,
    );
  }
  await page.goBack({ waitUntil: "networkidle" });
  invariant(
    new URL(page.url()).searchParams.get("field") ===
      exactBeforeNavigation.searchParams.get("field"),
    "Back did not restore the exact field point",
  );
  checks += 3;

  const legacyAccent = new URL(catalogueComponentPath("button"), origin);
  legacyAccent.searchParams.set("accent", "violet");
  await loadCataloguePage(page, legacyAccent.href);
  await eventually(
    () =>
      Promise.resolve(
        new URL(page.url()).searchParams.get("accent") === "300",
      ),
    "Legacy named Accent URL did not migrate",
  );
  const migratedAccent = new URL(page.url());
  const systemField = await page.evaluate(() =>
    matchMedia("(prefers-color-scheme: dark)").matches ? "1,1,1,1" : "0,1,1,1"
  );
  invariant(
    migratedAccent.searchParams.get("theme") === "system" &&
      migratedAccent.searchParams.get("accent") === "300" &&
      migratedAccent.searchParams.get("field") === systemField,
    `Legacy named Accent migration is incomplete: ${migratedAccent}`,
  );
  const legacyField = new URL(foundationsPaths.appearance, origin);
  legacyField.searchParams.set("field", "0.6,1.4,0.7,0.8,blue");
  await loadCataloguePage(page, legacyField.href);
  invariant(
    !new URL(page.url()).searchParams.has("appearance") &&
      new URL(page.url()).searchParams.get("accent") === "255" &&
      new URL(page.url()).searchParams.get("field") === "0.6,1.4,0.7,0.8",
    `Legacy blue Field migration is incomplete: ${page.url()}`,
  );
  checks += 2;

  await openCatalogueAppearanceAxes(page);
  const darknessControls = page.locator(
    '[data-discern-axis="darkness"] input[type="range"]',
  );
  invariant(
    await darknessControls.count() === 2,
    "Field page and global control do not share the same axis projection",
  );
  await setCatalogueAppearanceInput(darknessControls.first(), 0.35);
  await eventually(
    async () => await darknessControls.nth(1).inputValue() === "0.35",
    "Field page and header axis controls fell out of sync",
  );
  const scopeEvidence = await page.locator("[data-discern-scope-demo]")
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const nested = node.querySelector<HTMLElement>(
          ".discern-catalogue-appearance-scope__nested",
        )!;
        const parentStyle = getComputedStyle(node);
        const nestedStyle = getComputedStyle(nested);
        const parentRegion = node.querySelector<HTMLElement>(
          ":scope > .discern-catalogue-appearance-scope__specimen > div:first-child",
        );
        const parentAction = parentRegion?.querySelector<HTMLElement>(
          ".discern-button--primary, .discern-avatar",
        );
        const nestedAction = nested.querySelector<HTMLElement>(
          ".discern-button--primary, .discern-button--secondary, .discern-avatar",
        );
        const paint = (action: HTMLElement | null | undefined) => {
          if (action == null) return "";
          const style = getComputedStyle(action);
          return [
            style.backgroundColor,
            style.backgroundImage,
            style.borderColor,
            style.color,
          ].join("|");
        };
        return {
          id: node.getAttribute("data-discern-scope-demo"),
          parentAccent: node.getAttribute("data-discern-accent"),
          childAccent: nested.getAttribute("data-discern-accent"),
          structure: nestedStyle.getPropertyValue("--discern-structure").trim(),
          density: nestedStyle.getPropertyValue("--discern-density").trim(),
          parentPaint: paint(parentAction),
          childPaint: paint(nestedAction),
          parentHue: parentStyle.getPropertyValue("--discern-accent-hue")
            .trim(),
          childHue: nestedStyle.getPropertyValue("--discern-accent-hue").trim(),
        };
      })
    );
  invariant(
    JSON.stringify(scopeEvidence.map(({ id }) => id)) === JSON.stringify([
          "mono-to-accent-255",
          "accent-120-to-mono",
          "accent-245-to-accent-335",
        ]) &&
      scopeEvidence.every(({ structure, density }) =>
        structure === "1.4" && density === "0.8"
      ) &&
      scopeEvidence.every(({ parentPaint, childPaint }) =>
        parentPaint !== childPaint
      ) &&
      scopeEvidence[2]?.parentHue === "245" &&
      scopeEvidence[2]?.childHue === "335",
    `Symmetric scope demonstrations lost roles or inherited axes: ${
      JSON.stringify(scopeEvidence)
    }`,
  );
  checks += 2;

  const primaryShadow = await page.goto(
    new URL(catalogueComponentPath("button"), origin).href,
    { waitUntil: "networkidle" },
  ).then(() =>
    page.locator("main .discern-button--primary").first().evaluate((node) =>
      getComputedStyle(node).boxShadow
    )
  );
  invariant(
    primaryShadow !== "none",
    "The real primary Button example lost the 1A action shadow",
  );
  await loadCataloguePage(
    page,
    new URL(catalogueComponentPath("avatar-group"), origin).href,
  );
  const avatarOpacity = await page.locator("main .discern-avatar").first()
    .evaluate((node) => getComputedStyle(node).opacity);
  invariant(
    avatarOpacity === "1",
    `The real AvatarGroup example retained faded Avatar opacity ${avatarOpacity}`,
  );
  checks += 2;

  await withViewport(page, { width: 320, height: 640 }, async () => {
    await loadCataloguePage(
      page,
      new URL(catalogueRoutePaths.overview, origin).href,
    );
    const summary = page.locator(".discern-catalogue-appearance > summary");
    await summary.focus();
    await summary.press("Enter");
    const axes = page.getByRole("button", { name: /Axes/ });
    await axes.focus();
    await axes.press("Enter");
    const darknessSlider = page.locator(
      '.discern-catalogue-appearance [data-discern-axis="darkness"] input[type="range"]',
    );
    const before = await darknessSlider.inputValue();
    await darknessSlider.focus();
    await darknessSlider.press("ArrowRight");
    const panel = await page.locator(".discern-catalogue-appearance__panel")
      .evaluate((node) => {
        const bounds = node.getBoundingClientRect();
        return {
          left: bounds.left,
          right: bounds.right,
          bottom: bounds.bottom,
          viewportWidth: innerWidth,
          viewportHeight: innerHeight,
          overflow: document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        };
      });
    invariant(
      await darknessSlider.inputValue() !== before &&
        panel.left >= 0 && panel.right <= panel.viewportWidth &&
        panel.bottom <= panel.viewportHeight && panel.overflow <= 0,
      `Keyboard/high-zoom Appearance panel is inoperable: ${
        JSON.stringify(panel)
      }`,
    );
  });
  await page.emulateMedia({ forcedColors: "active" });
  await loadCataloguePage(
    page,
    new URL(catalogueRoutePaths.overview, origin).href,
  );
  await openCatalogueAppearanceAxes(page);
  const forcedPanel = await page.locator(".discern-catalogue-appearance__panel")
    .evaluate((node) => ({
      border: getComputedStyle(node).borderColor,
      visible: node.getClientRects().length > 0,
    }));
  invariant(
    forcedPanel.visible && forcedPanel.border !== "rgba(0, 0, 0, 0)",
    `Forced-colour Appearance panel lost its boundary: ${
      JSON.stringify(forcedPanel)
    }`,
  );
  await page.emulateMedia({ forcedColors: "none" });
  checks += 2;

  return checks;
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

/** Every instance of the shared Appearance disclosure must dismiss without hiding focus. */
export async function verifyAppearanceDismissal(
  page: Page,
  origin: string,
): Promise<void> {
  await loadCataloguePage(
    page,
    new URL(catalogueRoutePaths.overview, origin).href,
  );
  const panels = page.locator(".discern-catalogue-appearance");
  for (let index = 0; index < await panels.count(); index += 1) {
    const panel = panels.nth(index);
    const trigger = panel.locator(":scope > summary");
    await trigger.click();
    await panel.getByRole("combobox", { name: "Accent", exact: true }).focus();
    await page.keyboard.press("Escape");
    invariant(
      await panel.getAttribute("open") === null,
      "Appearance Escape did not dismiss",
    );
    invariant(
      await trigger.evaluate((node) => document.activeElement === node),
      "Appearance dismissal hid focus",
    );
    await trigger.click();
    await panel.getByRole("combobox", { name: "Accent", exact: true })
      .selectOption("violet");
    invariant(
      await panel.getAttribute("open") !== null,
      "Nested Appearance interaction dismissed its owner",
    );
    await page.locator("main h1").click();
    invariant(
      await panel.getAttribute("open") === null,
      "Appearance outside interaction did not dismiss",
    );
  }
}

/** A modal drawer crossing to desktop must retain a visible focused destination. */
export async function verifyDrawerResize(
  page: Page,
  origin: string,
): Promise<void> {
  await withViewport(page, { width: 390, height: 844 }, async () => {
    await loadCataloguePage(
      page,
      new URL(catalogueRoutePaths.components, origin).href,
    );
    await page.getByRole("button", { name: "Open Catalogue navigation" })
      .click();
    await page.getByRole("button", { name: "Close Catalogue navigation" })
      .focus();
    await withViewport(page, CATALOGUE_WIDE_VIEWPORT, async () => {
      await eventually(
        () =>
          page.evaluate(() =>
            document.activeElement instanceof HTMLElement &&
            document.activeElement !== document.body &&
            document.activeElement.getClientRects().length > 0
          ),
        "Resizing the open drawer hid focus",
      );
    });
    await eventually(
      () =>
        page.getByRole("button", { name: "Open Catalogue navigation" })
          .evaluate((node) => document.activeElement === node),
      "Returning to mobile hid the focused navigation destination",
    );
  });
}

/** Persistence failures must not disable live shell controls or canonical navigation. */
async function verifyShellWithoutStorage(
  page: Page,
  origin: string,
): Promise<void> {
  const context = await page.context().browser()!.newContext({
    reducedMotion: "reduce",
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  try {
    await context.addInitScript(() => {
      for (const method of ["getItem", "setItem", "removeItem"] as const) {
        Storage.prototype[method] = () => {
          throw new Error("Storage unavailable");
        };
      }
    });
    const isolated = await context.newPage();
    await loadCataloguePage(
      isolated,
      new URL("/catalogue/?theme=system&accent=none&field=0,1,1,1", origin)
        .href,
    );
    await isolated.getByRole("button", { name: "Open Catalogue navigation" })
      .tap();
    await isolated.getByRole("button", { name: "Close Catalogue navigation" })
      .tap();
    const appearance = isolated.locator(".discern-catalogue-appearance");
    await appearance.locator("summary").tap();
    await appearance.getByRole("combobox", { name: "Starting point" })
      .selectOption("tools");
    await isolated.emulateMedia({ colorScheme: "dark" });
    await eventually(
      () =>
        new URL(isolated.url()).searchParams.get("field") === "1,1.1,1,0.65",
      "System theme or preset failed without storage",
    );
    await appearance.locator("summary").press("Escape");
    await isolated.getByRole("button", {
      name: "Search the Catalogue",
      exact: true,
    }).click();
    await isolated.getByRole("searchbox").fill("button");
    await isolated.getByRole("searchbox").press("ArrowDown");
    await isolated.keyboard.press("Enter");
    await isolated.waitForURL((url) =>
      url.pathname === catalogueComponentPath("button")
    );
    invariant(
      new URL(isolated.url()).searchParams.get("field") === "1,1.1,1,0.65",
      "Search lost Appearance without storage",
    );
    await isolated.goBack({ waitUntil: "networkidle" });
    await isolated.goForward({ waitUntil: "networkidle" });
    invariant(
      new URL(isolated.url()).searchParams.get("field") === "1,1.1,1,0.65",
      "Forward lost exact Appearance without storage",
    );
  } finally {
    await context.close();
  }
}

/** Complete shell journeys at portrait, short landscape, and zoom-equivalent CSS widths. */
export async function verifyPolishedShell(
  page: Page,
  origin: string,
): Promise<void> {
  for (
    const viewport of [
      { width: 320, height: 640 },
      { width: 667, height: 320 },
      { width: 390, height: 844 },
      { width: 1440, height: 1000 },
    ]
  ) {
    await withViewport(page, viewport, async () => {
      await loadCataloguePage(
        page,
        new URL(
          "/catalogue/components/?group=layout&theme=dark&accent=245&field=1,1,1,1",
          origin,
        ).href,
      );
      const appearance = page.locator(".discern-catalogue-appearance");
      const trigger = appearance.locator(":scope > summary");
      const search = page.getByRole("button", {
        name: "Search the Catalogue",
        exact: true,
      });
      for (const control of [trigger, search]) {
        const box = await control.boundingBox();
        invariant(
          box && box.x >= 0 && box.x + box.width <= viewport.width &&
            box.height >= (viewport.width <= 850 ? 44 : 38),
          "Toolbar target clipped or too small",
        );
      }
      await trigger.click();
      await appearance.getByRole("combobox", { name: "Starting point" })
        .selectOption("reading");
      invariant(
        new URL(page.url()).searchParams.get("field") === "1,0.8,0.8,1.3" &&
          new URL(page.url()).searchParams.get("accent") === "245",
        "Reading preset changed theme/accent or lost coordinates",
      );
      await openCatalogueAppearanceAxes(page);
      const exact = appearance.getByRole("spinbutton", {
        name: "Density exact value",
      });
      await exact.fill("");
      invariant(
        new URL(page.url()).searchParams.get("field") === "1,0.8,0.8,1.3",
        "Empty exact input changed the field",
      );
      await exact.fill("99");
      await exact.press("Tab");
      invariant(
        await exact.inputValue() === "99" &&
          await exact.getAttribute("aria-invalid") === "true",
        "Invalid intermediate value snapped or lost feedback",
      );
      await exact.fill("0.875");
      await exact.press("Enter");
      invariant(
        new URL(page.url()).searchParams.get("field") === "1,0.8,0.8,0.875",
        "Exact entry did not commit a precise coordinate",
      );
      invariant(
        await appearance.locator(
          '[data-discern-axis="density"] input[type="range"]',
        ).inputValue() === "0.875",
        "Slider rounded the exact coordinate to a separate state",
      );
      await exact.fill("0.9");
      await exact.press("Escape");
      invariant(
        await exact.inputValue() === "0.875" &&
          await appearance.getAttribute("open") !== null,
        "Edit cancellation dismissed the enclosing panel",
      );
      await appearance.getByRole("button", {
        name: "Reset density",
        exact: true,
      }).click();
      invariant(
        await exact.inputValue() === "1",
        "Axis reset did not restore its default",
      );
      const link = appearance.getByRole("link", {
        name: "Inspect the Appearance projection",
      });
      await link.focus();
      const bounds = await link.boundingBox();
      invariant(
        bounds && bounds.y >= 0 && bounds.y + bounds.height <= viewport.height,
        "Focused Appearance content is hidden on a short screen",
      );
      await link.press("Escape");
      invariant(
        await trigger.evaluate((node) => document.activeElement === node),
        "Escape lost the Appearance trigger",
      );
      if (viewport.width <= 850) {
        await page.getByRole("button", { name: "Open Catalogue navigation" })
          .click();
      }
      const groups = page.getByRole("button", { name: "Groups", exact: true });
      if (await groups.getAttribute("aria-expanded") === "true") {
        await groups.click();
      }
      const current = page.locator(
        'nav[aria-label="Catalogue"] a[aria-current="location"]',
      );
      invariant(
        await current.isVisible() &&
          (await current.getAttribute("href"))?.includes("group=layout"),
        "Collapsed group hid the current destination",
      );
      if (viewport.width <= 850) {
        await groups.press("Escape");
        invariant(
          await page.getByRole("button", { name: "Open Catalogue navigation" })
            .evaluate((node) => document.activeElement === node),
          "Drawer close hid focus",
        );
      }
      await search.click();
      const dialog = page.getByRole("dialog", { name: "Search the Catalogue" });
      const input = dialog.getByRole("searchbox");
      await input.fill("button");
      invariant(
        await dialog.getByRole("region", { name: "Components", exact: true })
          .count() === 1,
        "Search did not group result families",
      );
      await input.press("ArrowDown");
      const focused = dialog.locator(".discern-search-palette__result:focus");
      const href = await focused.getAttribute("href");
      invariant(href !== null, "ArrowDown did not select a named destination");
      await focused.press("Enter");
      await page.waitForURL((url) =>
        url.pathname === new URL(href!, origin).pathname
      );
      await page.getByRole("button", {
        name: "Search the Catalogue",
        exact: true,
      }).click();
      const recent = page.getByRole("region", { name: "Recent destinations" });
      invariant(
        await recent.locator("a[href]").count() > 0,
        "Visited search destination did not appear in recents",
      );
      const dialogBounds = await dialog.boundingBox();
      invariant(
        dialogBounds && dialogBounds.y >= 0 &&
          dialogBounds.y + dialogBounds.height <= viewport.height,
        "Search dialog escaped the viewport",
      );
      await dialog.getByRole("button", { name: "Clear recent" }).click();
      invariant(
        await recent.count() === 0,
        "Clear recent left stale destinations",
      );
      invariant(
        await input.evaluate((node) => document.activeElement === node),
        "Clearing recents removed the focused control without a focus destination",
      );
      await input.press("Escape");
    });
  }
}

/** Exercise the shared Catalogue shell as a human-facing browser contract. */
export async function verifyCatalogueShell(
  page: Page,
  origin: string,
): Promise<CatalogueShellEvidence> {
  await verifyAppearanceDismissal(page, origin);
  await verifyPolishedShell(page, origin);
  await verifyDrawerResize(page, origin);
  await verifyShellWithoutStorage(page, origin);
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
