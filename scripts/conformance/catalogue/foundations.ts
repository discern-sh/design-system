import type { Page } from "playwright-core";
import { catalogueCliCapabilities } from "../../../catalogue/cli-preview.tsx";
import {
  catalogueTerminalFoundationPath,
  foundationsPaths,
} from "../../../catalogue/routes.ts";
import { terminalFoundationSheets } from "../../../catalogue/terminal-foundations.ts";
import { allTokens } from "../../../src/tokens/tokens.ts";
import { scanBrowserAccessibility } from "../../browser-conformance-support.ts";
import { withViewport } from "../../viewport.ts";
import {
  CATALOGUE_NARROW_VIEWPORT,
  CATALOGUE_WIDE_VIEWPORT,
  eventually,
  invariant,
  loadCataloguePage,
} from "./support.ts";

export interface FoundationsCatalogueEvidence {
  readonly sheets: number;
  readonly specimens: number;
  readonly animationChecks: number;
  readonly tokenChecks: number;
  readonly reflowChecks: number;
}

async function openAppearance(page: Page): Promise<void> {
  const disclosure = page.locator(".discern-catalogue-appearance");
  if (await disclosure.getAttribute("open") === null) {
    await disclosure.locator('summary[aria-label="Change appearance"]').click();
  }
}

async function documentOverflow(page: Page): Promise<number> {
  return await page.evaluate(() =>
    document.documentElement.scrollWidth -
    document.documentElement.clientWidth
  );
}

async function verifyTokenExplorer(
  page: Page,
  origin: string,
): Promise<{ readonly tokenChecks: number; readonly reflowChecks: number }> {
  const url = new URL(foundationsPaths.tokens, origin);
  url.searchParams.set("theme", "light");
  await loadCataloguePage(page, url.href);
  invariant(
    await page.locator("[data-discern-token]").count() === allTokens.length,
    "Token explorer did not auto-enrol the complete Token authority",
  );

  const themed = page.locator('[data-discern-token="--discern-color-ink"]');
  invariant(
    await themed.locator('[data-discern-token-preview-values="themed"]')
      .count() === 1,
    "A light/dark color Token did not render themed evidence",
  );
  invariant(
    await themed.getByText("Light", { exact: true }).count() === 1 &&
      await themed.getByText("Dark", { exact: true }).count() === 1,
    "Themed color evidence must label Light and Dark",
  );
  const single = page.locator('[data-discern-token="--discern-accent-hue"]');
  invariant(
    await single.locator('[data-discern-token-preview-values="single"]')
          .count() === 1 &&
      await single.getByText("Value", { exact: true }).count() === 1,
    "A single-value color control must label its one value",
  );

  const copyToken = page.locator(
    '[data-discern-token="--discern-font-size-xs"]',
  );
  await copyToken.locator("details").evaluate((node) => {
    (node as HTMLDetailsElement).open = true;
  });
  await copyToken.getByRole("button", {
    name: "Copy custom property name",
  }).click();
  await eventually(
    async () =>
      await page.evaluate(async () => await navigator.clipboard.readText()) ===
        "--discern-font-size-xs",
    "Token name copy did not copy the advertised custom property",
  );
  await copyToken.getByRole("button", { name: "Copy authored value" }).click();
  await eventually(
    async () =>
      await page.evaluate(async () => await navigator.clipboard.readText()) ===
        "0.85rem",
    "Token value copy did not copy the advertised authored value",
  );

  const typography = page.getByRole("button", {
    name: "Typography",
    exact: true,
  });
  await typography.focus();
  await typography.press("Enter");
  await eventually(
    async () =>
      new URL(await page.evaluate(() => globalThis.location.href)).searchParams
        .get("category") === "typography",
    "Keyboard category selection did not reach the URL",
  );
  const categoryCards = page.locator("[data-discern-token-category]");
  invariant(
    await categoryCards.count() > 0 &&
      (await categoryCards.evaluateAll((nodes) =>
        nodes.every((node) =>
          node.getAttribute("data-discern-token-category") === "Typography"
        )
      )),
    "Typography selection rendered a Token from another category",
  );

  const search = page.getByRole("search").getByRole("searchbox", {
    name: "Search Tokens",
  });
  await search.fill("0.85rem");
  await eventually(
    async () =>
      new URL(await page.evaluate(() => globalThis.location.href)).searchParams
        .get("q") === "0.85rem",
    "Token query did not reach the URL",
  );
  invariant(
    await page.locator("[data-discern-token]").count() === 1 &&
      await page.locator('[data-discern-token="--discern-font-size-xs"]')
          .count() === 1,
    "Value search did not resolve the matching Token through universal search",
  );
  await page.reload({ waitUntil: "networkidle" });
  invariant(
    await page.getByRole("searchbox", { name: "Search Tokens" })
          .inputValue() ===
        "0.85rem" &&
      await page.getByRole("button", { name: "Typography", exact: true })
          .getAttribute("aria-pressed") === "true",
    "Token query and category did not round-trip after reload",
  );

  await page.getByRole("button", { name: "Clear search and filters" }).click();
  await page.getByRole("searchbox", { name: "Search Tokens" }).fill(
    "a fact that does not exist",
  );
  invariant(
    await page.getByRole("heading", { name: "No Tokens found" }).count() ===
        1 &&
      await page.getByRole("button", { name: "Show all Tokens" }).count() === 1,
    "Token explorer did not provide a useful empty recovery",
  );

  await page.getByRole("button", { name: "Show all Tokens" }).click();
  const motion = page.locator(
    '[data-discern-token="--discern-duration-medium"]',
  );
  invariant(
    await motion.getByRole("button", { name: "Reduced motion is on" })
      .isDisabled(),
    "Reduced motion did not disable the Token replay preview",
  );

  let reflowChecks = 0;
  await withViewport(page, CATALOGUE_NARROW_VIEWPORT, async () => {
    const narrow = new URL(foundationsPaths.tokens, origin);
    narrow.searchParams.set("category", "color");
    await loadCataloguePage(page, narrow.href);
    invariant(
      await documentOverflow(page) <= 0,
      "Token explorer overflows the document at narrow width",
    );
    invariant(
      await page.locator("main h1").count() === 1 &&
        await page.locator("main").count() === 1,
      "Token explorer needs one h1 and one main landmark",
    );
    reflowChecks += 1;
  });
  return { tokenChecks: 10, reflowChecks };
}

