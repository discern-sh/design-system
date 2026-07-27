import { AxeBuilder } from "@axe-core/playwright";
import type { Browser, Locator, Page } from "playwright-core";
import { themeTokens } from "../src/tokens/tokens.ts";
import {
  auditBundledFontMetricAssets,
  auditFontMetricOverrides,
  bundledFontMetricSources,
} from "./font-metric-overrides.ts";
import { fontMetricCssomSnapshot } from "./font-metric-cssom.ts";
import { requireViewport, withViewport } from "./viewport.ts";

const WIDE_VIEWPORT = { width: 1440, height: 1000 } as const;
const NARROW_VIEWPORT = { width: 390, height: 844 } as const;
const ZOOMED_REFLOW_VIEWPORT = { width: 320, height: 256 } as const;
const MINIMUM_TARGET_SIZE = 24;
const WCAG_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
] as const;
const SURFACE_SELECTOR =
  ".discern-catalogue-component__canvas, [data-discern-journey]";
const FOCUSABLE_SELECTOR =
  "a[href], area[href], button, input:not([type='hidden']), select, textarea, " +
  "summary, audio[controls], video[controls], iframe, object, embed, " +
  "[tabindex], [contenteditable]";
const INTERACTIVE_SELECTOR =
  "a[href], button, input:not([type='hidden']), select, textarea, summary, " +
  "[role='button'], [role='link'], [role='checkbox'], [role='radio'], " +
  "[role='switch'], [tabindex]:not([tabindex='-1'])";
const TARGET_SELECTOR =
  "a[href], button, input:not([type='hidden']), select, textarea, summary, " +
  "[role='button'], [role='link'], [role='checkbox'], [role='radio'], " +
  "[role='switch']";

interface JourneyStructureResult {
  readonly journeys: number;
  readonly stages: number;
  readonly failures: readonly string[];
  readonly futureProof: boolean;
}

interface DisclosureResult {
  readonly disclosures: number;
  readonly failures: readonly string[];
  readonly futureProof: boolean;
}

interface NestedControlResult {
  readonly controls: number;
  readonly failures: readonly string[];
  readonly futureProof: boolean;
}

interface TargetResult {
  readonly targets: number;
  readonly inlineTextExceptions: number;
  readonly labelledControlBoxes: number;
  readonly failures: readonly string[];
  readonly futureProof: boolean;
}

interface ReflowResult {
  readonly surfaces: number;
  readonly containedOverflow: number;
  readonly failures: readonly string[];
  readonly futureProof: boolean;
}

interface MotionTarget {
  readonly surface: number;
  readonly element: number;
  readonly pseudo: "" | "::before" | "::after";
  readonly animation: boolean;
  readonly transition: boolean;
  readonly smoothScroll: boolean;
}

interface ReducedMotionResult {
  readonly failures: readonly string[];
  readonly futureProof: boolean;
}

interface ThemeResult {
  readonly consumers: number;
  readonly geometryChecks: number;
  readonly fontFallbackChecks: number;
  readonly fontFallbackAliasesCovered: readonly string[];
  readonly fontFallbackAliasesSkipped: readonly string[];
  readonly fontMetricOverrideFaces: number;
  readonly maxFontLineBoxDeltaPixels: number;
  readonly maxFontWidthDeltaPercent: number;
  readonly failures: readonly string[];
  readonly futureProof: boolean;
}

interface SemanticFocusResult {
  readonly targets: number;
  readonly roles: readonly string[];
}

/** Measured populations exercised by the journey and resilience browser gate. */
export interface ResilienceConformanceSummary {
  readonly journeys: number;
  readonly journeyStages: number;
  readonly journeyAxeScans: number;
  readonly journeyTabStops: number;
  readonly journeyCommandCopies: number;
  readonly disclosures: number;
  readonly disclosureToggles: number;
  readonly interactiveControls: number;
  readonly targets: number;
  readonly inlineTextTargetExceptions: number;
  readonly labelledControlBoxes: number;
  readonly reflowSurfaces: number;
  readonly containedOverflowRegions: number;
  readonly motionTargets: number;
  readonly themeConsumers: number;
  readonly themeGeometryChecks: number;
  readonly fontFallbackChecks: number;
  readonly fontFallbackAliasesCovered: readonly string[];
  readonly fontFallbackAliasesSkipped: readonly string[];
  readonly fontMetricOverrideFaces: number;
  readonly maxFontLineBoxDeltaPixels: number;
  readonly maxFontWidthDeltaPercent: number;
  readonly semanticFocusTargets: number;
  readonly semanticFocusRoles: readonly string[];
}

function conformanceUrl(origin: string, theme = "light"): string {
  const url = new URL("/style-guide/", origin);
  url.searchParams.set("conformance", "1");
  url.searchParams.set("theme", theme);
  return url.href;
}

