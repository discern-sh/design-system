import type { Page } from "playwright-core";
import { catalogueCliCapabilities } from "../../../catalogue/cli-preview.tsx";
import { catalogueRoutePaths } from "../../../catalogue/routes.ts";
import { terminalFoundationSheets } from "../../../catalogue/terminal-foundations.ts";
import { scanBrowserAccessibility } from "../../browser-conformance-support.ts";
import { withViewport } from "../../viewport.ts";
import {
  CATALOGUE_TERMINAL_VIEWPORT,
  eventually,
  invariant,
  loadCataloguePage,
} from "./support.ts";
import type { CatalogueTheme } from "./support.ts";

export interface TerminalCatalogueEvidence {
  readonly layouts: number;
  readonly profileChecks: number;
  readonly componentSpecimens: number;
  readonly foundationSheets: number;
  readonly foundationSpecimens: number;
  readonly animationChecks: number;
}

async function openAppearance(page: Page): Promise<void> {
  const disclosure = page.locator(".discern-catalogue-appearance");
  if (await disclosure.getAttribute("open") === null) {
    await disclosure.locator('summary[aria-label="Change appearance"]').click();
  }
}

async function verifyCliProjectionStyles(page: Page): Promise<void> {
  const style = await page.locator(".discern-catalogue-cli-output").first()
    .evaluate((node) => {
      const computed = getComputedStyle(node);
      return {
        fontFamily: computed.fontFamily,
        fontFeatureSettings: computed.fontFeatureSettings,
        fontVariantLigatures: computed.fontVariantLigatures,
        padding: computed.padding,
        whiteSpace: computed.whiteSpace,
      };
    });
  invariant(style.padding === "0px", "CLI projection must remain unpadded");
  invariant(
    style.fontFamily.includes("monospace"),
    "CLI projection must use a monospace cell font",
  );
  invariant(
    style.fontFeatureSettings.includes('"liga" 0') &&
      style.fontFeatureSettings.includes('"calt" 0'),
    "CLI projection must disable shaping features that move terminal cells",
  );
  invariant(
    style.fontVariantLigatures === "none",
    "CLI projection must disable font ligatures",
  );
  invariant(
    style.whiteSpace === "pre",
    "CLI projection must preserve terminal whitespace",
  );
}

async function verifyTerminalFoundationEnrollment(
  page: Page,
): Promise<
  {
    readonly sheets: number;
    readonly specimens: number;
    readonly animationChecks: number;
  }
