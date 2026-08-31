import type { Locator, Page } from "playwright-core";
import { compositionRecipes } from "../../../catalogue/compositions.tsx";
import {
  compositionRecipeNeighbours,
  compositionWidthPresets,
} from "../../../catalogue/pages/compositions/page.tsx";
import {
  compositionRecipePath,
  compositionsRouteFamily,
} from "../../../catalogue/routes/compositions.ts";
import { catalogueComponentPath } from "../../../catalogue/routes/components.ts";
import { scanBrowserAccessibility } from "../../browser-conformance-support.ts";
import { withViewport } from "../../viewport.ts";
import { verifyInlineOverflowCueEdges } from "./overflow-cue.ts";
import {
  CATALOGUE_NARROW_VIEWPORT,
  CATALOGUE_WIDE_VIEWPORT,
  eventually,
  invariant,
  loadCataloguePage,
} from "./support.ts";
import type { CatalogueTheme } from "./support.ts";

export interface CompositionsCatalogueEvidence {
  readonly patterns: number;
  readonly widthChecks: number;
  readonly themeChecks: number;
  readonly accessibilityScans: number;
  readonly copyChecks: number;
  readonly keyboardChecks: number;
}

async function verifyGallery(page: Page, origin: string): Promise<void> {
  const url = new URL(compositionsRouteFamily.descriptor.path, origin);
  url.searchParams.set("theme", "light");
  await loadCataloguePage(page, url.href);

  const expected = compositionRecipes.map(({ id }) => id);
  const cards = await page.locator("[data-discern-composition-card]")
    .evaluateAll((nodes) =>
      nodes.map((node) =>
        node.getAttribute("data-discern-composition-card") ?? ""
      )
    );
  invariant(
    JSON.stringify(cards) === JSON.stringify(expected),
    `Composition gallery enrollment differs from its registry.\nExpected: ${
      expected.join(", ")
    }\nActual: ${cards.join(", ")}`,
  );
  invariant(
    await page.locator("[data-discern-composition-detail]").count() === 0,
    "The Composition index mounted a complete detail demonstration",
  );
  invariant(
    await page.locator(".discern-catalogue-pattern__source").count() === 0,
    "The Composition index mounted adaptable source disclosures",
  );
  invariant(
    await page.locator(
      "[data-discern-composition-card][data-discern-catalogue-index-card] [data-discern-catalogue-index-card-primary]",
    ).count() === compositionRecipes.length,
    "Composition cards must enrol through the shared whole-card authority",
  );
  const cardContracts = await page.locator("[data-discern-composition-card]")
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const primary = node.querySelector<HTMLElement>(
          "[data-discern-catalogue-index-card-primary]",
        );
        const stretched = primary === null
          ? null
          : getComputedStyle(primary, "::after");
        return {
          primaryLinks: node.querySelectorAll(
            "[data-discern-catalogue-index-card-primary]",
          ).length,
          nestedInteractive: primary?.querySelector(
            "a, button, input, select, textarea, summary",
          ) !== null,
          stretched: stretched?.position === "absolute" &&
            stretched.top === "0px" && stretched.right === "0px" &&
            stretched.bottom === "0px" && stretched.left === "0px",
        };
      })
    );
  invariant(
    cardContracts.every((contract) =>
      contract.primaryLinks === 1 && !contract.nestedInteractive &&
      contract.stretched
    ),
    "Composition cards lost their single stretched primary link contract",
  );

  await page.locator(".discern-catalogue-search").click();
  const search = page.getByRole("dialog", { name: "Search the Catalogue" });
  await search.locator(".discern-search-palette__input").fill("raw output");
  const result = search.locator(
    `.discern-search-palette__result[href="${
      compositionRecipePath("failure-triage")
    }"]`,
  );
  invariant(
    await result.count() === 1,
    "A constituent Component name did not find its illustrative pattern",
  );
  invariant(
    (await result.textContent())?.includes("Illustrative pattern") === true,
    "Composition search context does not name the illustrative posture",
  );
  await page.keyboard.press("Escape");
}

