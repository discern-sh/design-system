import type { Browser } from "playwright-core";
import { catalogueNavigation } from "../catalogue/routes.ts";
import { packageManifest } from "../src/manifest.ts";
import { addPageFailureListeners } from "./browser-conformance-support.ts";
import { launchBrowser } from "./browser.ts";
import { runBuilderConformance } from "./builder-conformance.ts";
import { buildDesignSystem } from "./build.ts";
import {
  runComponentContractConformance,
} from "./conformance/catalogue/components.ts";
import type {
  ComponentContractEvidence,
} from "./conformance/catalogue/components.ts";
import {
  assertCatalogueBrowserCheckRunners,
  assertCatalogueFamilyBrowserCoverage,
  catalogueBrowserCheckPlan,
} from "./conformance/catalogue/browser-check-plan.ts";
import type {
  CatalogueBrowserCheckId,
} from "./conformance/catalogue/browser-check-plan.ts";
import {
  verifyCompositionsCatalogue,
} from "./conformance/catalogue/compositions.ts";
import type {
  CompositionsCatalogueEvidence,
} from "./conformance/catalogue/compositions.ts";
import {
  verifyFoundationsCatalogue,
} from "./conformance/catalogue/foundations.ts";
import type {
  FoundationsCatalogueEvidence,
} from "./conformance/catalogue/foundations.ts";
import { verifyLandingPage } from "./conformance/catalogue/front-doors.ts";
import { verifyCatalogueShell } from "./conformance/catalogue/shell.ts";
import type { CatalogueShellEvidence } from "./conformance/catalogue/shell.ts";
import { verifyTerminalCatalogue } from "./conformance/catalogue/terminal.ts";
import { verifyComponentReviewInstrument } from "./conformance/catalogue/review.ts";
import type {
  TerminalCatalogueEvidence,
} from "./conformance/catalogue/terminal.ts";
import { invariant } from "./conformance/catalogue/support.ts";
import { runResilienceConformance } from "./resilience-conformance.ts";
import catalogueServer from "./serve.ts";

const OUTPUT_ROOT = new URL("../dist/conformance/", import.meta.url);
const WIDE_VIEWPORT = { width: 1440, height: 1000 } as const;

const emptyComponentEvidence: ComponentContractEvidence = {
  floatingSurfaces: 0,
  accessibilityScans: 0,
  scenarios: 0,
  screenshots: 0,
  forcedColorFocusChecks: 0,
  metadataRoleChecks: 0,
};
const emptyTerminalEvidence: TerminalCatalogueEvidence = {
  layouts: 0,
  profileChecks: 0,
  componentSpecimens: 0,
};
const emptyFoundationsEvidence: FoundationsCatalogueEvidence = {
  sheets: 0,
  specimens: 0,
  animationChecks: 0,
  tokenChecks: 0,
  reflowChecks: 0,
};
const emptyCompositionsEvidence: CompositionsCatalogueEvidence = {
  patterns: 0,
  widthChecks: 0,
  themeChecks: 0,
  accessibilityScans: 0,
  copyChecks: 0,
  keyboardChecks: 0,
};
const emptyShellEvidence: CatalogueShellEvidence = {
  routeShapes: 0,
  axeScans: 0,
  drawerChecks: 0,
  searchChecks: 0,
  appearanceChecks: 0,
  reflowChecks: 0,
  metadataRoleChecks: 0,
};