> {
  const expectedSheets = terminalFoundationSheets.map(({ id }) => id);
  const actualSheets = await page.locator(
    "[data-discern-terminal-foundation]",
  ).evaluateAll((nodes) =>
    nodes.map((node) =>
      node.getAttribute("data-discern-terminal-foundation") ?? ""
    )
  );
  invariant(
    JSON.stringify(actualSheets) === JSON.stringify(expectedSheets),
    `Terminal foundation enrollment differs from its registry.\nExpected: ${
      expectedSheets.join(", ")
    }\nActual: ${actualSheets.join(", ")}`,
  );
  const navigationSheets = await page.locator(
    '.discern-catalogue-nav a[href^="#terminal-foundation-"]',
  ).evaluateAll((nodes) =>
    nodes.map((node) =>
      node.getAttribute("href")?.replace("#terminal-foundation-", "") ?? ""
    )
  );
  invariant(
    JSON.stringify(navigationSheets) === JSON.stringify(expectedSheets),
    `Terminal foundation navigation differs from its registry.\nExpected: ${
      expectedSheets.join(", ")
    }\nActual: ${navigationSheets.join(", ")}`,
  );

  const expectedSpecimens = terminalFoundationSheets.flatMap((sheet) =>
    sheet.specimens(catalogueCliCapabilities, { theme: "light" }).map((
      specimen,
    ) => `${sheet.id}:${specimen.id}`)
  );
  const actualSpecimens = await page.locator(
    "[data-discern-terminal-foundation-specimen]",
  ).evaluateAll((nodes) =>
    nodes.map((node) => {
      const sheet = node.closest<HTMLElement>(
        "[data-discern-terminal-foundation]",
      )?.dataset.discernTerminalFoundation ?? "";
      const specimen = (node as HTMLElement).dataset
        .discernTerminalFoundationSpecimen ?? "";
      return `${sheet}:${specimen}`;
    })
  );
  invariant(
    JSON.stringify(actualSpecimens) === JSON.stringify(expectedSpecimens),
    `Terminal foundation specimens differ from their registry.\nExpected: ${
      expectedSpecimens.join(", ")
    }\nActual: ${actualSpecimens.join(", ")}`,
  );

  await page.locator(".discern-catalogue-search").click();
  const searchDialog = page.getByRole("dialog", {
    name: "Search the Catalogue",
  });
  await searchDialog.locator(".discern-search-palette__input").fill("spinner");
  const motifResult = searchDialog.locator(
    `.discern-search-palette__result[href="${catalogueRoutePaths.foundations}#terminal-foundation-motifs"]`,
  );
  invariant(
    await motifResult.count() === 1,
    "Spinner search must resolve the Terminal motifs foundation",
  );
  invariant(
    (await motifResult.textContent())?.includes("Terminal foundation") === true,
    "Spinner search must identify its foundation context",
  );
  await motifResult.click();
  await searchDialog.waitFor({ state: "hidden" });

  const spinner = page.locator(
    '[data-discern-terminal-foundation="motifs"] ' +
      '[data-discern-terminal-foundation-specimen="spinner-phases"]',
  );
  const animation = spinner.locator("[data-discern-terminal-animation]");
  invariant(
    await animation.getAttribute("data-discern-terminal-animation") ===
      "paused",
    "Reduced motion must pause terminal foundation animation initially",
  );
  const liveOutput = animation.locator(".discern-catalogue-cli-output");
  const pausedFrame = await liveOutput.textContent();
  await page.waitForTimeout(180);
  invariant(
    await liveOutput.textContent() === pausedFrame,
    "Reduced-motion terminal animation advanced while paused",
  );
  await animation.getByRole("button", { name: "Play animation" }).click();
  await eventually(
    async () => await liveOutput.textContent() !== pausedFrame,
    "Terminal motif animation did not advance after Play",
  );
  await animation.getByRole("button", { name: "Pause animation" }).click();
  const accessibility = await scanBrowserAccessibility(
    page,
    "[data-discern-terminal-foundation]",
  );
  invariant(
    accessibility.violations.length === 0,
    `Terminal foundations failed accessibility: ${
      accessibility.violations.map(({ id }) => id).join(", ")
    }`,
  );
  return {
    sheets: actualSheets.length,
    specimens: actualSpecimens.length,
    animationChecks: 3,
  };
}

