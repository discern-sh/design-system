import { fromFileUrl } from "@std/path";
import type { Browser, Page } from "playwright-core";
import { catalogueAppearanceOptions } from "../../../catalogue/shell/appearance-options.ts";
import { componentReviewPath } from "../../../catalogue/review/state.ts";
import {
  addPageFailureListeners,
  scanBrowserAccessibility,
} from "../../browser-conformance-support.ts";
import { writeComponentReviewManifest } from "../../component-review.ts";
import { invariant } from "./support.ts";

const OUTPUT_ROOT = new URL("../../../dist/conformance/", import.meta.url);

export interface ComponentReviewEvidence {
  readonly items: number;
  readonly checkpoints: number;
  readonly matrixItems: number;
  readonly appearanceCases: number;
  readonly accessibilityScans: number;
  readonly screenshots: readonly string[];
  readonly outputFiles: number;
  readonly outputBytes: number;
  readonly durationMs: number;
}

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
  await page.locator("html[data-discern-review-status]").waitFor();
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
    await loadReview(
      page,
      reviewUrl(origin, {
        group: "Core",
        width: "medium",
        theme: "light",
        appearance: "blue",
        motion: "ordinary",
        mode: "contact",
        speed: "production",
      }),
    );
    const cards = page.locator("[data-discern-review-item]");
    items = await cards.count();
    invariant(
      items > 0 && items < manifest.components,
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
            appearance: option.id,
            motion: "ordinary",
            mode: "contact",
            speed: "production",
          }),
        );
        invariant(
          await page.locator("[data-discern-review-identity]").evaluate(
            (element) =>
              getComputedStyle(element).getPropertyValue("--discern-accent-hue")
                .trim(),
          ) === String(option.hue),
          `${theme}/${option.id} Appearance did not reach the specimen`,
        );
        appearanceCases += 1;
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
        appearance: "violet",
        motion: "ordinary",
        mode: "reel",
        speed: "production",
      }),
    );
    invariant(
      await page.getByRole("dialog", { name: "Save changes?" }).isVisible(),
      "Motion reel did not reach its open checkpoint",
    );
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
        appearance: "violet",
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
        group: "Core",
        component: "button",
        example: "default",
        posture: "focus-button",
        width: "medium",
        theme: "light",
        appearance: "blue",
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
        appearance: "blue",
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
        appearance: "blue",
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
        appearance: "blue",
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

    const outputBytes = manifest.manifestBytes + await screenshots.reduce(
      async (sum, path) => (await sum) + (await Deno.stat(path)).size,
      Promise.resolve(0),
    );
    return {
      items,
      checkpoints: manifest.checkpoints,
      matrixItems: manifest.matrixItems,
      appearanceCases,
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
