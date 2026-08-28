import type { Browser, BrowserContext, Locator, Page } from "playwright-core";
import { BUILDER_STORAGE_KEYS } from "../../../catalogue/builder/persistence.ts";
import {
  addPageFailureListeners,
  FOCUSABLE_SELECTOR,
  scanBrowserAccessibility,
  visibleEnabledTargets,
} from "../../browser-conformance-support.ts";
import type { ViewportSize } from "../../viewport.ts";

export { FOCUSABLE_SELECTOR, visibleEnabledTargets };

export const WIDE_VIEWPORT = { width: 1440, height: 1000 } as const;
export const INTERMEDIATE_VIEWPORT = { width: 900, height: 800 } as const;
export const NARROW_VIEWPORT = { width: 390, height: 844 } as const;
export const ZOOMED_VIEWPORT = { width: 320, height: 256 } as const;
export const ACTION_TIMEOUT = 4_000;
export const BUILDER_READY = '[data-discern-builder-ready="true"]';
export const BUILDER_SHELL = ".discern-builder-shell";
export const CANVAS_PAGE = ".discern-builder-canvas__page";
export const OUTLINE_ITEM = "[data-discern-builder-outline-id]";
export const OUTLINE_ROW = `${OUTLINE_ITEM} .discern-builder-layers__select`;

export type BuilderTheme = "light" | "dark";
export type BuilderPane = "palette" | "canvas" | "inspector";

export const PANES: readonly BuilderPane[] = ["palette", "canvas", "inspector"];
export const THEMES: readonly BuilderTheme[] = ["light", "dark"];
export const STORAGE_KEYS = Object.values(BUILDER_STORAGE_KEYS);

export interface AdaptiveCase {
  readonly label: string;
  readonly viewport: ViewportSize;
  readonly constrained: boolean;
}

export const ADAPTIVE_CASES: readonly AdaptiveCase[] = [
  { label: "wide", viewport: WIDE_VIEWPORT, constrained: false },
  {
    label: "intermediate",
    viewport: INTERMEDIATE_VIEWPORT,
    constrained: true,
  },
  { label: "narrow", viewport: NARROW_VIEWPORT, constrained: true },
  { label: "400%-zoom", viewport: ZOOMED_VIEWPORT, constrained: true },
];

export interface BuilderConformanceOptions {
  readonly browser: Browser;
  readonly page: Page;
  readonly origin: string;
  readonly failures: string[];
  readonly outputRoot: URL;
}

/** Measured browser populations exercised for the Catalogue-only builder. */
export interface BuilderConformanceSummary {
  readonly adaptiveCases: number;
  readonly paneTransitions: number;
  readonly axeScans: number;
  readonly keyboardStops: number;
  readonly authoringChecks: number;
  readonly shortcutIsolationChecks: number;
  readonly touchChecks: number;
  readonly containedFailures: number;
  readonly forcedColourFocusChecks: number;
  readonly screenshots: readonly string[];
}

export interface AdaptiveSummary {
  readonly cases: number;
  readonly paneTransitions: number;
  readonly axeScans: number;
}

export interface KeyboardSummary {
  readonly stops: number;
  readonly focusIndicators: number;
}

export function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function attempt<Result>(
  failures: string[],
  label: string,
  fallback: Result,
  operation: () => Promise<Result>,
): Promise<Result> {
  try {
    return await operation();
  } catch (error) {
    failures.push(`Builder ${label}: ${errorMessage(error)}`);
    return fallback;
  }
}

export function builderUrl(origin: string): string {
  return new URL("/catalogue/builder/", origin).href;
}

export async function loadBuilderPage(
  page: Page,
  origin: string,
): Promise<void> {
  await page.goto(builderUrl(origin), { waitUntil: "networkidle" });
  await page.locator(BUILDER_READY).waitFor({ timeout: ACTION_TIMEOUT });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  invariant(
    await page.getByText("Beta", { exact: true }).isVisible(),
    "builder chrome must identify the interface builder as Beta",
  );
  const leakingHeadings = await page.locator(
    `${BUILDER_SHELL} :is(h1, h2, h3, h4, h5, h6)`,
  ).evaluateAll((headings) =>
    headings.flatMap((heading) => {
      if (
        heading.closest(
          ".discern-builder-canvas__page, .discern-builder-palette__preview",
        ) !== null
      ) {
        return [];
      }
      const features = getComputedStyle(heading).fontFeatureSettings;
      return features === "normal"
        ? []
        : [`${heading.textContent?.trim() ?? heading.tagName}: ${features}`];
    })
  );
  invariant(
    leakingHeadings.length === 0,
    `builder chrome headings inherited UI-only OpenType features: ${
      leakingHeadings.join(", ")
    }`,
  );
}