async function verifyLegacyUpgrade(page: Page, origin: string): Promise<void> {
  await loadCataloguePage(
    page,
    `${origin}${compositionsRouteFamily.descriptor.path}?width=narrow#recipe-next-action`,
  );
  await eventually(
    () => new URL(page.url()).pathname === compositionRecipePath("next-action"),
    "The former #recipe-* destination did not upgrade to its detail route",
  );
  invariant(
    new URL(page.url()).searchParams.get("width") === "narrow",
    "The former recipe destination lost responsive width state",
  );
}

/** Family-owned browser checks, ready for the shared wave-5 orchestrator. */
export async function verifyCompositionsCatalogue(
  page: Page,
  origin: string,
): Promise<CompositionsCatalogueEvidence> {
  return await withViewport(page, CATALOGUE_WIDE_VIEWPORT, async () => {
    await verifyGallery(page, origin);
    await verifyLegacyUpgrade(page, origin);

    let widthChecks = 0;
    let themeChecks = 0;
    let accessibilityScans = 0;
    let copyChecks = 0;
    let keyboardChecks = 0;
    const reviewWidths = compositionWidthPresets.filter(({ id }) =>
      id === "narrow" || id === "wide"
    );

    for (const recipe of compositionRecipes) {
      const neighbours = compositionRecipeNeighbours(
        compositionRecipes,
        recipe.id,
      );
      for (
        const theme of [
          "light",
          "dark",
        ] as const satisfies readonly CatalogueTheme[]
      ) {
        for (const width of reviewWidths) {
          const url = new URL(compositionRecipePath(recipe.id), origin);
          url.searchParams.set("theme", theme);
          url.searchParams.set("width", width.id);
          await loadCataloguePage(page, url.href);

          const detail = page.locator(
            `[data-discern-composition-detail="${recipe.id}"]`,
          );
          invariant(
            await detail.count() === 1,
            `${recipe.title} did not render exactly one detail demonstration`,
          );
          invariant(
            await page.locator("h1").count() === 1,
            `${recipe.title} must keep one page heading`,
          );
          invariant(
            await page.locator(".discern-catalogue-shell").getAttribute(
              "data-discern-theme",
            ) === theme,
            `${recipe.title} did not preserve ${theme} appearance state`,
          );
          themeChecks += 1;

          const actualWidth = await detail.locator(
            ".discern-catalogue-pattern__viewport",
          ).evaluate((node) => node.getBoundingClientRect().width);
          invariant(
            Math.abs(actualWidth - width.pixels) < 0.5,
            `${recipe.title} / ${width.label} scaled to ${actualWidth}px instead of rendering at ${width.pixels}px`,
          );
          const stage = await detail.locator(
            ".discern-catalogue-pattern__viewport",
          ).evaluate((node) => {
            const style = getComputedStyle(node);
            return {
              mode: node.getAttribute("data-discern-pattern-stage"),
              paddingBlock: Number.parseFloat(style.paddingBlockStart),
              paddingInline: Number.parseFloat(style.paddingInlineStart),
            };
          });
          invariant(
            stage.mode === recipe.stage &&
              (recipe.stage === "inset"
                ? stage.paddingBlock > 0 && stage.paddingInline > 0
                : stage.paddingBlock === 0 && stage.paddingInline === 0),
            `${recipe.title} did not render its ${recipe.stage} stage contract`,
          );
          invariant(
            await detail.locator(`input[value="${width.id}"]`).isChecked(),
            `${recipe.title} did not restore its ${width.label} control`,
          );
          const documentWidth = await page.evaluate(() => ({
            client: document.documentElement.clientWidth,
            scroll: document.documentElement.scrollWidth,
          }));
          invariant(
            documentWidth.scroll <= documentWidth.client,
            `${recipe.title} / ${width.label} overflowed the document`,
          );
          widthChecks += 1;

          for (const slug of recipe.components) {
            invariant(
              await detail.locator(
                `.discern-catalogue-pattern__components a[href="${
                  catalogueComponentPath(slug)
                }"]`,
              ).count() === 1,
              `${recipe.title} did not link constituent ${slug}`,
            );
          }
          const source = detail.locator(".discern-catalogue-pattern__source");
          invariant(
            await source.getAttribute("open") === null,
            `${recipe.title} adaptable source opened by default`,
          );
          const expectedPrevious = neighbours.previous === undefined ? 0 : 1;
          const expectedNext = neighbours.next === undefined ? 0 : 1;
          invariant(
            await detail.locator(".discern-catalogue-pattern__previous")
                  .count() === expectedPrevious &&
              await detail.locator(".discern-catalogue-pattern__next")
                  .count() ===
                expectedNext,
            `${recipe.title} previous/next movement differs from recipe order`,
          );

          if (width.id === "narrow") {
            for (
              const selector of [
                ".discern-catalogue-pattern__header",
                ".discern-catalogue-pattern__widths",
                ".discern-catalogue-pattern__components",
                ".discern-catalogue-pattern__source",
                ".discern-catalogue-pattern__pagination",
              ]
            ) {
              const accessibility = await scanBrowserAccessibility(
                page,
                selector,
              );
              invariant(
                accessibility.violations.length === 0,
                `${recipe.title} / ${theme} / ${selector} has accessibility violations:\n${
                  accessibility.violations.map(({ id }) => id).join(", ")
                }`,
              );
              accessibilityScans += 1;
            }
          }
        }
      }

      const narrowUrl = new URL(compositionRecipePath(recipe.id), origin);
      narrowUrl.searchParams.set("theme", "light");
      narrowUrl.searchParams.set("width", "narrow");
      await loadCataloguePage(page, narrowUrl.href);
      const detail = page.locator(
        `[data-discern-composition-detail="${recipe.id}"]`,
      );
      const widths = detail.locator(".discern-catalogue-pattern__widths");
      await widths.locator('input[value="narrow"]').focus();
      await page.keyboard.press("ArrowRight");
      await eventually(
        () => new URL(page.url()).searchParams.get("width") === "standard",
        `${recipe.title} width controls were not keyboard-complete`,
      );
      keyboardChecks += 1;

      await sourceCopyCheck(page, detail, recipe.source);
      copyChecks += 1;
      await page.reload({ waitUntil: "networkidle" });
      invariant(
        new URL(page.url()).searchParams.get("width") === "standard" &&
          await page.locator('input[value="standard"]').isChecked(),
        `${recipe.title} lost responsive width state on refresh`,
      );
    }

    await withViewport(page, CATALOGUE_NARROW_VIEWPORT, async () => {
      const url = new URL(compositionsRouteFamily.descriptor.path, origin);
      url.searchParams.set("theme", "dark");
      await loadCataloguePage(page, url.href);
      const width = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      invariant(
        width.scroll <= width.client,
        "The narrow Composition gallery overflowed the document",
      );

      const witness = compositionRecipes[0];
      invariant(witness !== undefined, "Composition cue needs one pattern");
      const detailUrl = new URL(compositionRecipePath(witness.id), origin);
      detailUrl.searchParams.set("width", "standard");
      await loadCataloguePage(page, detailUrl.href);
      await verifyInlineOverflowCueEdges(
        page.locator(".discern-catalogue-pattern__canvas-cue"),
        "Composition preview",
      );
      await page.locator(".discern-catalogue-pattern__source > summary")
        .click();
      await verifyInlineOverflowCueEdges(
        page.locator(".discern-catalogue-pattern__source-cue"),
        "Composition adaptable source",
      );
      const detailWidth = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      invariant(
        detailWidth.scroll <= detailWidth.client,
        "Composition cues escaped the narrow document",
      );
    });

    return {
      patterns: compositionRecipes.length,
      widthChecks,
      themeChecks,
      accessibilityScans,
      copyChecks,
      keyboardChecks,
    };
  });
}

async function sourceCopyCheck(
  page: Page,
  detail: Locator,
  expected: string,
): Promise<void> {
  await detail.locator(".discern-catalogue-pattern__source > summary").click();
  await detail.getByRole("button", {
    name: "Copy adaptable example source",
  }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  invariant(
    copied === expected,
    "Adaptable source copy differed from its recipe",
  );
}
