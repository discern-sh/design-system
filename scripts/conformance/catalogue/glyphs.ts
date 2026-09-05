import type { Page } from "playwright-core";
import { glyphAtlasData, glyphSequenceId } from "../../../src/glyphs/atlas.ts";
import { glyphs, resolveGlyph } from "../../../src/glyphs/mod.ts";
import {
  catalogueGlyphPath,
  glyphCatalogueEntries,
  glyphsRouteFamily,
} from "../../../catalogue/routes/glyphs.ts";
import { scanBrowserAccessibility } from "../../browser-conformance-support.ts";
import { withViewport } from "../../viewport.ts";
import {
  CATALOGUE_NARROW_VIEWPORT,
  CATALOGUE_WIDE_VIEWPORT,
  eventually,
  invariant,
  loadCataloguePage,
} from "./support.ts";

const CATALOGUE_400_PERCENT_VIEWPORT = { width: 320, height: 640 } as const;

export interface GlyphsCatalogueEvidence {
  readonly records: number;
  readonly details: number;
  readonly searchChecks: number;
  readonly filterHistoryChecks: number;
  readonly copyChecks: number;
  readonly themeChecks: number;
  readonly accessibilityScans: number;
  readonly reflowChecks: number;
  readonly forcedColorChecks: number;
  readonly workbenchChecks: number;
}

async function verifyWorkbench(page: Page, origin: string): Promise<number> {
  await loadCataloguePage(
    page,
    `${origin}/catalogue/glyphs/?collection=interface`,
  );
  const expected = new Set(glyphs.map(({ unicode }) => unicode)).size;
  invariant(
    await page.locator("[data-discern-glyph-card]").count() === expected,
    "Ready-to-use collection differs from the published vocabulary",
  );
  await page.getByLabel("Terminal support", { exact: true }).selectOption(
    "unicode-only",
  );
  await eventually(
    async () => await page.locator("[data-discern-glyph-card]").count() === 1,
    "Unicode-only collection did not isolate the brand mark",
  );
  await loadCataloguePage(
    page,
    `${origin}/catalogue/glyphs/u-2713/?use=status-complete&theme=light`,
  );
  const use = page.getByLabel("Use as", { exact: true });
  invariant(
    await use.inputValue() === "status-complete",
    "A contextual alias deep link did not select its role",
  );
  const repertoire = page.getByLabel("Character repertoire", { exact: true });
  await repertoire.selectOption("ascii");
  const terminal = page.getByLabel("Terminal glyph specimen", { exact: true });
  for (const name of ["status-complete", "selection-selected"] as const) {
    await use.selectOption(name);
    const resolved = resolveGlyph(name, "ascii");
    invariant(resolved.available, `${name} needs a fallback for this check`);
    await eventually(
      async () =>
        (await terminal.textContent())?.includes(resolved.text) === true,
      `${name} specimen did not follow public resolution`,
    );
  }
  const label = page.getByLabel("Example label", { exact: true });
  await label.fill('A long labelled choice <&> "quoted"');
  await page.getByRole("button", { name: "Terminal", exact: true }).click();
  await page.getByRole("button", { name: "Copy usage example", exact: true })
    .click();
  await eventually(
    async () => {
      const text = await page.evaluate(() => navigator.clipboard.readText());
      return text.includes("unicode: false") &&
        text.includes("selection-selected") && text.includes('\\"quoted\\"');
    },
    "Copied terminal code lost the selected repertoire, alias, or escaped label",
  );
  await repertoire.selectOption("unicode");
  await page.getByLabel("Specimen font", { exact: true }).selectOption(
    "--discern-font-mono",
  );
  await page.getByLabel("Specimen size", { exact: true }).selectOption("16");
  await eventually(
    async () =>
      await page.locator(".discern-catalogue-glyph-workbench__line").evaluate((
        node,
      ) => getComputedStyle(node).fontSize) === "16px",
    "Specimen size control did not reach the live text",
  );
  const scan = await scanBrowserAccessibility(
    page,
    ".discern-catalogue-glyph-workbench",
  );
  invariant(
    scan.violations.length === 0,
    `Glyph workbench accessibility failed: ${
      scan.violations.map(({ id }) => id).join(", ")
    }`,
  );
  await withViewport(page, CATALOGUE_400_PERCENT_VIEWPORT, async () => {
    await page.getByLabel("Specimen size", { exact: true }).selectOption("64");
    await label.fill("A".repeat(100));
    await eventually(
      async () =>
        await page.locator(".discern-catalogue-glyph-workbench__line").evaluate(
          (node) =>
            getComputedStyle(node).fontSize === "64px" &&
            node.textContent?.includes("A".repeat(100)) === true,
        ),
      "Long-label reflow fixture did not reach the live specimen",
    );
    await documentDoesNotOverflow(
      page,
      "Glyph workbench with a long label at 400% reflow",
    );
    const usage = page.getByRole("group", {
      name: "Usage example",
      exact: true,
    });
    await usage.focus();
    await page.keyboard.press("ArrowRight");
    await eventually(
      async () => await usage.evaluate((node) => node.scrollLeft > 0),
      "Overflowing usage examples cannot be scrolled with the keyboard",
    );
  });
  await loadCataloguePage(
    page,
    `${origin}/catalogue/glyphs/u-25ee/?theme=dark`,
  );
  await page.getByLabel("Character repertoire", { exact: true }).selectOption(
    "ascii",
  );
  await eventually(
    async () =>
      (await page.locator(".discern-catalogue-glyph-workbench__terminal")
        .textContent())?.includes("No approved ASCII fallback") === true,
    "Brand specimen invented an ASCII fallback",
  );
  await loadCataloguePage(page, `${origin}/catalogue/glyphs/u-26a0-fe0e/`);
  invariant(
    await page.locator(".discern-catalogue-glyph-variants a").count() === 3,
    "Presentation comparison lost a warning sequence",
  );
  await page.locator(
    '.discern-catalogue-glyph-variants a[href*="u-26a0-fe0f/"]',
  ).click();
  await eventually(
    async () =>
      await page.locator('[data-discern-glyph-detail="U+26A0 U+FE0F"]')
        .count() === 1,
    "Presentation navigation changed the selected sequence",
  );
  return 12;
}

