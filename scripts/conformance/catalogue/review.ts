import { fromFileUrl } from "@std/path";
import type { Browser, Page } from "playwright-core";
import {
  catalogueAppearanceOptions,
} from "../../../catalogue/shell/appearance-options.ts";
import { componentReviewPath } from "../../../catalogue/review/state.ts";
import { reviewInlineSizes } from "../../../catalogue/review-postures.ts";
import {
  componentReviewInlineSize,
  componentViewportLayoutPolicies,
} from "../../../catalogue/review/responsive-ownership.ts";
import { registry } from "../../../catalogue/generated/registry.ts";
import { componentGroups } from "../../../src/types/component-meta.ts";
import {
  addPageFailureListeners,
  scanBrowserAccessibility,
} from "../../browser-conformance-support.ts";
import { writeComponentReviewManifest } from "../../component-review.ts";
import { withViewport } from "../../viewport.ts";
import { invariant } from "./support.ts";

const OUTPUT_ROOT = new URL("../../../dist/conformance/", import.meta.url);

export interface ComponentReviewEvidence {
  readonly items: number;
  readonly checkpoints: number;
  readonly matrixItems: number;
  readonly appearanceCases: number;
  readonly semanticAppearanceCases: number;
  readonly responsiveCases: number;
  readonly scrollFocusCases: number;
  readonly motionCases: number;
  readonly coarsePointerCases: number;
  readonly accessibilityScans: number;
  readonly screenshots: readonly string[];
  readonly outputFiles: number;
  readonly outputBytes: number;
  readonly durationMs: number;
}

interface LocalResponsiveCase {
  readonly group: string;
  readonly component: string;
  readonly example: string;
  readonly target: string;
  readonly property: string;
  readonly comparisonWidth: "medium" | "wide";
}

const localResponsiveCases: readonly LocalResponsiveCase[] = [
  {
    group: "Docs",
    component: "pager",
    example: "default",
    target: ".discern-pager__link--previous",
    property: "grid-column",
    comparisonWidth: "wide",
  },
  {
    group: "Agents",
    component: "fleet",
    example: "default",
    target: ".discern-fleet__row",
    property: "grid-template-columns",
    comparisonWidth: "wide",
  },
  {
    group: "Workflow",
    component: "diagnostic",
    example: "verbose-failure",
    target: ".discern-diagnostic__correction",
    property: "grid-template-columns",
    comparisonWidth: "wide",
  },
  {
    group: "Workflow",
    component: "rule",
    example: "default",
    target: ".discern-rule__layout",
    property: "grid-template-columns",
    comparisonWidth: "wide",
  },
  {
    group: "Editorial",
    component: "data-figure",
    example: "default",
    target: ".discern-data-figure > header",
    property: "flex-direction",
    comparisonWidth: "wide",
  },
  {
    group: "Editorial",
    component: "table-of-contents",
    example: "default",
    target: ".discern-table-of-contents ol",
    property: "grid-template-columns",
    comparisonWidth: "medium",
  },
  {
    group: "Marketing",
    component: "case-study",
    example: "default",
    target: ".discern-case-study__inner",
    property: "grid-template-columns",
    comparisonWidth: "wide",
  },
  {
    group: "Marketing",
    component: "hero-block",
    example: "split",
    target: ".discern-hero-block__inner",
    property: "grid-template-columns",
    comparisonWidth: "wide",
  },
  {
    group: "Marketing",
    component: "marketing-intro",
    example: "editorial",
    target: ".discern-marketing-intro__title",
    property: "font-size",
    comparisonWidth: "wide",
  },
];

interface ScrollFocusCase {
  readonly group: string;
  readonly component: string;
  readonly example: string;
  readonly target: string;
  readonly mustOverflow: boolean;
}

