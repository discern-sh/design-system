import type { Locator, Page } from "playwright-core";
import { compositionRecipes } from "../../../catalogue/compositions.tsx";
import type { CompositionRecipe } from "../../../catalogue/compositions.tsx";
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
  catalogueSearchResult,
  eventually,
  invariant,
  loadCataloguePage,
} from "./support.ts";
import type { CatalogueTheme } from "./support.ts";

export interface CompositionsCatalogueEvidence {
  readonly patterns: number;
  readonly widthChecks: number;
  readonly fitChecks: number;
  readonly themeChecks: number;
  readonly accessibilityScans: number;
  readonly copyChecks: number;
  readonly keyboardChecks: number;
  readonly interactionChecks: number;
}

async function verifyLivePageControls(detail: Locator): Promise<void> {
  const light = detail.locator(".discern-light-backdrop__light");
  if (await light.count() === 0) return;
  invariant(
    await detail.getByRole("checkbox", { name: "Allow ambient motion" })
      .count() === 0,
    "Complete pages follow browser motion preferences without a composition toggle",
  );
  const motionAllowed = await detail.evaluate(() =>
    !matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !matchMedia("(forced-colors: active)").matches
  );
  await eventually(
    async () =>
      (await light.evaluateAll((nodes) =>
        nodes.map((node) =>
          node.getAnimations().some((animation) =>
            animation.playState === "running"
          )
        )
      )).every((moving) => moving === motionAllowed),
    "Selected ambient light must start moving while respecting browser opt-outs",
  );

  await detail.getByRole("radio", { name: "Details", exact: true }).check();
  invariant(
    await detail.getByText("Keep the reasons close", { exact: true })
      .isVisible(),
    "The project view control did not reveal its details",
  );
  await detail.getByRole("button", { name: "Pin view", exact: true }).click();
  invariant(
    await detail.getByText("Pinned to this project", { exact: true })
      .isVisible(),
    "Pinning did not update the example's state",
  );
  const search = detail.getByRole("textbox", {
    name: "Find a task",
    exact: true,
  });
  if (await search.count() === 0) return;
  const rows = detail.locator(".discern-table tbody tr");
  const count = await rows.count();
  await search.fill("research");
  invariant(
    await rows.count() === 1 &&
      await rows.first().getByText("Review the research notes", { exact: true })
        .isVisible(),
    "Task search did not filter the task list",
  );
  await search.fill("");
  invariant(
    await rows.count() === count,
    "Clearing task search did not restore the list",
  );
  await detail.getByRole("radio", { name: "By status", exact: true }).check();
  const statuses = await rows.locator("td:first-of-type").allTextContents();
  invariant(
    statuses.join("|") ===
      statuses.toSorted((a, b) => a.localeCompare(b)).join("|"),
    "The task view did not group by status",
  );
  await detail.getByRole("button", { name: "Save this view", exact: true })
    .click();
  invariant(
    await detail.getByRole("button", { name: "View saved", exact: true })
      .getAttribute("aria-pressed") === "true",
    "Saving the task view did not confirm its state",
  );
  invariant(
    await detail.getByText("Changes stay in this example.", { exact: true })
      .isVisible(),
    "Saving the view incorrectly confirmed the checklist",
  );
  await detail.getByRole("button", { name: "View saved", exact: true }).click();
  await detail.getByRole("button", { name: "Save checklist", exact: true })
    .click();
  invariant(
    await detail.getByText("Saved for this review.", { exact: true })
      .isVisible(),
    "Saving the checklist did not confirm its state",
  );
  invariant(
    await detail.getByRole("button", { name: "Save this view", exact: true })
      .getAttribute("aria-pressed") === "false",
    "Saving the checklist incorrectly saved the view",
  );
  await detail.getByRole("checkbox", {
    name: "The next owner is named",
    exact: true,
  }).check();
  invariant(
    await detail.getByText("Changes stay in this example.", { exact: true })
      .isVisible(),
    "An edited checklist retained its stale saved confirmation",
  );
}

async function fitGeometry(
  detail: Locator,
): Promise<{ viewport: number; allocated: number }> {
  return await detail.locator(".discern-catalogue-pattern__viewport").evaluate(
    (node) => {
      const canvas = node.closest(".discern-catalogue-pattern__canvas");
      if (canvas === null) throw new Error("The preview lost its canvas");
      const style = getComputedStyle(canvas);
      return {
        viewport: node.getBoundingClientRect().width,
        allocated: canvas.getBoundingClientRect().width -
          Number.parseFloat(style.borderInlineStartWidth) -
          Number.parseFloat(style.borderInlineEndWidth) -
          Number.parseFloat(style.paddingInlineStart) -
          Number.parseFloat(style.paddingInlineEnd),
      };
    },
  );
}

