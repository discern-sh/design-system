import type { Page } from "playwright-core";
import { cliCompositionRecipes } from "../../../catalogue/cli-compositions.ts";
import {
  catalogueRoutePaths,
  catalogueTerminalLayoutPath,
} from "../../../catalogue/routes.ts";
import {
  parseTerminalLabState,
  terminalViewportPresets,
} from "../../../catalogue/terminal-lab-state.ts";
import { projectTerminalLayoutRecipe } from "../../../catalogue/terminal-layout-inspector.tsx";
import { inspectTerminalLayout } from "../../../src/cli/projection.ts";
import { withViewport } from "../../viewport.ts";
import {
  verifyInlineOverflowCueEdges,
  verifyOverflowCueCatalogue,
} from "./overflow-cue.ts";
import {
  CATALOGUE_NARROW_VIEWPORT,
  CATALOGUE_TERMINAL_VIEWPORT,
  eventually,
  invariant,
  loadCataloguePage,
  selectCatalogueTheme,
} from "./support.ts";
import type { CatalogueTheme } from "./support.ts";

export interface TerminalCatalogueEvidence {
  readonly layouts: number;
  readonly profileChecks: number;
  readonly componentSpecimens: number;
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

export async function verifyTerminalCatalogue(
  page: Page,
  origin: string,
): Promise<TerminalCatalogueEvidence> {
  return await withViewport(page, CATALOGUE_TERMINAL_VIEWPORT, async () => {
    const terminalUrl = new URL(catalogueRoutePaths.terminal, origin);
    terminalUrl.searchParams.set("theme", "light");
    await loadCataloguePage(page, terminalUrl.href);

    const indexCards = page.locator("[data-discern-terminal-index-card]");
    const layoutCount = await indexCards.count();
    invariant(
      layoutCount === cliCompositionRecipes.length,
      "Terminal layout index differs from its recipe authority",
    );
    invariant(
      await indexCards.locator(
        "[data-discern-catalogue-index-card-primary]",
      ).count() === cliCompositionRecipes.length,
      "Terminal layouts bypassed the shared whole-card authority",
    );
    const indexContracts = await indexCards.evaluateAll((nodes) =>
      nodes.map((node) => {
        const primary = node.querySelector<HTMLElement>(
          "[data-discern-catalogue-index-card-primary]",
        );
        const stretched = primary === null
          ? null
          : getComputedStyle(primary, "::after");
        const action = node.querySelector<HTMLElement>(
          ".discern-catalogue-index-card__action",
        );
        return {
          nestedInteractive: primary?.querySelector(
            "a, button, input, select, textarea, summary",
          ) !== null,
          stretched: stretched?.position === "absolute" &&
            stretched.top === "0px" && stretched.right === "0px" &&
            stretched.bottom === "0px" && stretched.left === "0px",
          actionBackground: action === null
            ? "missing"
            : getComputedStyle(action).backgroundColor,
        };
      })
    );
    invariant(
      indexContracts.every((contract) =>
        !contract.nestedInteractive && contract.stretched &&
        contract.actionBackground === "rgba(0, 0, 0, 0)"
      ),
      "Terminal cards lost their stretched link or restored the bespoke blue CTA",
    );
    invariant(
      await page.locator("[data-discern-terminal-inspector]").count() === 0,
      "Terminal layout index must not mount every complete inspector",
    );
    let profileChecks = 0;
    for (const [recipeIndex, recipe] of cliCompositionRecipes.entries()) {
      for (
        const [presetIndex, preset] of terminalViewportPresets.entries()
      ) {
        const detailUrl = new URL(
          catalogueTerminalLayoutPath(recipe.id),
          origin,
        );
        detailUrl.searchParams.set("preset", preset.id);
        detailUrl.searchParams.set("theme", "light");
        detailUrl.searchParams.set("grid", presetIndex % 2 === 0 ? "1" : "0");
        if (recipe.capabilityControls.includes("unicode")) {
          detailUrl.searchParams.set(
            "unicode",
            (recipeIndex + presetIndex) % 2 === 0 ? "1" : "0",
          );
        }
        if (recipe.capabilityControls.includes("colorDepth")) {
          detailUrl.searchParams.set(
            "color",
            presetIndex % 2 === 0 ? "truecolor" : "ansi16",
          );
        }
        if (recipe.capabilityControls.includes("hyperlinks")) {
          detailUrl.searchParams.set(
            "hyperlinks",
            presetIndex % 2 === 0 ? "1" : "0",
          );
        }
        await loadCataloguePage(page, detailUrl.href);

        const inspector = page.locator("[data-discern-terminal-inspector]");
        invariant(
          await inspector.count() === 1,
          `${recipe.title} must mount exactly one inspector`,
        );
        invariant(
          await inspector.getAttribute("data-discern-terminal-columns") ===
              String(preset.columns) &&
            await inspector.getAttribute("data-discern-terminal-rows") ===
              String(preset.rows),
          `${recipe.title} / ${preset.label} did not reach the public inspector`,
        );
        const parsed = parseTerminalLabState(
          detailUrl.searchParams,
          recipe.capabilityControls,
        );
        const expected = projectTerminalLayoutRecipe(
          recipe,
          parsed.state,
          "light",
        );
        const expectedInspection = inspectTerminalLayout(expected.output, {
          columns: preset.columns,
          rows: preset.rows,
        });
        const caption = await inspector.locator("figcaption").textContent() ??
          "";
        const geometryFacts = [
          `${preset.columns} × ${preset.rows} viewport`,
          `${expectedInspection.contentRows} content row${
            expectedInspection.contentRows === 1 ? "" : "s"
          }`,
          `${expectedInspection.maximumColumns} max columns`,
          expectedInspection.rowsBelowFold === 0
            ? `${expectedInspection.spareRows} rows spare`
            : `${expectedInspection.rowsBelowFold} below fold`,
          ...(expectedInspection.overflowRows.length === 0 ? [] : [
            `${expectedInspection.overflowRows.length} overflow row${
              expectedInspection.overflowRows.length === 1 ? "" : "s"
            }`,
          ]),
        ];
        invariant(
          geometryFacts.every((fact) => caption.includes(fact)),
          `${recipe.title} / ${preset.label} reported geometry outside the projector authority`,
        );
        const documentOverflow = await page.evaluate(() =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
        );
        invariant(
          documentOverflow <= 1,
          `${recipe.title} / ${preset.label} overflowed the document by ${documentOverflow}px`,
        );
        profileChecks += 1;
      }
    }

    const activeRecipe = cliCompositionRecipes[0];
    invariant(activeRecipe !== undefined, "Terminal Catalogue needs a recipe");
    const customUrl = new URL(
      catalogueTerminalLayoutPath(activeRecipe.id),
      origin,
    );
    customUrl.search =
      "?preset=wide&columns=97&rows=33&unicode=0&color=ansi256&grid=1&theme=light";
    await loadCataloguePage(page, customUrl.href);
    invariant(
      await page.locator("[data-discern-terminal-lab-mode]").textContent() ===
        "Custom",
      "Explicit terminal geometry must visibly enter Custom state",
    );
    invariant(
      await page.getByRole("spinbutton", { name: "Columns" }).inputValue() ===
          "97" &&
        await page.getByRole("spinbutton", { name: "Rows" }).inputValue() ===
          "33",
      "Custom URL geometry did not populate the lab controls",
    );
    const compactControls = await page.locator(
      ".discern-catalogue-terminal-lab__fields :is(input, select)",
    ).evaluateAll((nodes) =>
      nodes.map((node) => ({
        height: node.getBoundingClientRect().height,
        publicSelect: node.tagName !== "SELECT" ||
          (node.classList.contains("discern-control") &&
            node.parentElement?.classList.contains("discern-select") === true),
      }))
    );
    invariant(
      compactControls.length >= 4 &&
        compactControls.every((control) =>
          Math.abs(control.height - 42) <= 0.5 && control.publicSelect
        ),
      `Terminal lab controls diverged from the 42px public control row: ${
        JSON.stringify(compactControls)
      }`,
    );

    await page.getByRole("button", { name: "Copy raw terminal output" })
      .click();
    const rawCopy = await page.evaluate(() => navigator.clipboard.readText());
    const expectedCustom = projectTerminalLayoutRecipe(
      activeRecipe,
      parseTerminalLabState(
        customUrl.searchParams,
        activeRecipe.capabilityControls,
      ).state,
      "light",
    );
    invariant(
      rawCopy === expectedCustom.output,
      "Raw-output copy diverged from the active recipe renderer",
    );
    await page.getByText("Adaptable composition source", { exact: true })
      .click();
    await withViewport(page, CATALOGUE_NARROW_VIEWPORT, async () => {
      await verifyInlineOverflowCueEdges(
        page.locator(".discern-catalogue-terminal-lab__source-cue"),
        "Terminal adaptable source",
      );
    });
    await page.getByRole("button", {
      name: "Copy adaptable composition source",
    }).click();
    const sourceCopy = await page.evaluate(() =>
      navigator.clipboard.readText()
    );
    invariant(
      sourceCopy === activeRecipe.source && sourceCopy !== rawCopy,
      "Source copy must match the recipe authority and differ from raw output",
    );

    const invalidUrl = new URL(customUrl.href);
    invalidUrl.search = "?preset=unknown&columns=9999&rows=-2&theme=light";
    await loadCataloguePage(page, invalidUrl.href);
    const recoveryNotice = page.locator(
      ".discern-catalogue-terminal-lab__notice[role=status]",
    );
    invariant(
      await recoveryNotice.count() === 1 &&
        (await recoveryNotice.textContent())?.includes("Standard 80×24") ===
          true,
      "Invalid shared lab state needs an accessible bounded recovery explanation",
    );

    const inspectors = page.locator("[data-discern-terminal-theme]");
    const activeTerminalLayoutUses = async (
      theme: CatalogueTheme,
    ): Promise<boolean> =>
      await inspectors.count() === 1 &&
      await inspectors.first().getAttribute("data-discern-terminal-theme") ===
        theme;
    invariant(
      await activeTerminalLayoutUses("light"),
      "Light mode did not reach the active terminal layout",
    );
    await selectCatalogueTheme(page, "dark");
    await eventually(
      async () => await activeTerminalLayoutUses("dark"),
      "Dark mode did not reach the active terminal layout",
    );

    const edgeUrl = new URL(
      catalogueTerminalLayoutPath(activeRecipe.id),
      origin,
    );
    edgeUrl.search =
      "?preset=tall&unicode=1&color=truecolor&grid=0&theme=light";
    await loadCataloguePage(page, edgeUrl.href);
    const cue = page.locator(".discern-catalogue-terminal-lab__frame");
    const viewport = cue.locator("[data-discern-terminal-viewport]");
    await eventually(
      async () =>
        await cue.getAttribute("data-discern-overflow-cue-block-end") ===
          "true",
      "Tall terminal frame did not advertise remaining block content",
    );
    await viewport.evaluate((node) => {
      const target = node as HTMLElement;
      target.scrollTop = target.scrollHeight;
    });
    await eventually(
      async () =>
        await cue.getAttribute("data-discern-overflow-cue-block-start") ===
          "true" &&
        await cue.getAttribute("data-discern-overflow-cue-block-end") ===
          "false",
      "Terminal frame block cues did not follow its terminal edge",
    );
    await withViewport(page, CATALOGUE_NARROW_VIEWPORT, async () => {
      await eventually(
        async () =>
          await cue.getAttribute("data-discern-overflow-cue-inline-end") ===
            "true",
        "Narrow Terminal lab did not advertise remaining inline content",
      );
      await viewport.evaluate((node) => {
        const target = node as HTMLElement;
        target.scrollLeft = target.scrollWidth;
      });
      await eventually(
        async () =>
          await cue.getAttribute("data-discern-overflow-cue-inline-start") ===
            "true" &&
          await cue.getAttribute("data-discern-overflow-cue-inline-end") ===
            "false",
        "Terminal frame inline cues did not follow its terminal edge",
      );
      const documentOverflow = await page.evaluate(() =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
      );
      invariant(
        documentOverflow <= 1,
        `Narrow Terminal lab overflowed its document by ${documentOverflow}px`,
      );
    });

    await verifyOverflowCueCatalogue(page, origin);

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

    await selectCatalogueTheme(page, "dark");
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
    };
  });
}