const scrollFocusCases: readonly ScrollFocusCase[] = [
  {
    group: "Display",
    component: "table",
    example: "dense-overflow",
    target: ".discern-table",
    mustOverflow: true,
  },
  {
    group: "Editorial",
    component: "code-block",
    example: "preserved-width",
    target: ".discern-code-block",
    mustOverflow: true,
  },
  {
    group: "Workflow",
    component: "command",
    example: "overflow",
    target: ".discern-command__text",
    mustOverflow: true,
  },
  {
    group: "Workflow",
    component: "diagnostic",
    example: "verbose-failure",
    target: ".discern-diagnostic__evidence pre",
    mustOverflow: true,
  },
  {
    group: "Workflow",
    component: "expected-result",
    example: "output",
    target: ".discern-expected-result__output",
    mustOverflow: false,
  },
  {
    group: "Workflow",
    component: "raw-output",
    example: "expanded",
    target: ".discern-raw-output__content",
    mustOverflow: false,
  },
];

function reviewUrl(
  origin: string,
  inputs: Readonly<Record<string, string>>,
): string {
  const url = new URL(componentReviewPath, origin);
  for (const [name, value] of Object.entries(inputs)) {
    url.searchParams.set(name, value);
  }
  return url.href;
}

async function loadReview(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator(
    'html[data-discern-review-status="ready"], html[data-discern-review-status="error"]',
  ).waitFor();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const error = await page.locator("html").getAttribute(
    "data-discern-review-error",
  );
  invariant(error === null, `Component review failed: ${error}`);
}