async function documentDoesNotOverflow(
  page: Page,
  label: string,
): Promise<void> {
  const width = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  invariant(
    width.scroll <= width.client,
    `${label} overflowed the document (${width.scroll} > ${width.client})`,
  );
}

async function verifyExplorer(page: Page, origin: string): Promise<{
  readonly searchChecks: number;
  readonly filterHistoryChecks: number;
}> {
  const url = new URL(glyphsRouteFamily.descriptor.path, origin);
  url.searchParams.set("theme", "light");
  await loadCataloguePage(page, url.href);
  invariant(
    await page.locator("[data-discern-glyph-card]").count() ===
      glyphAtlasData.canonical.length,
    "Glyph explorer did not auto-enrol the canonical Atlas population",
  );
  invariant(
    await page.locator(
      "[data-discern-glyph-card][data-discern-catalogue-index-card] [data-discern-catalogue-index-card-primary]",
    ).count() === glyphAtlasData.canonical.length,
    "Glyph explorer cards bypassed the shared CatalogueIndexCard authority",
  );

  const search = page.getByRole("searchbox", { name: "Search Glyphs" });
  await search.fill("✓");
  await eventually(
    async () => await page.locator("[data-discern-glyph-card]").count() === 1,
    "Exact pasted-glyph search did not isolate its canonical identity",
  );
  invariant(
    await page.locator('[data-discern-glyph-card="u-2713"]').count() === 1,
    "Pasted check mark did not reach U+2713",
  );
  await search.fill("U+2713");
  await eventually(
    async () =>
      await page.locator('[data-discern-glyph-card="u-2713"]').count() === 1,
    "Code-point search did not reach U+2713",
  );

  await search.fill("");
  const category = page.getByLabel("Discern category");
  await category.focus();
  await category.selectOption("status");
  await eventually(
    () => new URL(page.url()).searchParams.get("category") === "status",
    "Keyboard category filtering did not reach the URL",
  );
  const recommendation = page.getByLabel("Recommendation");
  await page.locator(".discern-catalogue-glyphs__extra > summary").click();
  await recommendation.selectOption("recommended");
  await eventually(
    () =>
      new URL(page.url()).searchParams.get("recommendation") ===
        "recommended",
    "Recommendation filtering did not reach the URL",
  );
  invariant(
    new URL(page.url()).searchParams.get("theme") === "light",
    "Glyph filters dropped explicit Appearance state",
  );
  await page.goBack();
  await eventually(
    async () =>
      new URL(page.url()).searchParams.get("category") === "status" &&
      new URL(page.url()).searchParams.get("recommendation") === null &&
      await recommendation.inputValue() === "",
    "Back navigation did not restore the previous Glyph filters",
  );
  await page.goForward();
  await eventually(
    async () =>
      new URL(page.url()).searchParams.get("recommendation") ===
        "recommended" &&
      await recommendation.inputValue() === "recommended",
    "Forward navigation did not restore the Glyph recommendation",
  );
  return { searchChecks: 2, filterHistoryChecks: 4 };
}