async function verifyTerminalFoundations(
  page: Page,
  origin: string,
): Promise<{
  readonly sheets: number;
  readonly specimens: number;
  readonly animationChecks: number;
  readonly reflowChecks: number;
}> {
  const indexUrl = new URL(foundationsPaths.terminal, origin);
  indexUrl.searchParams.set("theme", "light");
  await loadCataloguePage(page, indexUrl.href);
  const expectedSheets = terminalFoundationSheets.map(({ id }) => id);
  const gallerySheets = await page.locator(
    "[data-discern-terminal-foundation-card]",
  ).evaluateAll((nodes) =>
    nodes.map((node) =>
      node.getAttribute("data-discern-terminal-foundation-card") ?? ""
    )
  );
  invariant(
    JSON.stringify(gallerySheets) === JSON.stringify(expectedSheets),
    "Terminal foundation gallery differs from its registry",
  );
  invariant(
    await page.locator("[data-discern-terminal-foundation-specimen]")
      .count() ===
      0,
    "Terminal foundation index mounted the complete specimen population",
  );

  let specimenCount = 0;
  let reflowChecks = 0;
  for (const sheet of terminalFoundationSheets) {
    const detailUrl = new URL(
      catalogueTerminalFoundationPath(sheet.id),
      origin,
    );
    detailUrl.searchParams.set("theme", "light");
    await loadCataloguePage(page, detailUrl.href);
    const expectedSpecimens = sheet.specimens(catalogueCliCapabilities, {
      theme: "light",
    }).map(({ id }) => id);
    const actualSpecimens = await page.locator(
      "[data-discern-terminal-foundation-specimen]",
    ).evaluateAll((nodes) =>
      nodes.map((node) =>
        node.getAttribute("data-discern-terminal-foundation-specimen") ?? ""
      )
    );
    invariant(
      JSON.stringify(actualSpecimens) === JSON.stringify(expectedSpecimens),
      `${sheet.title} browser specimens differ from their registry`,
    );
    specimenCount += actualSpecimens.length;
    invariant(
      await page.locator(
        '[data-discern-terminal-foundation-specimen] a[aria-label^="Link to "]',
      ).count() === expectedSpecimens.length,
      `${sheet.title} did not provide one stable link per specimen`,
    );
    const accessibility = await scanBrowserAccessibility(
      page,
      "[data-discern-terminal-foundation]",
    );
    invariant(
      accessibility.violations.length === 0,
      `${sheet.title} failed accessibility: ${
        accessibility.violations.map(({ id }) => id).join(", ")
      }`,
    );
  }

  const motifsUrl = new URL(catalogueTerminalFoundationPath("motifs"), origin);
  motifsUrl.searchParams.set("theme", "light");
  await loadCataloguePage(page, motifsUrl.href);
  const spinner = page.locator(
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

  invariant(
    await page.locator(
      '.discern-catalogue-cli-preview[data-discern-theme="light"]',
    )
      .count() > 0,
    "Light theme did not reach terminal foundation frames",
  );
  await openAppearance(page);
  await page.getByRole("button", { name: "Switch to the dark theme" }).click();
  await eventually(
    async () =>
      await page.locator(
        '.discern-catalogue-cli-preview:not([data-discern-theme="dark"])',
      ).count() === 0,
    "Dark theme did not reach every terminal foundation frame",
  );

  await page.locator(".discern-catalogue-search").click();
  const searchDialog = page.getByRole("dialog", {
    name: "Search the Catalogue",
  });
  await searchDialog.locator(".discern-search-palette__input").fill("spinner");
  const result = searchDialog.locator(
    `.discern-search-palette__result[href="${
      catalogueTerminalFoundationPath("motifs")
    }"]`,
  );
  invariant(
    await result.count() === 1 &&
      (await result.textContent())?.includes("Terminal foundation") === true,
    "Global search did not reach Terminal motifs with its concise context",
  );

  await withViewport(page, CATALOGUE_NARROW_VIEWPORT, async () => {
    await loadCataloguePage(page, motifsUrl.href);
    invariant(
      await documentOverflow(page) <= 0,
      "Terminal foundation detail overflows the document at narrow width",
    );
    reflowChecks += 1;
  });
  return {
    sheets: expectedSheets.length,
    specimens: specimenCount,
    animationChecks: 3,
    reflowChecks,
  };
}

/** Exercise the Foundations family through its bounded routed destinations. */
export async function verifyFoundationsCatalogue(
  page: Page,
  origin: string,
): Promise<FoundationsCatalogueEvidence> {
  return await withViewport(page, CATALOGUE_WIDE_VIEWPORT, async () => {
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    const index = new URL(foundationsPaths.index, origin);
    await loadCataloguePage(page, index.href);
    invariant(
      await page.locator('[data-discern-foundations-page="index"]').count() ===
          1 &&
        await page.locator(
            `[data-discern-foundations-page="index"] a[href="${foundationsPaths.tokens}"]`,
          ).count() === 1 &&
        await page.locator(
            `[data-discern-foundations-page="index"] a[href="${foundationsPaths.terminal}"]`,
          ).count() === 1,
      "Foundations index must make its two bounded choices explicit",
    );
    const tokens = await verifyTokenExplorer(page, origin);
    const terminal = await verifyTerminalFoundations(page, origin);
    await page.emulateMedia({ colorScheme: null, reducedMotion: "reduce" });
    return {
      sheets: terminal.sheets,
      specimens: terminal.specimens,
      animationChecks: terminal.animationChecks,
      tokenChecks: tokens.tokenChecks,
      reflowChecks: tokens.reflowChecks + terminal.reflowChecks,
    };
  });
}