/** Build and exercise every Component and Catalogue family in Chromium. */
export async function runConformance(): Promise<void> {
  await buildDesignSystem();
  const server = Deno.serve({
    hostname: "127.0.0.1",
    port: 0,
    onListen: () => undefined,
  }, catalogueServer.fetch);
  const address = server.addr;
  invariant(address.transport === "tcp", "Catalogue server is not using TCP");
  const origin = `http://127.0.0.1:${address.port}`;
  const expectedComponents = packageManifest.components.map(({ id }) => id);
  const failures: string[] = [];
  let browser: Browser | undefined;

  try {
    const activeBrowser = await launchBrowser();
    browser = activeBrowser;
    const context = await activeBrowser.newContext({
      viewport: WIDE_VIEWPORT,
      reducedMotion: "reduce",
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const page = await context.newPage();
    addPageFailureListeners(page, failures);

    let components = emptyComponentEvidence;
    let foundations = emptyFoundationsEvidence;
    let compositions = emptyCompositionsEvidence;
    let terminal = emptyTerminalEvidence;
    let shell = emptyShellEvidence;
    let landingAxeScans = 0;
    const catalogueCheckRunners: Readonly<
      Record<CatalogueBrowserCheckId, () => Promise<void>>
    > = {
      components: async () => {
        components = await runComponentContractConformance(
          activeBrowser,
          page,
          origin,
          expectedComponents,
          failures,
        );
      },
      foundations: async () => {
        foundations = await verifyFoundationsCatalogue(page, origin);
      },
      compositions: async () => {
        compositions = await verifyCompositionsCatalogue(page, origin);
      },
      terminal: async () => {
        terminal = await verifyTerminalCatalogue(page, origin);
      },
      shell: async () => {
        shell = await verifyCatalogueShell(page, origin);
      },
      "front-doors": async () => {
        landingAxeScans = await verifyLandingPage(page, origin, failures);
      },
    };
    assertCatalogueFamilyBrowserCoverage(catalogueNavigation);
    assertCatalogueBrowserCheckRunners(
      Object.keys(catalogueCheckRunners),
    );
    for (const check of catalogueBrowserCheckPlan) {
      try {
        await catalogueCheckRunners[check.id]();
      } catch (error) {
        failures.push(
          `${check.failureLabel}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const review = await verifyComponentReviewInstrument(
      activeBrowser,
      origin,
      failures,
    );

    const resilience = await runResilienceConformance(
      activeBrowser,
      page,
      origin,
      failures,
    );
    const builder = await runBuilderConformance({
      browser: activeBrowser,
      page,
      origin,
      failures,
      outputRoot: OUTPUT_ROOT,
    });
    await context.close();

    const failureCounts = failures.reduce<Record<string, number>>(
      (counts, failure) => {
        const category = failure.split(":")[0] ?? "Unclassified";
        counts[category] = (counts[category] ?? 0) + 1;
        return counts;
      },
      {},
    );
    invariant(
      failures.length === 0,
      `Component conformance failed:\n- ${failures.join("\n- ")}\n` +
        `Detector failure counts: ${JSON.stringify(failureCounts)}\n` +
        `Resilience populations: ${JSON.stringify(resilience)}\n` +
        `Builder populations: ${JSON.stringify(builder)}`,
    );

    const coveredFontAliases =
      resilience.fontFallbackAliasesCovered.join(", ") || "none";
    const skippedFontAliases =
      resilience.fontFallbackAliasesSkipped.join(", ") || "none";
    console.log(
      `Conformance passed: ${expectedComponents.length} components, ` +
        `${components.accessibilityScans} component accessibility scans, ` +
        `${components.scenarios} interaction scenarios, ` +
        `${components.forcedColorFocusChecks} forced-colour focus checks, and ` +
        `${components.metadataRoleChecks + shell.metadataRoleChecks} ` +
        `metadata-role checks; ` +
        `${components.screenshots + 1} review screenshots; ` +
        `${components.floatingSurfaces} floating surfaces share the clipping cure. ` +
        `Catalogue shell passed ${shell.routeShapes} route shapes, ` +
        `${shell.axeScans} axe scans, ${shell.reflowChecks} reflow checks, ` +
        `${shell.drawerChecks} drawer checks, ${shell.searchChecks} search checks, ` +
        `and ${shell.appearanceChecks} appearance checks. ` +
        `Terminal Catalogue passed ${terminal.profileChecks} profile fits across ` +
        `${terminal.layouts} layouts and re-themed ${terminal.componentSpecimens} ` +
        `Component specimens. ` +
        `Foundations passed ${foundations.tokenChecks} Token checks and auto-enrolled ` +
        `${foundations.specimens} specimens across ${foundations.sheets} terminal ` +
        `foundations with ${foundations.animationChecks} reduced-motion and playback ` +
        `checks plus ${foundations.reflowChecks} reflow checks. ` +
        `Compositions passed ${compositions.widthChecks} width checks and ` +
        `${compositions.themeChecks} theme checks across ${compositions.patterns} ` +
        `patterns, with ${compositions.accessibilityScans} accessibility scans, ` +
        `${compositions.copyChecks} copy checks, and ${compositions.keyboardChecks} ` +
        `keyboard checks. ` +
        `The landing page passed ${landingAxeScans} axe scans. ` +
        `Posture review exposed ${review.items} bounded contact items, ` +
        `${review.checkpoints} source-backed checkpoints, ` +
        `${review.matrixItems} tiered matrix items, ${review.appearanceCases} ` +
        `accent Appearance cases, ${review.semanticAppearanceCases} semantic ` +
        `Appearance cases, ${review.responsiveCases} local-responsive cases, ` +
        `${review.scrollFocusCases} scroll-focus cases, ${review.motionCases} ` +
        `motion cases, ${review.coarsePointerCases} coarse-pointer cases, and ` +
        `${review.accessibilityScans} axe scan; wrote ` +
        `${review.outputFiles} files / ${review.outputBytes} bytes in ` +
        `${review.durationMs}ms. ` +
        `Journey resilience passed: ${resilience.journeys} journeys, ` +
        `${resilience.journeyStages} ordered stages, ` +
        `${resilience.journeyAxeScans} axe scans, ` +
        `${resilience.journeyTabStops} keyboard stops, ` +
        `${resilience.journeyCommandCopies} command copies, ` +
        `${resilience.disclosures} disclosures with ` +
        `${resilience.disclosureToggles} keyboard toggles, ` +
        `${resilience.interactiveControls} interactive controls, ` +
        `${resilience.targets} measured targets ` +
        `(${resilience.inlineTextTargetExceptions} inline-text exceptions, ` +
        `${resilience.labelledControlBoxes} native label boxes), ` +
        `${resilience.reflowSurfaces} reflow surfaces with ` +
        `${resilience.containedOverflowRegions} contained wide regions, ` +
        `${resilience.motionTargets} motion targets, ` +
        `${resilience.themeConsumers} theme consumer with ` +
        `${resilience.themeGeometryChecks} stable geometry checks, ` +
        `${resilience.fontFallbackChecks} font fallback checks across ` +
        `${resilience.fontMetricOverrideFaces} source-audited metric faces ` +
        `(covered aliases: ${coveredFontAliases}; skipped aliases: ` +
        `${skippedFontAliases}; maximum ` +
        `${
          resilience.maxFontWidthDeltaPercent.toFixed(2)
        }% width residual and ` +
        `${
          resilience.maxFontLineBoxDeltaPixels.toFixed(2)
        }px normal-line residual), ` +
        `and ${resilience.semanticFocusTargets} semantic-surface focus targets ` +
        `across ${resilience.semanticFocusRoles.join(", ")}. ` +
        `Builder passed ${builder.adaptiveCases} theme/viewport cases, ` +
        `${builder.paneTransitions} adaptive pane transitions, ` +
        `${builder.axeScans} axe scans, ${builder.keyboardStops} finite keyboard stops, ` +
        `${builder.authoringChecks} authoring checks, ` +
        `${builder.shortcutIsolationChecks} shortcut-isolation checks, ` +
        `${builder.touchChecks} touch checks, ` +
        `${builder.containedFailures} contained failure scenarios, ` +
        `${builder.forcedColourFocusChecks} forced-colour focus checks, and ` +
        `${builder.screenshots.length} review screenshots.`,
    );
  } finally {
    await browser?.close();
    await server.shutdown();
  }
}

if (import.meta.main) await runConformance();