/** Exercise the local-only instrument in an ordinary-motion browser realm. */
export async function verifyComponentReviewInstrument(
  browser: Browser,
  origin: string,
  failures: string[],
): Promise<ComponentReviewEvidence> {
  const started = performance.now();
  const manifest = await writeComponentReviewManifest();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  addPageFailureListeners(page, failures);
  const screenshots: string[] = [];
  let accessibilityScans = 0;
  let items = 0;
  try {
    for (const group of componentGroups) {
      await loadReview(
        page,
        reviewUrl(origin, {
          group,
          width: "medium",
          theme: "light",
          appearance: "field",
          motion: "ordinary",
          mode: "contact",
          speed: "production",
        }),
      );
      const expected = registry.filter((entry) => entry.meta.group === group)
        .reduce((sum, entry) => sum + entry.webExamples.length, 0);
      const actual = await page.locator("[data-discern-review-item]").count();
      invariant(
        actual === expected,
        `${group} settled review enrolled ${actual} of ${expected} canonical Web examples`,
      );
      items += actual;
    }
    const expectedItems = registry.reduce(
      (sum, entry) => sum + entry.webExamples.length,
      0,
    );
    invariant(
      items === expectedItems,
      `Settled review enrolled ${items} of ${expectedItems} canonical Web examples`,
    );

    await loadReview(
      page,
      reviewUrl(origin, {
        group: "Core",
        width: "medium",
        theme: "light",
        appearance: "field",
        motion: "ordinary",
        mode: "contact",
        speed: "production",
      }),
    );
    const cards = page.locator("[data-discern-review-item]");
    const coreItems = await cards.count();
    invariant(
      coreItems > 0 && coreItems < manifest.components,
      "Group review mounted the full population",
    );
    const componentSlugs = await cards.evaluateAll((nodes) =>
      nodes.map((node) =>
        node.getAttribute("data-discern-review-item")?.split("/")[0]
      )
    );
    invariant(
      componentSlugs.every((slug) => slug !== undefined),
      "Review cards lost Component identity",
    );
    const specimen = page.locator("[data-discern-review-identity]").first();
    const bounds = await specimen.boundingBox();
    invariant(
      bounds !== null && Math.abs(bounds.width - 720) <= 0.5,
      "Local medium width is not 720px",
    );
    const viewport = await page.locator("[data-discern-review-page-viewport]")
      .textContent();
    invariant(
      viewport?.includes("1440×1000px") && viewport.includes("720px"),
      "Page and local widths were conflated",
    );
    const axe = await scanBrowserAccessibility(page, ".discern-review-shell");
    accessibilityScans += 1;
    for (const violation of axe.violations) {
      failures.push(`Component review accessibility: ${violation.id}`);
    }
    const contactPath = fromFileUrl(
      new URL("component-review-contact.png", OUTPUT_ROOT),
    );
    await page.screenshot({
      path: contactPath,
      fullPage: true,
      animations: "disabled",
    });
    screenshots.push(contactPath);

    let appearanceCases = 0;
    let semanticAppearanceCases = 0;
    let responsiveCases = 0;
    let scrollFocusCaseCount = 0;
    let motionCases = 0;
    let coarsePointerCases = 0;
    for (const theme of ["light", "dark"] as const) {
      for (const option of catalogueAppearanceOptions) {
        await loadReview(
          page,
          reviewUrl(origin, {
            group: "Core",
            component: "button",
            example: "default",
            posture: "settled-default",
            width: "narrow",
            theme,
            appearance: "accent",
            accent: String(option.hue),
            motion: "ordinary",
            mode: "contact",
            speed: "production",
          }),
        );
        const appliedAppearance = await page.locator(
          "[data-discern-review-identity]",
        ).evaluate((element) => ({
          appearance: element.getAttribute("data-discern-appearance"),
          hue: getComputedStyle(element).getPropertyValue(
            "--discern-accent-hue",
          ).trim(),
        }));
        invariant(
          appliedAppearance.appearance === "accent" &&
            Number(appliedAppearance.hue) === option.hue,
          `${theme}/${option.id} numeric Accent did not reach the specimen: ${
            JSON.stringify(appliedAppearance)
          }`,
        );
        appearanceCases += 1;

        await loadReview(
          page,
          reviewUrl(origin, {
            group: "Forms",
            component: "radio",
            example: "validation-error",
            posture: "settled-validation-error",
            width: "narrow",
            theme,
            appearance: "accent",
            accent: String(option.hue),
            motion: "ordinary",
            mode: "reel",
            speed: "production",
          }),
        );
        const validationColour = await page.locator(
          'fieldset[aria-invalid="true"] .discern-choice input:not(:disabled) + .discern-choice__control',
        ).first().evaluate((element) => {
          const marker = element.ownerDocument.createElement("span");
          marker.style.position = "absolute";
          marker.style.color = "var(--discern-color-danger)";
          element.parentElement?.append(marker);
          const danger = getComputedStyle(marker).color;
          marker.style.color = "var(--discern-color-accent-600)";
          const accent = getComputedStyle(marker).color;
          marker.remove();
          const style = getComputedStyle(element);
          return {
            accent,
            border: style.borderColor,
            borderWidth: Number.parseFloat(style.borderWidth),
            danger,
          };
        });
        invariant(
          validationColour.border === validationColour.danger &&
            validationColour.border !== validationColour.accent &&
            validationColour.borderWidth >= 2,
          `${theme}/${option.id} Radio validation followed Appearance instead of danger semantics`,
        );
        semanticAppearanceCases += 1;
      }
    }

    const measureResponsiveCase = async (
      reviewCase: LocalResponsiveCase,
      localWidth: "narrow" | "medium" | "wide",
      pageWidth: number,
    ) =>
      await withViewport(
        page,
        { width: pageWidth, height: 1000 },
        async () => {
          await loadReview(
            page,
            reviewUrl(origin, {
              group: reviewCase.group,
              component: reviewCase.component,
              example: reviewCase.example,
              width: localWidth,
              theme: "light",
              appearance: "accent",
              accent: "255",
              motion: "reduced",
              mode: "reel",
              speed: "production",
            }),
          );
          const root = page.locator(`.discern-${reviewCase.component}`)
            .first();
          const target = page.locator(reviewCase.target).first();
          invariant(
            await root.isVisible() && await target.isVisible(),
            `${reviewCase.component} responsive witness is not visible`,
          );
          const geometry = await root.evaluate((element) => ({
            clientWidth: (element as HTMLElement).clientWidth,
            scrollWidth: (element as HTMLElement).scrollWidth,
          }));
          invariant(
            geometry.scrollWidth <= geometry.clientWidth + 1,
            `${reviewCase.component} leaked ${geometry.scrollWidth}px through a ${geometry.clientWidth}px local allocation`,
          );
          return {
            ...geometry,
            signature: await target.evaluate(
              (element, property) =>
                getComputedStyle(element).getPropertyValue(property),
              reviewCase.property,
            ),
          };
        },
      );

    for (const reviewCase of localResponsiveCases) {
      const widePageNarrowLocal = await measureResponsiveCase(
        reviewCase,
        "narrow",
        1440,
      );
      const narrowPageNarrowLocal = await measureResponsiveCase(
        reviewCase,
        "narrow",
        430,
      );
      invariant(
        widePageNarrowLocal.signature === narrowPageNarrowLocal.signature &&
          Math.abs(
              widePageNarrowLocal.clientWidth -
                narrowPageNarrowLocal.clientWidth,
            ) <= 0.5,
        `${reviewCase.component} changed with page width despite the same local allocation`,
      );
      const comparison = await measureResponsiveCase(
        reviewCase,
        reviewCase.comparisonWidth,
        1440,
      );
      invariant(
        comparison.signature !== widePageNarrowLocal.signature,
        `${reviewCase.component} did not change geometry across its local-width class`,
      );
      responsiveCases += 3;
    }

    const pageResponsivePolicies = componentViewportLayoutPolicies.filter(
      ({ reviewAllocation }) => reviewAllocation === "page",
    );
    const pageResponsiveGroups = [
      ...new Set(pageResponsivePolicies.map(
        ({ slug }) => {
          const entry = registry.find((candidate) =>
            candidate.meta.slug === slug
          );
          invariant(
            entry !== undefined,
            `${slug} page-responsive policy is stale`,
          );
          return entry.meta.group;
        },
      )),
    ];
    for (const pageWidth of [1440, 430] as const) {
      const requestedWidth = pageWidth === 1440 ? "narrow" : "wide";
      for (const group of pageResponsiveGroups) {
        await withViewport(
          page,
          { width: pageWidth, height: 1000 },
          async () => {
            await loadReview(
              page,
              reviewUrl(origin, {
                group,
                width: requestedWidth,
                theme: "light",
                appearance: "accent",
                accent: "255",
                motion: "reduced",
                mode: "contact",
                speed: "production",
              }),
            );
            invariant(
              await page.evaluate(() =>
                document.documentElement.scrollWidth <=
                  document.documentElement.clientWidth + 1
              ),
              `${group} page-responsive review moved the document sideways at ${pageWidth}px`,
            );
            for (
              const policy of pageResponsivePolicies.filter(({ slug }) =>
                registry.find((entry) => entry.meta.slug === slug)?.meta
                  .group ===
                  group
              )
            ) {
              const card = page.locator(
                `[data-discern-review-item^="${policy.slug}/"]`,
              ).first();
              invariant(
                await card.count() === 1,
                `${policy.slug} page-responsive review is not enrolled`,
              );
              const specimen = card.locator(
                '[data-discern-review-responsive-allocation="page"]',
              );
              const bounds = await specimen.boundingBox();
              const expectedWidth = componentReviewInlineSize({
                slug: policy.slug,
                requestedInlineSize: reviewInlineSizes[requestedWidth],
                pageViewportWidth: pageWidth,
              });
              invariant(
                bounds !== null &&
                  Math.abs(bounds.width - expectedWidth) <= 0.5,
                `${policy.slug} used the requested local width instead of its ${expectedWidth}px page allocation`,
              );
              const root = specimen.locator(`.discern-${policy.slug}`).first();
              invariant(
                await root.isVisible(),
                `${policy.slug} page-responsive witness is not visible`,
              );
              const geometry = await root.evaluate((element) => ({
                clientWidth: (element as HTMLElement).clientWidth,
                scrollWidth: (element as HTMLElement).scrollWidth,
              }));
              invariant(
                geometry.scrollWidth <= geometry.clientWidth + 1,
                `${policy.slug} leaked ${geometry.scrollWidth}px through its ${geometry.clientWidth}px page allocation`,
              );
              responsiveCases += 1;
            }
          },
        );
      }
    }
    await loadReview(
      page,
      reviewUrl(origin, {
        group: "Feedback",
        component: "dialog",
        example: "default",
        posture: "open-dialog",
        category: "motion",
        width: "medium",
        theme: "dark",
        appearance: "accent",
        accent: "300",
        motion: "ordinary",
        mode: "reel",
        speed: "production",
      }),
    );
    invariant(
      await page.getByRole("dialog", { name: "Save changes?" }).isVisible(),
      "Motion reel did not reach its open checkpoint",
    );
    invariant(
      await page.locator(".discern-dialog__panel").evaluate((element) =>
        getComputedStyle(element).animationDuration
      ) === "0.3s",
      "Dialog ordinary motion lost its causal entrance duration",
    );
    motionCases += 1;
    const reelPath = fromFileUrl(
      new URL("component-review-reel.png", OUTPUT_ROOT),
    );
    await page.screenshot({ path: reelPath, fullPage: true });
    screenshots.push(reelPath);

    await loadReview(
      page,
      reviewUrl(origin, {
        group: "Feedback",
        component: "dialog",
        example: "default",
        posture: "close-dialog",
        category: "motion",
        width: "medium",
        theme: "dark",
        appearance: "accent",
        accent: "300",
        motion: "ordinary",
        mode: "reel",
        speed: "production",
      }),
    );
    invariant(
      !await page.getByRole("dialog", { name: "Save changes?" }).isVisible(),
      "Close reel did not reach its settled final state",
    );
    invariant(
      await page.getByRole("button", { name: "Open confirmation" }).evaluate(
        (element) => element.ownerDocument.activeElement === element,
      ),
      "Close reel did not restore trigger focus",
    );

    await loadReview(
      page,
      reviewUrl(origin, {
        group: "Feedback",
        component: "dialog",
        example: "default",
        posture: "open-dialog",
        category: "motion",
        width: "medium",
        theme: "dark",
        appearance: "accent",
        accent: "300",
        motion: "reduced",
        mode: "reel",
        speed: "production",
      }),
    );
    invariant(
      await page.getByRole("dialog", { name: "Save changes?" }).isVisible() &&
        await page.locator(".discern-dialog__panel").evaluate((element) =>
            getComputedStyle(element).animationDuration
          ) === "0s",
      "Dialog reduced motion did not preserve a complete still state",
    );
    motionCases += 1;

    await loadReview(
      page,
      reviewUrl(origin, {
        group: "Core",
        component: "button",
        example: "default",
        posture: "focus-button",
        width: "medium",
        theme: "light",
        appearance: "accent",
        accent: "255",
        motion: "ordinary",
        mode: "reel",
        speed: "production",
      }),
    );
    const productionDuration = await page.locator(
      "[data-discern-review-identity]",
    )
      .evaluate((element) =>
        getComputedStyle(element).getPropertyValue("--discern-duration-fast")
          .trim()
      );
    invariant(
      productionDuration === "150ms",
      "Production timing was changed by review",
    );
    await loadReview(
      page,
      reviewUrl(origin, {
        group: "Core",
        component: "button",
        example: "default",
        posture: "focus-button",
        width: "medium",
        theme: "light",
        appearance: "accent",
        accent: "255",
        motion: "ordinary",
        mode: "reel",
        speed: "slow",
      }),
    );
    invariant(
      await page.locator("[data-discern-review-identity]").evaluate(
        (element) =>
          getComputedStyle(element).getPropertyValue("--discern-duration-fast")
            .trim(),
      ) === "600ms",
      "Diagnostic slowdown did not stay scoped to review",
    );

    await loadReview(
      page,
      reviewUrl(origin, {
        group: "Core",
        component: "button",
        example: "default",
        posture: "press-button",
        category: "interaction",
        width: "medium",
        theme: "light",
        appearance: "accent",
        accent: "255",
        motion: "ordinary",
        mode: "reel",
        speed: "production",
      }),
    );
    const pressed = page.getByRole("button", { name: "Continue", exact: true });
    const beforeContact = await pressed.evaluate((element) => ({
      left: (element as HTMLElement).offsetLeft,
      top: (element as HTMLElement).offsetTop,
      width: (element as HTMLElement).offsetWidth,
      height: (element as HTMLElement).offsetHeight,
    }));
    await pressed.hover();
    await page.mouse.down();
    const duringContact = await pressed.evaluate((element) => ({
      left: (element as HTMLElement).offsetLeft,
      top: (element as HTMLElement).offsetTop,
      width: (element as HTMLElement).offsetWidth,
      height: (element as HTMLElement).offsetHeight,
      transform: getComputedStyle(element).transform,
    }));
    await page.mouse.up();
    invariant(
      JSON.stringify(beforeContact) === JSON.stringify({
        left: duringContact.left,
        top: duringContact.top,
        width: duringContact.width,
        height: duringContact.height,
      }),
      "Pressed feedback changed layout geometry",
    );
    invariant(
      duringContact.transform !== "none",
      "Pressed feedback was not causally visible",
    );

    for (const motion of ["ordinary", "reduced"] as const) {
      await loadReview(
        page,
        reviewUrl(origin, {
          group: "Docs",
          component: "search-palette",
          example: "default",
          posture: "open-search",
          category: "motion",
          width: "medium",
          theme: "dark",
          appearance: "accent",
          accent: "300",
          motion,
          mode: "reel",
          speed: "production",
        }),
      );
      const search = page.getByRole("searchbox", { name: "Search" });
      invariant(
        await page.locator(".discern-search-palette[open]").isVisible() &&
          await search.evaluate((element) =>
            element.ownerDocument.activeElement === element
          ),
        `Search palette ${motion} posture lost its open, focused state`,
      );
      invariant(
        await page.locator(".discern-search-palette[open]").evaluate(
          (element) => getComputedStyle(element).animationDuration,
        ) === (motion === "ordinary" ? "0.3s" : "0s"),
        `Search palette ${motion} duration is not truthful`,
      );
      motionCases += 1;
    }

    for (const scrollCase of scrollFocusCases) {
      await loadReview(
        page,
        reviewUrl(origin, {
          group: scrollCase.group,
          component: scrollCase.component,
          example: scrollCase.example,
          width: "narrow",
          theme: "dark",
          appearance: "rose",
          motion: "reduced",
          mode: "reel",
          speed: "production",
        }),
      );
      const viewport = page.locator(scrollCase.target).first();
      invariant(
        await viewport.isVisible(),
        `${scrollCase.component} scroll viewport is not visible`,
      );
      await viewport.focus();
      const focusState = await viewport.evaluate((element) => {
        const node = element as HTMLElement;
        const style = getComputedStyle(node);
        return {
          ariaLabel: node.getAttribute("aria-label") ??
            node.getAttribute("aria-labelledby"),
          clientWidth: node.clientWidth,
          focused: node.ownerDocument.activeElement === node,
          outlineStyle: style.outlineStyle,
          outlineWidth: Number.parseFloat(style.outlineWidth),
          role: node.getAttribute("role"),
          scrollWidth: node.scrollWidth,
          tabIndex: node.tabIndex,
        };
      });
      invariant(
        focusState.role === "group" && focusState.tabIndex === 0 &&
          focusState.ariaLabel !== null && focusState.ariaLabel.trim() !== "" &&
          focusState.focused && focusState.outlineStyle !== "none" &&
          focusState.outlineWidth >= 2,
        `${scrollCase.component} scroll viewport lost role, name, keyboard focus, or visible focus`,
      );
      invariant(
        !scrollCase.mustOverflow ||
          focusState.scrollWidth > focusState.clientWidth,
        `${scrollCase.component} stress example no longer exercises local overflow`,
      );
      scrollFocusCaseCount += 1;
    }

    await loadReview(
      page,
      reviewUrl(origin, {
        group: "Agents",
        component: "agent-avatar",
        example: "working",
        posture: "working-reduced",
        category: "motion",
        width: "medium",
        theme: "light",
        appearance: "accent",
        accent: "255",
        motion: "reduced",
        mode: "reel",
        speed: "production",
      }),
    );
    const working = page.locator('[data-discern-status="working"]');
    invariant(
      await working.isVisible(),
      "Reduced motion removed the final working state",
    );
    invariant(
      await working.evaluate((element) =>
        getComputedStyle(element).animationDuration
      ) === "0s",
      "Reduced motion retained movement",
    );
    motionCases += 1;

    const coarseContext = await browser.newContext({
      viewport: { width: 430, height: 900 },
      hasTouch: true,
      isMobile: true,
      reducedMotion: "reduce",
    });
    const coarsePage = await coarseContext.newPage();
    addPageFailureListeners(coarsePage, failures);
    try {
      await loadReview(
        coarsePage,
        reviewUrl(origin, {
          group: "Forms",
          component: "checkbox",
          example: "default",
          posture: "settled-default",
          width: "narrow",
          theme: "light",
          appearance: "accent",
          accent: "255",
          motion: "reduced",
          mode: "reel",
          speed: "production",
        }),
      );
      invariant(
        await coarsePage.evaluate(() =>
          matchMedia("(pointer: coarse)").matches &&
          matchMedia("(hover: none)").matches
        ),
        "Touch review context did not expose coarse/no-hover media",
      );
      const checkbox = coarsePage.getByRole("checkbox", {
        name: "Include examples",
      });
      await coarsePage.getByText("Include examples", { exact: true }).click();
      invariant(
        await checkbox.isChecked(),
        "Checkbox lost native activation without hover",
      );
      coarsePointerCases += 1;

      await loadReview(
        coarsePage,
        reviewUrl(origin, {
          group: "Navigation",
          component: "tabs",
          example: "default",
          posture: "settled-default",
          width: "narrow",
          theme: "dark",
          appearance: "rose",
          motion: "reduced",
          mode: "reel",
          speed: "production",
        }),
      );
      const detailsTab = coarsePage.getByRole("tab", { name: "Details" });
      await detailsTab.click();
      invariant(
        await detailsTab.getAttribute("aria-selected") === "true" &&
          await coarsePage.getByRole("tabpanel", { name: "Details" })
            .isVisible(),
        "Tabs lost pointer selection without hover",
      );
      coarsePointerCases += 1;
    } finally {
      await coarseContext.close();
    }

    const outputBytes = manifest.manifestBytes + await screenshots.reduce(
      async (sum, path) => (await sum) + (await Deno.stat(path)).size,
      Promise.resolve(0),
    );
    return {
      items,
      checkpoints: manifest.checkpoints,
      matrixItems: manifest.matrixItems,
      appearanceCases,
      semanticAppearanceCases,
      responsiveCases,
      scrollFocusCases: scrollFocusCaseCount,
      motionCases,
      coarsePointerCases,
      accessibilityScans,
      screenshots,
      outputFiles: manifest.outputFiles + screenshots.length,
      outputBytes,
      durationMs: Math.round(performance.now() - started),
    };
  } finally {
    await context.close();
  }
}