async function verifyDetail(
  page: Page,
  origin: string,
  canonicalId: string,
  theme: "light" | "dark",
): Promise<void> {
  const record = glyphAtlasData.canonical.find(({ id }) => id === canonicalId);
  invariant(record !== undefined, `Missing conformance Glyph ${canonicalId}`);
  const url = new URL(catalogueGlyphPath(record), origin);
  url.searchParams.set("theme", theme);
  await loadCataloguePage(page, url.href);
  const detail = page.locator(`[data-discern-glyph-detail="${canonicalId}"]`);
  invariant(await detail.count() === 1, `${canonicalId} detail did not render`);
  invariant(
    await detail.locator(".discern-catalogue-glyph-identity__specimen")
      .textContent() === record.text,
    `${canonicalId} detail changed the exact rendered sequence`,
  );
  invariant(
    await page.locator(".discern-catalogue-shell").getAttribute(
      "data-discern-theme",
    ) === theme,
    `${canonicalId} detail did not retain ${theme} Appearance`,
  );
}

/** Exercise exact identities, URL state, accessibility, copy, and reflow. */
export async function verifyGlyphsCatalogue(
  page: Page,
  origin: string,
): Promise<GlyphsCatalogueEvidence> {
  return await withViewport(page, CATALOGUE_WIDE_VIEWPORT, async () => {
    const explorer = await verifyExplorer(page, origin);
    let searchChecks = explorer.searchChecks;
    let accessibilityScans = 0;
    let copyChecks = 0;
    let themeChecks = 0;
    let reflowChecks = 0;
    let forcedColorChecks = 0;
    const workbenchChecks = await verifyWorkbench(page, origin);
    await loadCataloguePage(page, `${origin}/catalogue/glyphs/`);

    const explorerAccessibility = await scanBrowserAccessibility(
      page,
      ".discern-catalogue-glyphs",
    );
    invariant(
      explorerAccessibility.violations.length === 0,
      `Glyph explorer accessibility failed: ${
        explorerAccessibility.violations.map(({ id }) => id).join(", ")
      }`,
    );
    accessibilityScans += 1;

    const identities = [
      glyphSequenceId(0x2713),
      glyphSequenceId(0x26A0, 0xFE0E),
      glyphSequenceId(0x1F469, 0x200D, 0x1F4BB),
    ] as const;
    for (const [index, canonicalId] of identities.entries()) {
      const theme = index === identities.length - 1 ? "dark" : "light";
      await verifyDetail(page, origin, canonicalId, theme);
      themeChecks += 1;
    }

    const check = glyphAtlasData.canonical.find(({ id }) =>
      id === identities[0]
    );
    invariant(check !== undefined, "Copy conformance needs the check mark");
    await verifyDetail(page, origin, check.id, "light");
    const copy = page.getByRole("button", { name: "Copy rendered sequence" });
    await copy.focus();
    await page.keyboard.press("Enter");
    await eventually(
      async () =>
        await page.evaluate(() => navigator.clipboard.readText()) ===
          check.text,
      "Keyboard copy did not preserve the exact glyph sequence",
    );
    copyChecks += 1;

    await page.emulateMedia({ forcedColors: "active" });
    await page.locator(".discern-catalogue-glyph-reference > summary").focus();
    await page.keyboard.press("Enter");
    const codePointRegion = page.getByRole("region", {
      name: "Ordered code-point table",
    });
    await codePointRegion.focus();
    invariant(
      await codePointRegion.evaluate((node) => {
        const style = getComputedStyle(node);
        return style.outlineStyle !== "none" &&
          Number.parseFloat(style.outlineWidth) > 0;
      }),
      "Forced colours hid the ordered code-point focus indicator",
    );
    forcedColorChecks += 1;
    await page.emulateMedia({ forcedColors: "none" });
    await page.getByRole("button", { name: "Copy code points" }).click();
    await eventually(
      async () =>
        await page.evaluate(() => navigator.clipboard.readText()) === check.id,
      "Code-point copy differed from the canonical identity",
    );
    copyChecks += 1;
    await page.getByRole("button", {
      name: "Copy javascript / typescript",
    }).click();
    await eventually(
      async () =>
        await page.evaluate(() => navigator.clipboard.readText()) ===
          "\\u{2713}",
      "JavaScript escape copy differed from the exact sequence",
    );
    copyChecks += 1;

    const detailAccessibility = await scanBrowserAccessibility(
      page,
      ".discern-catalogue-glyph-detail",
    );
    invariant(
      detailAccessibility.violations.length === 0,
      `Glyph detail accessibility failed: ${
        detailAccessibility.violations.map(({ id }) => id).join(", ")
      }`,
    );
    accessibilityScans += 1;

    await page.locator(".discern-catalogue-search").click();
    const globalSearch = page.getByRole("dialog", {
      name: "Search the Catalogue",
    });
    await globalSearch.locator(".discern-search-palette__input").fill("✓");
    invariant(
      await globalSearch.locator(
        `.discern-search-palette__result[href="${catalogueGlyphPath(check)}"]`,
      ).count() === 1,
      "Global literal search did not share the canonical Glyph destination",
    );
    searchChecks += 1;
    await page.keyboard.press("Escape");

    await withViewport(page, CATALOGUE_NARROW_VIEWPORT, async () => {
      await loadCataloguePage(
        page,
        `${origin}${glyphsRouteFamily.descriptor.path}`,
      );
      await documentDoesNotOverflow(page, "Glyph explorer at narrow width");
      reflowChecks += 1;
    });
    await withViewport(page, CATALOGUE_400_PERCENT_VIEWPORT, async () => {
      await loadCataloguePage(
        page,
        `${origin}${glyphsRouteFamily.descriptor.path}`,
      );
      await documentDoesNotOverflow(page, "Glyph explorer at 400% reflow");
      reflowChecks += 1;
      const zwj = glyphAtlasData.canonical.find(({ id }) =>
        id === identities[2]
      );
      invariant(zwj !== undefined, "Reflow conformance needs the ZWJ identity");
      await loadCataloguePage(
        page,
        new URL(catalogueGlyphPath(zwj), origin).href,
      );
      await documentDoesNotOverflow(page, "Glyph ZWJ detail at 400% reflow");
      reflowChecks += 1;
    });

    await loadCataloguePage(page, `${origin}/catalogue/glyphs/u-not-hex/`);
    invariant(
      await page.getByRole("heading", {
        name: "That Catalogue destination does not exist.",
      }).count() === 1,
      "Malformed Glyph detail did not resolve to Not Found",
    );

    invariant(
      glyphCatalogueEntries(glyphAtlasData).length ===
        glyphAtlasData.canonical.length,
      "Glyph conformance projection differs from the canonical population",
    );
    return {
      records: glyphAtlasData.canonical.length,
      details: identities.length,
      searchChecks,
      filterHistoryChecks: explorer.filterHistoryChecks,
      copyChecks,
      themeChecks,
      accessibilityScans,
      reflowChecks,
      forcedColorChecks,
      workbenchChecks,
    };
  });
}