async function loadPage(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator('[data-discern-conformance-ready="true"]').waitFor();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function verifyJourneyStructure(
  page: Page,
  failures: string[],
): Promise<JourneyStructureResult> {
  const result = await page.evaluate(() => {
    const landmarkSelector = [
      "main",
      "nav",
      "aside",
      "[role='main']",
      "[role='navigation']",
      "[role='complementary']",
      "[role='region']",
      "section[aria-label]",
      "section[aria-labelledby]",
    ].join(",");

    function textForIds(root: Element, ids: string): string {
      return ids.split(/\s+/).map((id) =>
        root.ownerDocument.getElementById(id)?.textContent?.trim() ?? ""
      ).filter(Boolean).join(" ");
    }

    function accessibleName(element: Element): string {
      const label = element.getAttribute("aria-label")?.trim();
      if (label) return label;
      const labelledBy = element.getAttribute("aria-labelledby")?.trim();
      if (labelledBy) return textForIds(element, labelledBy);
      return "";
    }

    function inspect(root: HTMLElement): string[] {
      const problems: string[] = [];
      const id = root.dataset.discernJourney ?? "unnamed";
      const headings = Array.from(
        root.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6"),
      );
      if (headings.length === 0) {
        problems.push(`${id}: journey has no heading`);
      } else {
        const first = Number(headings[0]?.tagName.slice(1));
        if (first !== 2) {
          problems.push(`${id}: journey starts at h${first} instead of h2`);
        }
        for (let index = 1; index < headings.length; index += 1) {
          const previous = Number(headings[index - 1]?.tagName.slice(1));
          const current = Number(headings[index]?.tagName.slice(1));
          if (current > previous + 1) {
            problems.push(
              `${id}: heading skips from h${previous} to h${current}`,
            );
          }
        }
      }

      const headingIds = headings.map((heading) => heading.id).filter(Boolean);
      if (new Set(headingIds).size !== headingIds.length) {
        problems.push(`${id}: journey repeats a heading id`);
      }

      let stages: readonly string[] = [];
      try {
        const parsed = JSON.parse(root.dataset.discernJourneyStages ?? "[]");
        if (
          Array.isArray(parsed) &&
          parsed.every((value) => typeof value === "string")
        ) {
          stages = parsed;
        } else {
          problems.push(`${id}: stage contract is not a string array`);
        }
      } catch {
        problems.push(`${id}: stage contract is not valid JSON`);
      }
      if (stages.length === 0) {
        problems.push(`${id}: journey has no declared stages`);
      }
      if (new Set(stages).size !== stages.length) {
        problems.push(`${id}: journey repeats a stage selector`);
      }
      let previousStage: Element | undefined;
      for (const selector of stages) {
        const matches = root.querySelectorAll(selector);
        if (matches.length !== 1) {
          problems.push(
            `${id}: stage ${selector} matched ${matches.length} elements`,
          );
          continue;
        }
        const current = matches[0];
        if (
          previousStage !== undefined && current !== undefined &&
          (previousStage.compareDocumentPosition(current) &
              Node.DOCUMENT_POSITION_FOLLOWING) === 0
        ) {
          problems.push(`${id}: stage ${selector} is out of order`);
        }
        if (current !== undefined) previousStage = current;
      }

      const landmarks = [
        ...(root.matches(landmarkSelector) ? [root] : []),
        ...root.querySelectorAll<HTMLElement>(landmarkSelector),
      ];
      const namedLandmarks = new Set<string>();
      for (const landmark of landmarks) {
        const role = landmark.getAttribute("role") ??
          (landmark.tagName === "NAV"
            ? "navigation"
            : landmark.tagName === "ASIDE"
            ? "complementary"
            : landmark.tagName === "MAIN"
            ? "main"
            : "region");
        const name = accessibleName(landmark);
        if (
          (role === "navigation" || role === "complementary" ||
            role === "region") && !name
        ) {
          problems.push(`${id}: ${role} landmark has no accessible name`);
        }
        const identity = `${role}:${name}`;
        if (namedLandmarks.has(identity)) {
          problems.push(`${id}: repeats landmark ${identity}`);
        }
        namedLandmarks.add(identity);
      }

      for (
        const target of root.querySelectorAll<HTMLElement>("[tabindex]")
      ) {
        if (target.tabIndex > 0) {
          problems.push(`${id}: positive tabindex changes DOM focus order`);
        }
      }
      return problems;
    }

    const journeys = Array.from(
      document.querySelectorAll<HTMLElement>("[data-discern-journey]"),
    );
    const currentFailures = journeys.flatMap(inspect);
    if (journeys.length === 0) {
      currentFailures.push("no composition journeys enrolled");
    }
    const ids = journeys.map((journey) => journey.dataset.discernJourney ?? "");
    if (new Set(ids).size !== ids.length) {
      currentFailures.push("journey ids are not unique");
    }

    const future = document.createElement("section");
    future.dataset.discernJourney = "future-resilience-journey";
    future.dataset.discernJourneyStages = JSON.stringify([
      "[data-future-stage='first']",
      "[data-future-stage='second']",
    ]);
    future.setAttribute("aria-label", "Future resilience journey");
    future.innerHTML = [
      "<h2>Future journey</h2>",
      "<div data-future-stage='second'></div>",
      "<h4>Skipped heading</h4>",
      "<div data-future-stage='first'></div>",
      "<nav aria-label='Repeated route'></nav>",
      "<nav aria-label='Repeated route'></nav>",
      "<button tabindex='2'>Late in DOM, early in focus</button>",
    ].join("");
    document.querySelector("[data-discern-root]")?.append(future);
    const futureFailures = inspect(future);
    future.remove();

    return {
      journeys: journeys.length,
      stages: journeys.reduce((count, journey) => {
        try {
          const parsed = JSON.parse(
            journey.dataset.discernJourneyStages ?? "[]",
          );
          return count + (Array.isArray(parsed) ? parsed.length : 0);
        } catch {
          return count;
        }
      }, 0),
      failures: currentFailures,
      futureProof: futureFailures.some((failure) =>
        failure.includes("out of order")
      ) &&
        futureFailures.some((failure) => failure.includes("heading skips")) &&
        futureFailures.some((failure) =>
          failure.includes("repeats landmark")
        ) &&
        futureFailures.some((failure) => failure.includes("positive tabindex")),
    };
  });
  failures.push(
    ...result.failures.map((failure) => `Journey structure: ${failure}`),
  );
  if (!result.futureProof) {
    failures.push(
      "Journey structure: synthetic future journey escaped the detector",
    );
  }
  return result;
}

async function scanJourneyAccessibility(
  page: Page,
  origin: string,
  failures: string[],
): Promise<number> {
  let scans = 0;
  for (const theme of ["light", "dark"] as const) {
    await loadPage(page, conformanceUrl(origin, theme));
    const ids = await page.locator("[data-discern-journey]").evaluateAll((
      nodes,
    ) =>
      nodes.map((node) => (node as HTMLElement).dataset.discernJourney ?? "")
    );
    for (const id of ids) {
      try {
        const results = await new AxeBuilder({ page })
          .include(`[data-discern-journey="${id}"]`)
          .withTags([...WCAG_TAGS])
          .analyze();
        scans += 1;
        for (const violation of results.violations) {
          failures.push(
            `Journey axe ${theme}/${id}: ${violation.id} at ${
              violation.nodes.map((node) => JSON.stringify(node.target)).join(
                "; ",
              )
            }`,
          );
        }
      } catch (error) {
        failures.push(
          `Journey axe ${theme}/${id}: ${errorMessage(error)}`,
        );
      }
    }
  }
  return scans;
}

async function visibleEnabledTargets(root: Locator): Promise<Locator[]> {
  const candidates = root.locator(FOCUSABLE_SELECTOR);
  const targets: Locator[] = [];
  for (let index = 0; index < await candidates.count(); index += 1) {
    const candidate = candidates.nth(index);
    if (!await candidate.isVisible() || !await candidate.isEnabled()) continue;
    targets.push(candidate);
  }
  return targets;
}

async function verifyJourneyKeyboard(
  page: Page,
  origin: string,
  failures: string[],
): Promise<{ readonly tabStops: number; readonly commandCopies: number }> {
  return await withViewport(page, WIDE_VIEWPORT, async () => {
    await loadPage(page, conformanceUrl(origin));
    const journeys = page.locator("[data-discern-journey]");
    let tabStops = 0;
    let commandCopies = 0;
    for (
      let journeyIndex = 0;
      journeyIndex < await journeys.count();
      journeyIndex += 1
    ) {
      const journey = journeys.nth(journeyIndex);
      const id = await journey.getAttribute("data-discern-journey") ??
        `journey-${journeyIndex}`;
      const targets = await visibleEnabledTargets(journey);
      if (targets.length > 0) {
        const sentinelId = `discern-journey-sentinel-${journeyIndex}`;
        await journey.evaluate((node, id) => {
          const sentinel = document.createElement("button");
          sentinel.id = id;
          sentinel.type = "button";
          sentinel.textContent = "Journey focus sentinel";
          sentinel.style.cssText =
            "position:absolute;inline-size:1px;block-size:1px;opacity:0;";
          node.before(sentinel);
        }, sentinelId);
        await page.locator(`#${sentinelId}`).focus();
        for (const target of targets) {
          await page.keyboard.press("Tab");
          const state = await target.evaluate((node) => ({
            active: node.ownerDocument.activeElement === node,
            focusVisible: node.matches(":focus-visible"),
          }));
          if (!state.active) {
            failures.push(`${id}: Tab order diverged from DOM order`);
            break;
          }
          if (!state.focusVisible) {
            failures.push(
              `${id}: keyboard target did not match :focus-visible`,
            );
          }
          tabStops += 1;
        }
        await page.keyboard.press("Tab");
        if (
          await journey.evaluate((node) =>
            node.contains(node.ownerDocument.activeElement)
          )
        ) {
          failures.push(`${id}: keyboard traversal is trapped in the journey`);
        }
        await page.locator(`#${sentinelId}`).evaluate((node) => node.remove());
      }

      const commands = journey.locator(".discern-command");
      for (let index = 0; index < await commands.count(); index += 1) {
        const command = commands.nth(index);
        const expected = await command.locator(
          ".discern-command__text code",
        ).innerText();
        const copy = command.locator(".discern-command__copy");
        if (await copy.count() !== 1) {
          failures.push(
            `${id}: command ${index + 1} has no single copy target`,
          );
          continue;
        }
        await copy.focus();
        await page.keyboard.press("Enter");
        const copied = await page.evaluate(() =>
          navigator.clipboard.readText()
        );
        if (copied !== expected) {
          failures.push(
            `${id}: command ${index + 1} copied ${JSON.stringify(copied)} ` +
              `instead of ${JSON.stringify(expected)}`,
          );
        }
        commandCopies += 1;
      }
    }
    return { tabStops, commandCopies };
  });
}

async function verifyDisclosures(
  page: Page,
  origin: string,
  failures: string[],
): Promise<{ readonly result: DisclosureResult; readonly toggles: number }> {
  await loadPage(page, conformanceUrl(origin));
  const result = await page.evaluate((surfaceSelector) => {
    function describe(details: HTMLDetailsElement): string {
      const component = details.closest<HTMLElement>(
        "[data-discern-component]",
      )?.dataset.discernComponent;
      const journey = details.closest<HTMLElement>("[data-discern-journey]")
        ?.dataset.discernJourney;
      return component ?? journey ?? details.className ?? "details";
    }

    function inspect(details: HTMLDetailsElement): string[] {
      const problems: string[] = [];
      const summaries = details.querySelectorAll(":scope > summary");
      if (summaries.length !== 1) {
        problems.push(
          `${
            describe(details)
          }: details has ${summaries.length} direct summaries`,
        );
        return problems;
      }
      const summary = summaries[0];
      if (details.firstElementChild !== summary) {
        problems.push(`${describe(details)}: summary is not the first child`);
      }
      if (!summary?.textContent?.trim()) {
        problems.push(`${describe(details)}: summary has no accessible label`);
      }
      return problems;
    }

    const selector = `${
      surfaceSelector.split(",").map((surface) => `${surface.trim()} details`)
        .join(",")
    }`;
    const disclosures = Array.from(
      document.querySelectorAll<HTMLDetailsElement>(selector),
    );
    const currentFailures = disclosures.flatMap(inspect);
    const future = document.createElement("details");
    future.innerHTML = "<div>Future disclosure body</div>";
    document.querySelector(surfaceSelector)?.append(future);
    const futureFailures = inspect(future);
    future.remove();
    return {
      disclosures: disclosures.length,
      failures: currentFailures,
      futureProof: futureFailures.some((failure) =>
        failure.includes("0 direct summaries")
      ),
    };
  }, SURFACE_SELECTOR);
  failures.push(
    ...result.failures.map((failure) => `Disclosure integrity: ${failure}`),
  );
  if (!result.futureProof) {
    failures.push(
      "Disclosure integrity: synthetic future disclosure escaped the detector",
    );
  }

  const disclosures = page.locator(
    SURFACE_SELECTOR.split(",").map((surface) => `${surface.trim()} details`)
      .join(","),
  );
  let toggles = 0;
  for (let index = 0; index < await disclosures.count(); index += 1) {
    const details = disclosures.nth(index);
    if (!await details.isVisible()) continue;
    const summary = details.locator(":scope > summary");
    if (await summary.count() !== 1) continue;
    const before = await details.evaluate((node) =>
      (node as HTMLDetailsElement).open
    );
    await summary.focus();
    await page.keyboard.press("Enter");
    const after = await details.evaluate((node) => ({
      open: (node as HTMLDetailsElement).open,
      focusRetained: node.ownerDocument.activeElement ===
        node.querySelector(":scope > summary"),
    }));
    if (after.open === before) {
      failures.push(`Disclosure ${index + 1}: Enter did not toggle open state`);
    }
    if (!after.focusRetained) {
      failures.push(`Disclosure ${index + 1}: toggle moved focus`);
    }
    await page.keyboard.press("Enter");
    toggles += 1;
  }
  return { result, toggles };
}

async function verifyNestedControls(
  page: Page,
  origin: string,
  failures: string[],
): Promise<NestedControlResult> {
  await loadPage(page, conformanceUrl(origin));
  const result = await page.evaluate(
    ({ surfaceSelector, interactiveSelector }) => {
      function describe(node: Element): string {
        return node.outerHTML.replace(/\s+/g, " ").slice(0, 180);
      }

      function inspect(root: ParentNode): string[] {
        const problems: string[] = [];
        const controls = [
          ...(root instanceof HTMLElement && root.matches(interactiveSelector)
            ? [root]
            : []),
          ...root.querySelectorAll<HTMLElement>(interactiveSelector),
        ];
        for (const control of controls) {
          const nested = control.querySelector(interactiveSelector);
          if (nested !== null) {
            problems.push(
              `${describe(control)} contains ${describe(nested)}`,
            );
          }
        }
        return problems;
      }

      const surfaces = Array.from(document.querySelectorAll(surfaceSelector));
      const currentFailures = surfaces.flatMap(inspect);
      const future = document.createElement("button");
      future.type = "button";
      future.textContent = "Future card";
      const nested = document.createElement("a");
      nested.href = "#future";
      nested.textContent = "Nested action";
      future.append(nested);
      surfaces[0]?.append(future);
      const futureFailures = inspect(future);
      future.remove();
      return {
        controls: surfaces.reduce(
          (count, surface) =>
            count + surface.querySelectorAll(interactiveSelector).length,
          0,
        ),
        failures: currentFailures,
        futureProof: futureFailures.length > 0,
      };
    },
    {
      surfaceSelector: SURFACE_SELECTOR,
      interactiveSelector: INTERACTIVE_SELECTOR,
    },
  );
  failures.push(
    ...result.failures.map((failure) => `Nested controls: ${failure}`),
  );
  if (!result.futureProof) {
    failures.push(
      "Nested controls: synthetic future clickable container escaped the detector",
    );
  }
  return result;
}

async function verifyTargetSizes(
  page: Page,
  origin: string,
  failures: string[],
): Promise<TargetResult> {
  return await withViewport(page, NARROW_VIEWPORT, async () => {
    await loadPage(page, conformanceUrl(origin));
    const result = await page.evaluate(
      ({ surfaceSelector, interactiveSelector, minimumTargetSize }) => {
        interface Measurement {
          readonly failures: string[];
          targets: number;
          inlineTextExceptions: number;
          labelledControlBoxes: number;
        }

        function visible(element: HTMLElement): boolean {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" &&
            style.clipPath !== "inset(50%)" &&
            (style.clip === "auto" || style.clip === "") &&
            rect.width > 0 && rect.height > 0;
        }

        function description(element: HTMLElement): string {
          return element.outerHTML.replace(/\s+/g, " ").slice(0, 180);
        }

        function inlineTextLink(element: HTMLElement): boolean {
          if (!(element instanceof HTMLAnchorElement)) return false;
          if (getComputedStyle(element).display !== "inline") return false;
          const block = element.closest("p, li, dd, dt, figcaption");
          if (block === null) return false;
          return [...block.childNodes].some((node) =>
            node !== element && (node.textContent?.trim().length ?? 0) > 0
          );
        }

        function labelledRect(element: HTMLElement): DOMRect | undefined {
          if (!(element instanceof HTMLInputElement)) return undefined;
          if (element.type !== "checkbox" && element.type !== "radio") {
            return undefined;
          }
          const label = element.labels?.[0];
          if (label === undefined) return undefined;
          const rect = label.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 ? rect : undefined;
        }

        function inspect(root: ParentNode): Measurement {
          const result: Measurement = {
            failures: [],
            targets: 0,
            inlineTextExceptions: 0,
            labelledControlBoxes: 0,
          };
          const elements = [
            ...(root instanceof HTMLElement && root.matches(interactiveSelector)
              ? [root]
              : []),
            ...root.querySelectorAll<HTMLElement>(interactiveSelector),
          ];
          for (const element of elements) {
            if (!visible(element)) continue;
            if (
              "disabled" in element &&
              (element as HTMLButtonElement | HTMLInputElement).disabled
            ) {
              continue;
            }
            result.targets += 1;
            if (inlineTextLink(element)) {
              result.inlineTextExceptions += 1;
              if (
                !(element instanceof HTMLAnchorElement) ||
                ![
                  ...(
                    element.closest("p, li, dd, dt, figcaption")?.childNodes ??
                      []
                  ),
                ].some((node) =>
                  node !== element && (node.textContent?.trim().length ?? 0) > 0
                )
              ) {
                result.failures.push(
                  `invalid inline-text exception: ${description(element)}`,
                );
              }
              continue;
            }
            const labelBox = labelledRect(element);
            const rect = labelBox ?? element.getBoundingClientRect();
            if (labelBox !== undefined) {
              result.labelledControlBoxes += 1;
              if (
                !(element instanceof HTMLInputElement) ||
                (element.type !== "checkbox" && element.type !== "radio") ||
                element.labels?.[0] === undefined
              ) {
                result.failures.push(
                  `invalid native-label exception: ${description(element)}`,
                );
              }
            }
            if (
              rect.width < minimumTargetSize ||
              rect.height < minimumTargetSize
            ) {
              result.failures.push(
                `${description(element)} measures ${rect.width.toFixed(1)}×${
                  rect.height.toFixed(1)
                }px`,
              );
            }
          }
          return result;
        }

        const surfaces = Array.from(document.querySelectorAll(surfaceSelector));
        const measurements = surfaces.map(inspect);
        const current: Measurement = {
          failures: measurements.flatMap((item) => item.failures),
          targets: measurements.reduce((sum, item) => sum + item.targets, 0),
          inlineTextExceptions: measurements.reduce(
            (sum, item) => sum + item.inlineTextExceptions,
            0,
          ),
          labelledControlBoxes: measurements.reduce(
            (sum, item) => sum + item.labelledControlBoxes,
            0,
          ),
        };

        const future = document.createElement("button");
        future.type = "button";
        future.textContent = "Tiny";
        future.style.cssText =
          "inline-size:12px!important;block-size:12px!important;" +
          "min-inline-size:0!important;min-block-size:0!important;" +
          "padding:0!important;border:0!important;";
        const futureRoot = surfaces[0];
        const failuresBeforeFuture = futureRoot === undefined
          ? 0
          : inspect(futureRoot).failures.length;
        futureRoot?.append(future);
        const futureMeasurement = inspect(futureRoot ?? future);
        const futureProof = futureMeasurement.failures.length >
          failuresBeforeFuture;
        future.remove();
        return { ...current, futureProof };
      },
      {
        surfaceSelector: SURFACE_SELECTOR,
        interactiveSelector: TARGET_SELECTOR,
        minimumTargetSize: MINIMUM_TARGET_SIZE,
      },
    );
    failures.push(
      ...result.failures.map((failure) => `Target size: ${failure}`),
    );
    if (!result.futureProof) {
      failures.push(
        "Target size: synthetic future target escaped the detector",
      );
    }
    return result;
  });
}

async function reflowAt(
  page: Page,
  origin: string,
  viewport: { readonly width: number; readonly height: number },
  label: string,
  failures: string[],
): Promise<ReflowResult> {
  return await withViewport(page, viewport, async () => {
    await loadPage(page, conformanceUrl(origin));
    const result = await page.evaluate((surfaceSelector) => {
      function inspect(): {
        readonly surfaces: number;
        readonly containedOverflow: number;
        readonly failures: readonly string[];
      } {
        const problems: string[] = [];
        const surfaces = Array.from(
          document.querySelectorAll<HTMLElement>(surfaceSelector),
        );
        if (
          document.documentElement.scrollWidth >
            document.documentElement.clientWidth + 1
        ) {
          problems.push(
            `page is ${document.documentElement.scrollWidth}px wide for a ` +
              `${document.documentElement.clientWidth}px viewport`,
          );
        }
        let containedOverflow = 0;
        const viewportWidth = document.documentElement.clientWidth;
        for (const surface of surfaces) {
          for (
            const element of [
              surface,
              ...surface.querySelectorAll<HTMLElement>("*"),
            ]
          ) {
            const rect = element.getBoundingClientRect();
            if (rect.left >= -1 && rect.right <= viewportWidth + 1) continue;
            let container: HTMLElement | null = element;
            let contained = false;
            while (container !== null && surface.contains(container)) {
              const overflow = getComputedStyle(container).overflowX;
              const containerRect = container.getBoundingClientRect();
              if (
                (overflow === "auto" || overflow === "scroll") &&
                container.scrollWidth > container.clientWidth + 1 &&
                containerRect.left >= -1 &&
                containerRect.right <= viewportWidth + 1
              ) {
                contained = true;
                break;
              }
              if (container === surface) break;
              container = container.parentElement;
            }
            if (contained) {
              containedOverflow += 1;
            } else {
              problems.push(
                element.outerHTML.replace(/\s+/g, " ").slice(0, 180) +
                  " overflows without an internal horizontal scroller",
              );
            }
          }
        }
        return {
          surfaces: surfaces.length,
          containedOverflow,
          failures: problems,
        };
      }

      const current = inspect();
      const future = document.createElement("div");
      future.textContent = "Future wide surface";
      future.style.cssText = "inline-size:200vw;block-size:1px;";
      document.querySelector(surfaceSelector)?.append(future);
      const futureFailures = inspect().failures;
      future.remove();
      return {
        ...current,
        futureProof: futureFailures.length > current.failures.length,
      };
    }, SURFACE_SELECTOR);
    failures.push(
      ...result.failures.map((failure) => `Reflow ${label}: ${failure}`),
    );
    if (!result.futureProof) {
      failures.push(
        `Reflow ${label}: synthetic wide sibling escaped the detector`,
      );
    }
    return result;
  });
}

async function discoverMotionTargets(page: Page): Promise<MotionTarget[]> {
  return await page.evaluate((surfaceSelector) => {
    function seconds(value: string): number[] {
      return value.split(",").map((part) => {
        const trimmed = part.trim();
        return trimmed.endsWith("ms")
          ? Number.parseFloat(trimmed) / 1000
          : Number.parseFloat(trimmed);
      }).filter(Number.isFinite);
    }

    function active(
      style: CSSStyleDeclaration,
    ): Omit<MotionTarget, "surface" | "element" | "pseudo"> {
      const animation = style.animationName.split(",").some((name) =>
        name.trim() !== "none"
      ) &&
        seconds(style.animationDuration).some((duration) => duration > 0);
      const transition = seconds(style.transitionDuration).some((duration) =>
        duration > 0
      );
      return {
        animation,
        transition,
        smoothScroll: style.scrollBehavior === "smooth",
      };
    }

    const targets: MotionTarget[] = [];
    const surfaces = Array.from(
      document.querySelectorAll<HTMLElement>(surfaceSelector),
    );
    for (let surface = 0; surface < surfaces.length; surface += 1) {
      const root = surfaces[surface];
      if (root === undefined) continue;
      const elements = [root, ...root.querySelectorAll<HTMLElement>("*")];
      for (let element = 0; element < elements.length; element += 1) {
        const node = elements[element];
        if (node === undefined) continue;
        for (const pseudo of ["", "::before", "::after"] as const) {
          const style = getComputedStyle(node, pseudo || null);
          if (pseudo && (style.content === "none" || style.content === "")) {
            continue;
          }
          const state = active(style);
          if (state.animation || state.transition || state.smoothScroll) {
            targets.push({ surface, element, pseudo, ...state });
          }
        }
      }
    }
    return targets;
  }, SURFACE_SELECTOR);
}

async function verifyReducedMotionTargets(
  page: Page,
  targets: readonly MotionTarget[],
): Promise<ReducedMotionResult> {
  return await page.evaluate(
    ({ surfaceSelector, targets }) => {
      function seconds(value: string): number[] {
        return value.split(",").map((part) => {
          const trimmed = part.trim();
          return trimmed.endsWith("ms")
            ? Number.parseFloat(trimmed) / 1000
            : Number.parseFloat(trimmed);
        }).filter(Number.isFinite);
      }

      function inspect(
        node: HTMLElement,
        pseudo: MotionTarget["pseudo"],
        target: MotionTarget,
      ): string[] {
        const problems: string[] = [];
        const style = getComputedStyle(node, pseudo || null);
        if (
          target.animation &&
          seconds(style.animationDuration).some((duration) => duration > 0.0001)
        ) {
          problems.push("animation duration exceeds 0.1ms");
        }
        if (
          target.animation &&
          style.animationIterationCount.split(",").some((value) =>
            value.trim() === "infinite" || Number.parseFloat(value) > 1
          )
        ) {
          problems.push("animation repeats under reduced motion");
        }
        if (
          target.transition &&
          seconds(style.transitionDuration).some((duration) =>
            duration > 0.0001
          )
        ) {
          problems.push("transition duration exceeds 0.1ms");
        }
        if (target.smoothScroll && style.scrollBehavior === "smooth") {
          problems.push("smooth scrolling remains enabled");
        }
        return problems;
      }

      const surfaces = Array.from(
        document.querySelectorAll<HTMLElement>(surfaceSelector),
      );
      const currentFailures: string[] = [];
      for (const target of targets) {
        const root = surfaces[target.surface];
        const node = root === undefined
          ? undefined
          : [root, ...root.querySelectorAll<HTMLElement>("*")][target.element];
        if (node === undefined) {
          currentFailures.push(
            `motion target ${target.surface}:${target.element} disappeared`,
          );
          continue;
        }
        currentFailures.push(
          ...inspect(node, target.pseudo, target).map((
            failure,
          ) =>
            `${target.surface}:${target.element}${target.pseudo} ${failure}`
          ),
        );
      }

      const future = document.createElement("div");
      future.textContent = "Future motion";
      future.style.setProperty("animation-name", "future-motion", "important");
      future.style.setProperty("animation-duration", "2s", "important");
      future.style.setProperty(
        "animation-iteration-count",
        "infinite",
        "important",
      );
      future.style.setProperty("transition-duration", "2s", "important");
      surfaces[0]?.append(future);
      const futureFailures = inspect(future, "", {
        surface: 0,
        element: 0,
        pseudo: "",
        animation: true,
        transition: true,
        smoothScroll: false,
      });
      future.remove();
      return {
        failures: currentFailures,
        futureProof: futureFailures.length >= 2,
      };
    },
    { surfaceSelector: SURFACE_SELECTOR, targets },
  );
}

async function verifyMotionPreferences(
  browser: Browser,
  origin: string,
  failures: string[],
): Promise<number> {
  const normalContext = await browser.newContext({
    viewport: WIDE_VIEWPORT,
    reducedMotion: "no-preference",
  });
  const reducedContext = await browser.newContext({
    viewport: WIDE_VIEWPORT,
    reducedMotion: "reduce",
  });
  try {
    const normal = await normalContext.newPage();
    await loadPage(normal, conformanceUrl(origin));
    const targets = await discoverMotionTargets(normal);
    const reduced = await reducedContext.newPage();
    await loadPage(reduced, conformanceUrl(origin));
    const result = await verifyReducedMotionTargets(reduced, targets);
    failures.push(
      ...result.failures.map((failure) => `Reduced motion: ${failure}`),
    );
    if (!result.futureProof) {
      failures.push(
        "Reduced motion: synthetic future animation escaped the detector",
      );
    }
    return targets.length;
  } finally {
    await normalContext.close();
    await reducedContext.close();
  }
}

async function verifyThemeSystem(
  browser: Browser,
  origin: string,
  failures: string[],
): Promise<ThemeResult> {
  const fontCssUrl = new URL("../assets/fonts.css", import.meta.url);
  const fontCss = await Deno.readTextFile(fontCssUrl);
  const fontMetricAssetFailures = await auditBundledFontMetricAssets(
    await Promise.all(
      bundledFontMetricSources().map(async (source) => ({
        source,
        bytes: await Deno.readFile(new URL(source, fontCssUrl)),
      })),
    ),
  );
  failures.push(
    ...fontMetricAssetFailures.map((failure) =>
      `Font metric authority: ${failure}`
    ),
  );
  const context = await browser.newContext({
    viewport: WIDE_VIEWPORT,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  try {
    const fontMetricAudit = auditFontMetricOverrides(
      fontCss,
      await fontMetricCssomSnapshot(page, fontCss),
    );
    failures.push(
      ...fontMetricAudit.failures.map((failure) =>
        `Font metric overrides: ${failure}`
      ),
    );
    await page.goto(new URL("/style-guide/", origin).href, {
      waitUntil: "networkidle",
    });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("[data-discern-theme-consumer]").waitFor();
    await page.evaluate(() => document.fonts.ready.then(() => undefined));

    const inspect = async (): Promise<{
      readonly consumers: number;
      readonly failures: readonly string[];
    }> =>
      await page.evaluate(() => {
        const problems: string[] = [];
        const consumers = Array.from(
          document.querySelectorAll<HTMLElement>(
            "[data-discern-theme-consumer]",
          ),
        );
        for (const consumer of consumers) {
          const mode = consumer.dataset.discernTheme;
          const controlSelector = consumer.dataset.discernThemeControl;
          const control = controlSelector === undefined
            ? null
            : consumer.querySelector(controlSelector);
          const checked = control?.querySelector<HTMLInputElement>(
            "input:checked",
          )?.value;
          const storageKey = consumer.dataset.discernThemeStorageKey;
          const stored = storageKey === undefined
            ? undefined
            : localStorage.getItem(storageKey);
          if (checked !== mode) {
            problems.push(
              `checked theme ${checked ?? "none"} disagrees with root ${mode}`,
            );
          }
          if (control === null) {
            problems.push("declared theme control is missing");
          }
          if (
            storageKey !== undefined &&
            (mode === "system" ? stored !== null : stored !== mode)
          ) {
            problems.push(
              `stored theme ${stored ?? "none"} disagrees with root ${mode}`,
            );
          }
        }
        return { consumers: consumers.length, failures: problems };
      });

    const initial = await inspect();
    const root = page.locator("[data-discern-theme-consumer]").first();
    const geometry = async (): Promise<
      Readonly<Record<string, readonly number[]>>
    > =>
      await page.evaluate(() => {
        const targets = {
          consumer: document.querySelector("[data-discern-theme-consumer]"),
          control: document.querySelector(
            "[data-discern-theme-consumer] [data-discern-mode]",
          ),
          sidebar: document.querySelector(".discern-catalogue-sidebar"),
          toolbar: document.querySelector(".discern-catalogue-toolbar"),
          main: document.querySelector("main"),
        };
        return Object.fromEntries(
          Object.entries(targets).map(([name, node]) => {
            if (!(node instanceof HTMLElement)) return [name, []];
            const rect = node.getBoundingClientRect();
            return [
              name,
              [
                rect.x,
                rect.y,
                rect.width,
                rect.height,
                node.scrollWidth,
                node.scrollHeight,
              ],
            ];
          }),
        );
      });
    const darkGeometry = await geometry();
    const initialMode = await root.getAttribute("data-discern-theme");
    if (initialMode !== "system") {
      failures.push(`Theme system: fresh consumer started in ${initialMode}`);
    }
    const darkCanvas = await root.evaluate((node) =>
      getComputedStyle(node).getPropertyValue("--discern-color-canvas").trim()
    );
    const controlSelector = await root.getAttribute(
      "data-discern-theme-control",
    );
    if (controlSelector === null) {
      throw new Error("Theme consumer has no control selector");
    }
    const control = root.locator(controlSelector);
    await control.getByRole("radio", { name: "Light", exact: true }).check();
    const lightGeometry = await geometry();
    let geometryChecks = 0;
    for (const [name, before] of Object.entries(darkGeometry)) {
      const after = lightGeometry[name] ?? [];
      if (before.length === 0 || after.length !== before.length) {
        failures.push(`Theme geometry: missing ${name} measurement`);
        continue;
      }
      for (let index = 0; index < before.length; index += 1) {
        const darkValue = before[index];
        const lightValue = after[index];
        if (
          darkValue === undefined || lightValue === undefined ||
          Math.abs(darkValue - lightValue) > 0.25
        ) {
          failures.push(
            `Theme geometry: ${name} metric ${index} moved from ${darkValue} to ${lightValue}`,
          );
        }
        geometryChecks += 1;
      }
    }
    failures.push(
      ...(await inspect()).failures.map((failure) =>
        `Theme system: ${failure}`
      ),
    );
    await control.getByRole("radio", { name: "System", exact: true }).check();
    failures.push(
      ...(await inspect()).failures.map((failure) =>
        `Theme system: ${failure}`
      ),
    );
    await page.emulateMedia({ colorScheme: "light" });
    const lightCanvas = await root.evaluate((node) =>
      getComputedStyle(node).getPropertyValue("--discern-color-canvas").trim()
    );
    if (darkCanvas === lightCanvas) {
      failures.push(
        "Theme system: System mode did not follow the operating-system scheme",
      );
    }

    const fontGeometry = await page.evaluate(async (metricCases) => {
      const consumer = document.querySelector<HTMLElement>(
        "[data-discern-theme-consumer]",
      );
      if (consumer === null) {
        return {
          checks: 0,
          coveredAliases: [] as string[],
          maxWidthDeltaPercent: 0,
          maxLineBoxDeltaPixels: 0,
          skippedAliases: [] as string[],
          failures: ["font role consumer is missing"],
        };
      }
      const roleStacks = {
        "--discern-font-display": [
          '"Crimson Pro"',
          '"Discern Crimson Fallback Iowan"',
          '"Discern Crimson Fallback Georgia"',
          "serif",
        ],
        "--discern-font-body": [
          '"Inter"',
          '"Discern Inter Fallback Helvetica"',
          '"Discern Inter Fallback Arial"',
          "sans-serif",
        ],
        "--discern-font-ui": [
          '"Inter"',
          '"Discern Inter Fallback Helvetica"',
          '"Discern Inter Fallback Arial"',
          "sans-serif",
        ],
        "--discern-font-mono": [
          '"JetBrains Mono"',
          "ui-monospace",
          "monospace",
        ],
      } as const;
      const current = getComputedStyle(consumer);
      const currentFailures: string[] = [];
      for (const [role, expected] of Object.entries(roleStacks)) {
        const stack = current.getPropertyValue(role).trim();
        let previous = -1;
        for (const family of expected) {
          const index = stack.indexOf(family);
          if (index <= previous) {
            currentFailures.push(
              `${role} does not preserve ${expected.join(" → ")}`,
            );
            break;
          }
          previous = index;
        }
      }

      const texts = [
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
        "Pack my box with five dozen liquor jugs. 0123456789",
        "System Light Dark Continue Cancel Retry Complete",
        "Deterministic interfaces guide reliable work",
      ];
      const cases = [
        ...metricCases.map((candidate) => ({
          ...candidate,
          metricAdjusted: true,
        })),
        {
          name: "JetBrains/terminal mono",
          target: '"JetBrains Mono"',
          fallback: 'ui-monospace, "SF Mono", Menlo, monospace',
          style: "normal",
          weights: [400, 600],
          metricAdjusted: false,
        },
      ];
      let checks = 0;
      const coveredAliases: string[] = [];
      let maxWidthDeltaPercent = 0;
      let maxLineBoxDeltaPixels = 0;
      const skippedAliases: string[] = [];
      for (const candidate of cases) {
        const loaded = await document.fonts.load(
          `${candidate.style} ${
            candidate.weights[0]
          } 64px ${candidate.fallback}`,
        );
        if (candidate.metricAdjusted && loaded.length === 0) {
          skippedAliases.push(candidate.name);
          continue;
        }
        if (candidate.metricAdjusted) {
          coveredAliases.push(candidate.name);
        }
        for (const weight of candidate.weights) {
          for (const text of texts) {
            const measure = (
              family: string,
            ): { readonly width: number; readonly height: number } => {
              const probe = document.createElement("span");
              probe.textContent = text;
              Object.assign(probe.style, {
                position: "absolute",
                display: "inline-block",
                whiteSpace: "nowrap",
                fontFamily: family,
                fontSize: "64px",
                fontStyle: candidate.style,
                fontWeight: String(weight),
                lineHeight: "normal",
              });
              consumer.append(probe);
              const rect = probe.getBoundingClientRect();
              probe.remove();
              return { width: rect.width, height: rect.height };
            };
            const target = measure(candidate.target);
            const fallback = measure(candidate.fallback);
            const delta = Math.abs(
              (target.width / fallback.width - 1) * 100,
            );
            maxWidthDeltaPercent = Math.max(
              maxWidthDeltaPercent,
              delta,
            );
            const lineBoxDelta = Math.abs(target.height - fallback.height);
            if (candidate.metricAdjusted) {
              maxLineBoxDeltaPixels = Math.max(
                maxLineBoxDeltaPixels,
                lineBoxDelta,
              );
            }
            if (delta > 2.5) {
              currentFailures.push(
                `${candidate.name} width differs by ${
                  delta.toFixed(2)
                }% at ${weight}`,
              );
            }
            if (candidate.metricAdjusted && lineBoxDelta > 0.25) {
              currentFailures.push(
                `${candidate.name} normal line box differs by ${
                  lineBoxDelta.toFixed(2)
                }px at ${weight}`,
              );
            }
            checks += 1;
          }
        }
      }
      return {
        checks,
        coveredAliases,
        maxWidthDeltaPercent,
        maxLineBoxDeltaPixels,
        skippedAliases,
        failures: currentFailures,
      };
    }, fontMetricAudit.browserCases);
    failures.push(
      ...fontGeometry.failures.map((failure) => `Font geometry: ${failure}`),
    );

    const futureProof = await page.evaluate(() => {
      function failuresFor(consumer: HTMLElement): string[] {
        const problems: string[] = [];
        const mode = consumer.dataset.discernTheme;
        const selector = consumer.dataset.discernThemeControl;
        const control = selector === undefined
          ? null
          : consumer.querySelector(selector);
        const checked = control?.querySelector<HTMLInputElement>(
          "input:checked",
        )?.value;
        const key = consumer.dataset.discernThemeStorageKey;
        const stored = key === undefined
          ? undefined
          : localStorage.getItem(key);
        if (checked !== mode) problems.push("checked/root mismatch");
        if (key !== undefined && stored !== mode) {
          problems.push("storage/root mismatch");
        }
        return problems;
      }

      const future = document.createElement("div");
      future.dataset.discernThemeConsumer = "";
      future.dataset.discernTheme = "dark";
      future.dataset.discernThemeControl = ".discern-theme-switcher";
      future.dataset.discernThemeStorageKey = "future-theme";
      future.innerHTML = "<fieldset class='discern-theme-switcher'>" +
        "<label><input type='radio' value='system' checked>System</label>" +
        "</fieldset>";
      localStorage.setItem("future-theme", "light");
      document.body.append(future);
      const caught = failuresFor(future).length === 2;
      future.remove();
      localStorage.removeItem("future-theme");
      return caught;
    });
    if (!futureProof) {
      failures.push(
        "Theme system: synthetic future consumer escaped the detector",
      );
    }
    return {
      consumers: initial.consumers,
      geometryChecks,
      fontFallbackChecks: fontGeometry.checks,
      fontFallbackAliasesCovered: fontGeometry.coveredAliases,
      fontFallbackAliasesSkipped: fontGeometry.skippedAliases,
      fontMetricOverrideFaces: fontMetricAudit.faces,
      maxFontLineBoxDeltaPixels: fontGeometry.maxLineBoxDeltaPixels,
      maxFontWidthDeltaPercent: fontGeometry.maxWidthDeltaPercent,
      failures: initial.failures,
      futureProof,
    };
  } finally {
    await context.close();
  }
}

async function verifySemanticFocus(
  page: Page,
  origin: string,
  failures: string[],
): Promise<SemanticFocusResult> {
  const focusToken = "--discern-color-accent-500";
  const surfaces = themeTokens.flatMap(({ name }) => {
    const role = name === "--discern-color-accent-100"
      ? "accent"
      : name.match(/^--discern-color-(success|warning|danger)-soft$/)?.[1];
    return role === undefined ? [] : [{ role, token: name }];
  });
  const roles = new Set(surfaces.map(({ role }) => role));
  if (
    surfaces.length !== 4 ||
    !["accent", "success", "warning", "danger"].every((role) => roles.has(role))
  ) {
    failures.push(
      `Semantic focus: expected accent, success, warning, and danger surface tokens; found ${
        [...roles].toSorted().join(", ") || "none"
      }`,
    );
    return { targets: 0, roles: [] };
  }

  let targets = 0;
  for (const theme of ["light", "dark"] as const) {
    await loadPage(page, conformanceUrl(origin, theme));
    const installed = await page.evaluate(
      ({ focusToken, surfaces }) => {
        const root = document.querySelector<HTMLElement>(
          "[data-discern-root]",
        );
        if (root === null) return false;
        const host = document.createElement("div");
        host.dataset.discernSemanticFocusSmoke = "";
        host.style.cssText =
          "position:fixed;inset:8px auto auto 8px;z-index:2147483647;" +
          "display:grid;gap:12px;padding:12px;";
        for (const { role, token } of surfaces) {
          const surface = document.createElement("div");
          surface.style.cssText =
            `display:flex;align-items:center;gap:8px;padding:8px;` +
            `background:var(${token});`;
          const sentinel = document.createElement("span");
          sentinel.tabIndex = 0;
          sentinel.textContent = `Start ${role}`;
          sentinel.dataset.discernSemanticFocusSentinel = role;
          const button = document.createElement("button");
          button.type = "button";
          button.className = "discern-button";
          button.textContent = `Focus ${role}`;
          button.dataset.discernSemanticFocusProbe = role;
          button.dataset.discernExpectedFocusToken = focusToken;
          surface.append(sentinel, button);
          host.append(surface);
        }
        root.prepend(host);
        return true;
      },
      { focusToken, surfaces },
    );
    if (!installed) {
      failures.push(
        `Semantic focus: ${theme} catalogue root is missing`,
      );
      continue;
    }

    for (const { role } of surfaces) {
      const sentinel = page.locator(
        `[data-discern-semantic-focus-sentinel="${role}"]`,
      );
      const button = page.locator(
        `[data-discern-semantic-focus-probe="${role}"]`,
      );
      await sentinel.focus();
      await page.keyboard.press("Tab");
      const result = await button.evaluate((node, focusToken) => {
        const style = getComputedStyle(node);
        const tokenWitness = document.createElement("span");
        tokenWitness.style.color = `var(${focusToken})`;
        tokenWitness.style.position = "absolute";
        node.append(tokenWitness);
        const expectedColor = getComputedStyle(tokenWitness).color;
        tokenWitness.remove();
        return {
          active: node.ownerDocument.activeElement === node,
          focusVisible: node.matches(":focus-visible"),
          outlineColor: style.outlineColor,
          outlineStyle: style.outlineStyle,
          outlineWidth: Number.parseFloat(style.outlineWidth),
          expectedColor,
        };
      }, focusToken);
      targets += 1;
      if (
        !result.active ||
        !result.focusVisible ||
        result.outlineStyle === "none" ||
        !Number.isFinite(result.outlineWidth) ||
        result.outlineWidth < 2 ||
        result.outlineColor !== result.expectedColor
      ) {
        failures.push(
          `Semantic focus: ${theme}/${role} button expected keyboard :focus-visible with a 2px or wider ${focusToken} outline; active=${result.active}, focus-visible=${result.focusVisible}, outline=${result.outlineWidth}px ${result.outlineStyle} ${result.outlineColor}, token=${result.expectedColor}`,
        );
      }
    }
  }
  return { targets, roles: [...roles].toSorted() };
}

/** Run the journey and cross-component resilience predicates. */
export async function runResilienceConformance(
  browser: Browser,
  page: Page,
  origin: string,
  failures: string[],
): Promise<ResilienceConformanceSummary> {
  requireViewport(page, WIDE_VIEWPORT, "Resilience conformance");
  await loadPage(page, conformanceUrl(origin));
  const journeyStructure = await verifyJourneyStructure(page, failures);
  const journeyAxeScans = await scanJourneyAccessibility(
    page,
    origin,
    failures,
  );
  const journeyKeyboard = await verifyJourneyKeyboard(
    page,
    origin,
    failures,
  );
  const disclosures = await verifyDisclosures(page, origin, failures);
  const nestedControls = await verifyNestedControls(page, origin, failures);
  const targets = await verifyTargetSizes(page, origin, failures);
  const narrowReflow = await reflowAt(
    page,
    origin,
    NARROW_VIEWPORT,
    "390px",
    failures,
  );
  const zoomedReflow = await reflowAt(
    page,
    origin,
    ZOOMED_REFLOW_VIEWPORT,
    "400% (1280px represented by a 320 CSS px viewport)",
    failures,
  );
  const motionTargets = await verifyMotionPreferences(
    browser,
    origin,
    failures,
  );
  const theme = await verifyThemeSystem(browser, origin, failures);
  failures.push(...theme.failures.map((failure) => `Theme system: ${failure}`));
  const semanticFocus = await verifySemanticFocus(
    page,
    origin,
    failures,
  );

  return {
    journeys: journeyStructure.journeys,
    journeyStages: journeyStructure.stages,
    journeyAxeScans,
    journeyTabStops: journeyKeyboard.tabStops,
    journeyCommandCopies: journeyKeyboard.commandCopies,
    disclosures: disclosures.result.disclosures,
    disclosureToggles: disclosures.toggles,
    interactiveControls: nestedControls.controls,
    targets: targets.targets,
    inlineTextTargetExceptions: targets.inlineTextExceptions,
    labelledControlBoxes: targets.labelledControlBoxes,
    reflowSurfaces: narrowReflow.surfaces + zoomedReflow.surfaces,
    containedOverflowRegions: narrowReflow.containedOverflow +
      zoomedReflow.containedOverflow,
    motionTargets,
    themeConsumers: theme.consumers,
    themeGeometryChecks: theme.geometryChecks,
    fontFallbackChecks: theme.fontFallbackChecks,
    fontFallbackAliasesCovered: theme.fontFallbackAliasesCovered,
    fontFallbackAliasesSkipped: theme.fontFallbackAliasesSkipped,
    fontMetricOverrideFaces: theme.fontMetricOverrideFaces,
    maxFontLineBoxDeltaPixels: theme.maxFontLineBoxDeltaPixels,
    maxFontWidthDeltaPercent: theme.maxFontWidthDeltaPercent,
    semanticFocusTargets: semanticFocus.targets,
    semanticFocusRoles: semanticFocus.roles,
  };
}