export async function verifyTerminalCatalogue(
  page: Page,
  origin: string,
): Promise<TerminalCatalogueEvidence> {
  return await withViewport(page, CATALOGUE_TERMINAL_VIEWPORT, async () => {
    const foundationsUrl = new URL(catalogueRoutePaths.foundations, origin);
    foundationsUrl.searchParams.set("theme", "light");
    await loadCataloguePage(page, foundationsUrl.href);

    const foundations = await verifyTerminalFoundationEnrollment(page);

    const terminalUrl = new URL(catalogueRoutePaths.terminal, origin);
    terminalUrl.searchParams.set("theme", "light");
    await loadCataloguePage(page, terminalUrl.href);

    const layouts = page.locator("[data-discern-cli-composition]");
    const layoutCount = await layouts.count();
    invariant(layoutCount > 0, "Terminal Catalogue needs a layout recipe");
    let profileChecks = 0;
    for (let layoutIndex = 0; layoutIndex < layoutCount; layoutIndex += 1) {
      const layout = layouts.nth(layoutIndex);
      const title = await layout.locator("h3").first().textContent() ??
        `layout ${layoutIndex + 1}`;
      const profiles = layout.locator(
        ".discern-catalogue-terminal-layout__profiles button",
      );
      const profileCount = await profiles.count();
      invariant(profileCount > 0, `${title} needs a viewport profile`);
      for (
        let profileIndex = 0;
        profileIndex < profileCount;
        profileIndex += 1
      ) {
        const profile = profiles.nth(profileIndex);
        const label = (await profile.textContent())?.trim() ??
          `profile ${profileIndex + 1}`;
        await profile.click();
        const viewport = layout.locator("[data-discern-terminal-viewport]");
        await viewport.waitFor();
        const width = await viewport.evaluate((node) => ({
          client: node.clientWidth,
          scroll: node.scrollWidth,
        }));
        invariant(
          width.scroll <= width.client,
          `${title} / ${label} has a redundant horizontal scrollbar: ` +
            `${width.client}px client / ${width.scroll}px content`,
        );
        profileChecks += 1;
      }
    }

    const inspectors = page.locator("[data-discern-terminal-theme]");
    const allTerminalLayoutsUse = async (
      theme: CatalogueTheme,
    ): Promise<boolean> => {
      const inspectorThemes = await inspectors.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-discern-terminal-theme"))
      );
      return inspectorThemes.length === layoutCount &&
        inspectorThemes.every((value) => value === theme);
    };
    invariant(
      await allTerminalLayoutsUse("light"),
      "Light mode did not reach every terminal layout",
    );
    await openAppearance(page);
    await page.getByRole("button", {
      name: "Switch to the dark theme",
    }).click();
    await eventually(
      async () => await allTerminalLayoutsUse("dark"),
      "Dark mode did not reach every terminal layout",
    );

    const reviewUrl = new URL(catalogueRoutePaths.review, origin);
    reviewUrl.searchParams.set("scope", "all");
    reviewUrl.searchParams.set("surface", "cli");
    reviewUrl.searchParams.set("theme", "light");
    await loadCataloguePage(page, reviewUrl.href);

    const terminalSpecimens = page.locator(".discern-catalogue-cli-preview");
    const componentSpecimens = page.locator(
      "[data-discern-component] .discern-catalogue-cli-preview",
    );
    const componentSpecimenCount = await componentSpecimens.count();
    invariant(
      componentSpecimenCount > 0,
      "Terminal Catalogue needs a rendered Component specimen",
    );
    await verifyCliProjectionStyles(page);
    const allComponentSurfacesUse = async (
      theme: CatalogueTheme,
    ): Promise<boolean> => {
      const surfaceThemes = await terminalSpecimens.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-discern-theme"))
      );
      return surfaceThemes.length === componentSpecimenCount &&
        surfaceThemes.every((value) => value === theme);
    };
    invariant(
      await allComponentSurfacesUse("light"),
      "Light mode did not reach every terminal Component",
    );

    const headingOutput = page.locator(
      '[data-discern-component="heading"] .discern-catalogue-cli-preview',
    ).first();
    const terminalPalette = async (): Promise<
      { readonly background: string; readonly foreground: string }
    > =>
      await headingOutput.evaluate((node) => {
        const coloured = node.querySelector<HTMLElement>('[style*="color"]');
        return {
          background: getComputedStyle(node).backgroundColor,
          foreground: coloured === null ? "" : getComputedStyle(coloured).color,
        };
      });
    const lightPalette = await terminalPalette();
    invariant(
      lightPalette.foreground !== "",
      "Heading CLI specimen needs projected colour evidence",
    );

    await openAppearance(page);
    await page.getByRole("button", {
      name: "Switch to the dark theme",
    }).click();
    await eventually(
      async () => await allComponentSurfacesUse("dark"),
      "Dark mode did not reach every terminal Component",
    );
    const darkPalette = await terminalPalette();
    invariant(
      darkPalette.background !== lightPalette.background &&
        darkPalette.foreground !== lightPalette.foreground,
      "Dark mode changed terminal labels without re-rendering its palette",
    );

    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await page.evaluate(() =>
      localStorage.removeItem("discern-catalogue-theme")
    );
    const systemReviewUrl = new URL(catalogueRoutePaths.review, origin);
    systemReviewUrl.searchParams.set("scope", "all");
    systemReviewUrl.searchParams.set("surface", "cli");
    await loadCataloguePage(page, systemReviewUrl.href);
    await eventually(
      async () => await allComponentSurfacesUse("light"),
      "System mode did not follow a light browser preference",
    );
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await eventually(
      async () => await allComponentSurfacesUse("dark"),
      "System mode did not follow a changed dark browser preference",
    );

    return {
      layouts: layoutCount,
      profileChecks,
      componentSpecimens: componentSpecimenCount,
      foundationSheets: foundations.sheets,
      foundationSpecimens: foundations.specimens,
      animationChecks: foundations.animationChecks,
    };
  });
}