export async function resetBuilderStorage(
  page: Page,
  origin: string,
): Promise<void> {
  if (new URL(page.url()).origin !== new URL(origin).origin) {
    await page.goto(new URL("/catalogue/", origin).href, {
      waitUntil: "domcontentloaded",
    });
  }
  await page.evaluate((keys) => {
    for (const key of keys) localStorage.removeItem(key);
  }, STORAGE_KEYS);
}

export async function useTheme(page: Page, theme: BuilderTheme): Promise<void> {
  const switcher = page.getByRole("group", { name: "Builder colour theme" });
  await switcher.getByRole("radio", {
    name: theme === "light" ? "Light" : "Dark",
    exact: true,
  }).check({ timeout: ACTION_TIMEOUT });
  await page.waitForFunction(
    ({ selector, theme }) =>
      document.querySelector(selector)?.getAttribute("data-discern-theme") ===
        theme,
    { selector: BUILDER_SHELL, theme },
    { timeout: ACTION_TIMEOUT },
  );
}

export function paneLocator(page: Page, pane: BuilderPane): Locator {
  return page.locator(`#discern-builder-pane-${pane}`);
}

export async function activatePane(
  page: Page,
  pane: BuilderPane,
): Promise<void> {
  const tab = page.getByRole("tab", {
    name: pane === "palette"
      ? "Palette"
      : pane === "canvas"
      ? "Canvas"
      : "Inspector",
    exact: true,
  });
  if (!await tab.isVisible()) {
    invariant(
      await paneLocator(page, pane).isVisible(),
      `${pane} pane is hidden without adaptive pane navigation`,
    );
    return;
  }
  await tab.click({ timeout: ACTION_TIMEOUT });
  await page.waitForFunction(
    ({ selector, pane }) =>
      document.querySelector(selector)?.getAttribute(
        "data-discern-builder-pane",
      ) === pane,
    { selector: BUILDER_SHELL, pane },
    { timeout: ACTION_TIMEOUT },
  );
  invariant(
    await tab.getAttribute("aria-selected") === "true",
    `${pane} tab did not expose aria-selected=true`,
  );
  invariant(
    await paneLocator(page, pane).isVisible(),
    `${pane} pane is hidden`,
  );
}

export async function assertNoPageOverflow(
  page: Page,
  label: string,
): Promise<void> {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    return {
      rootClient: root.clientWidth,
      rootScroll: root.scrollWidth,
      bodyClient: body.clientWidth,
      bodyScroll: body.scrollWidth,
      visiblePanes: [
        "palette",
        "canvas",
        "inspector",
      ].flatMap((pane) => {
        const element = document.getElementById(`discern-builder-pane-${pane}`);
        if (
          !(element instanceof HTMLElement) || element.offsetParent === null
        ) {
          return [];
        }
        const bounds = element.getBoundingClientRect();
        return [{ pane, left: bounds.left, right: bounds.right }];
      }),
    };
  });
  invariant(
    result.rootScroll <= result.rootClient + 1,
    `${label} document is ${result.rootScroll}px wide for ${result.rootClient}px`,
  );
  invariant(
    result.bodyScroll <= result.bodyClient + 1,
    `${label} body is ${result.bodyScroll}px wide for ${result.bodyClient}px`,
  );
  for (const pane of result.visiblePanes) {
    invariant(
      pane.left >= -1 && pane.right <= result.rootClient + 1,
      `${label} ${pane.pane} pane spans ${pane.left.toFixed(1)}–${
        pane.right.toFixed(1)
      }px outside the ${result.rootClient}px viewport`,
    );
  }
}

export async function scanBuilderAccessibility(
  page: Page,
  label: string,
  failures: string[],
): Promise<void> {
  try {
    const results = await scanBrowserAccessibility(page, BUILDER_SHELL);
    for (const violation of results.violations) {
      failures.push(
        `Builder axe ${label}: ${violation.id} (${
          violation.impact ?? "unknown impact"
        }) at ${
          violation.nodes.map((node) => JSON.stringify(node.target)).join("; ")
        }`,
      );
    }
  } catch (error) {
    failures.push(`Builder axe ${label}: ${errorMessage(error)}`);
  }
}

export type ContextOptions = Parameters<Browser["newContext"]>[0];

export async function withAuxiliaryPage<Result>(
  browser: Browser,
  failures: string[],
  options: ContextOptions,
  prepare: ((context: BrowserContext) => Promise<void>) | undefined,
  operation: (page: Page) => Promise<Result>,
): Promise<Result> {
  const context = await browser.newContext(options);
  try {
    await prepare?.(context);
    const page = await context.newPage();
    addPageFailureListeners(page, failures);
    return await operation(page);
  } finally {
    await context.close();
  }
}