async function verifyFitPreview(
  page: Page,
  detail: Locator,
  subject: string,
): Promise<void> {
  invariant(
    await detail.locator(".discern-catalogue-pattern__demonstration")
      .getAttribute("data-discern-pattern-width") === "fit",
    `${subject} did not present the fit width state`,
  );
  invariant(
    await detail.locator('input[value="fit"]').isChecked(),
    `${subject} did not select the Fit control`,
  );
  const geometry = await fitGeometry(detail);
  invariant(
    Math.abs(geometry.viewport - geometry.allocated) < 0.5,
    `${subject} allocated ${geometry.viewport}px instead of the ${geometry.allocated}px fit canvas`,
  );
  const documentWidth = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  invariant(
    documentWidth.scroll <= documentWidth.client,
    `${subject} overflowed the document at fit`,
  );
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
  const result = catalogueSearchResult(
    page,
    compositionRecipePath("failure-triage"),
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
    let fitChecks = 0;
    let themeChecks = 0;
    let accessibilityScans = 0;
    let copyChecks = 0;
    let keyboardChecks = 0;
    let interactionChecks = 0;
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
          const overflow = await detail.locator(
            ".discern-catalogue-pattern__viewport",
          ).evaluate((node) => node.scrollWidth - node.clientWidth);
          invariant(
            overflow <= 1,
            `${recipe.title} / ${width.label} content escapes its allocation by ${overflow}px`,
          );
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
            if (
              await detail.locator(".discern-signature-specimen").count() > 0
            ) {
              invariant(
                await detail.locator(".discern-signature-specimen").evaluate((
                  node,
                ) => getComputedStyle(node).containerName) ===
                  "discern-signature",
                "The complete page's shared layout stylesheet did not apply",
              );
              await verifyLivePageControls(detail);
              interactionChecks += 1;
              const accessibility = await scanBrowserAccessibility(
                page,
                ".discern-catalogue-pattern__viewport",
              );
              invariant(
                accessibility.violations.length === 0,
                `${recipe.title} / ${theme} example has accessibility violations: ${
                  accessibility.violations.map(({ id }) => id).join(", ")
                }`,
              );
              accessibilityScans += 1;
            }
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

      const fitUrl = new URL(compositionRecipePath(recipe.id), origin);
      fitUrl.searchParams.set("theme", "light");
      await loadCataloguePage(page, fitUrl.href);
      await verifyFitPreview(
        page,
        page.locator(`[data-discern-composition-detail="${recipe.id}"]`),
        `${recipe.title} without a requested width`,
      );
      fitChecks += 1;

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

      await sourceCopyCheck(page, detail, recipe);
      copyChecks += recipe.sourceFiles?.length ?? 1;
      await page.reload({ waitUntil: "networkidle" });
      invariant(
        new URL(page.url()).searchParams.get("width") === "standard" &&
          await page.locator('input[value="standard"]').isChecked(),
        `${recipe.title} lost responsive width state on refresh`,
      );
    }

    const fitWitness = compositionRecipes.find(({ sourceFiles }) =>
      sourceFiles === undefined
    );
    invariant(fitWitness !== undefined, "Fit review needs one pattern");
    const witnessDetail = page.locator(
      `[data-discern-composition-detail="${fitWitness.id}"]`,
    );
    const wideUrl = new URL(compositionRecipePath(fitWitness.id), origin);
    wideUrl.searchParams.set("theme", "light");
    wideUrl.searchParams.set("width", "wide");
    await loadCataloguePage(page, wideUrl.href);
    await witnessDetail.locator(".discern-catalogue-pattern__widths label")
      .filter({ hasText: "Fit" }).click();
    await eventually(
      () => new URL(page.url()).searchParams.get("width") === null,
      `${fitWitness.title} Fit reset did not clear the width parameter`,
    );
    invariant(
      new URL(page.url()).searchParams.get("theme") === "light",
      `${fitWitness.title} Fit reset lost unrelated state`,
    );
    await verifyFitPreview(
      page,
      witnessDetail,
      `${fitWitness.title} after the Fit reset`,
    );
    fitChecks += 1;

    await witnessDetail.locator('input[value="fit"]').focus();
    await page.keyboard.press("ArrowRight");
    await eventually(
      () => new URL(page.url()).searchParams.get("width") === "narrow",
      `${fitWitness.title} Fit was not keyboard-adjacent to exact widths`,
    );
    await page.keyboard.press("ArrowLeft");
    await eventually(
      () => new URL(page.url()).searchParams.get("width") === null,
      `${fitWitness.title} keyboard reset to Fit kept the width parameter`,
    );
    fitChecks += 1;

    const settledFit = await fitGeometry(witnessDetail);
    await withViewport(page, { width: 960, height: 1000 }, async () => {
      const resized = await fitGeometry(witnessDetail);
      invariant(
        resized.allocated < settledFit.allocated &&
          Math.abs(resized.viewport - resized.allocated) < 0.5,
        `${fitWitness.title} fit preview did not follow its resized container`,
      );
    });
    fitChecks += 1;

    await page.reload({ waitUntil: "networkidle" });
    await verifyFitPreview(
      page,
      witnessDetail,
      `${fitWitness.title} after a fit reload`,
    );
    fitChecks += 1;

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

      const witness = fitWitness;
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

      const narrowFitUrl = new URL(compositionRecipePath(witness.id), origin);
      narrowFitUrl.searchParams.set("theme", "dark");
      await loadCataloguePage(page, narrowFitUrl.href);
      await verifyFitPreview(
        page,
        page.locator(`[data-discern-composition-detail="${witness.id}"]`),
        `The narrow-viewport ${witness.title}`,
      );
      fitChecks += 1;
    });

    return {
      patterns: compositionRecipes.length,
      widthChecks,
      fitChecks,
      themeChecks,
      accessibilityScans,
      copyChecks,
      keyboardChecks,
      interactionChecks,
    };
  });
}

async function sourceCopyCheck(
  page: Page,
  detail: Locator,
  recipe: CompositionRecipe,
): Promise<void> {
  await detail.locator(".discern-catalogue-pattern__source > summary").click();
  await detail.getByRole("button", {
    name: "Copy adaptable example source",
  }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  invariant(
    copied === recipe.source,
    "Adaptable source copy differed from its recipe",
  );
  for (const file of recipe.sourceFiles?.slice(1) ?? []) {
    await detail.getByRole("button", { name: `Copy ${file.name}`, exact: true })
      .click();
    invariant(
      await page.evaluate(() => navigator.clipboard.readText()) === file.source,
      `${recipe.title} did not copy the exact ${file.name} source`,
    );
  }
}
