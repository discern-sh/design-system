import { AxeBuilder } from "@axe-core/playwright";
import { fromFileUrl } from "@std/path";
import {
  type Browser,
  chromium,
  type Locator,
  type Page,
} from "playwright-core";
import { packageManifest } from "../src/manifest.ts";
import type {
  ConformanceScenario,
  ConformanceStep,
  ConformanceTarget,
} from "../styleguide/conformance.ts";
import { buildDesignSystem } from "./build.ts";
import catalogueServer from "./serve.ts";

const OUTPUT_ROOT = new URL("../dist/conformance/", import.meta.url);
const WIDE_VIEWPORT = { width: 1440, height: 1000 } as const;
const NARROW_VIEWPORT = { width: 390, height: 844 } as const;
const WCAG_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
] as const;

type CatalogueTheme = "light" | "dark";
type AccessibleRole = Parameters<Locator["getByRole"]>[0];

function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function conformanceUrl(
  origin: string,
  theme: CatalogueTheme,
  component?: string,
): string {
  const url = new URL("/style-guide/", origin);
  url.searchParams.set("conformance", "1");
  url.searchParams.set("theme", theme);
  if (component) url.searchParams.set("component", component);
  return url.href;
}

async function launchBrowser(): Promise<Browser> {
  const explicitPath = Deno.env.get("DISCERN_CHROME_PATH");
  const attempts: Array<{
    readonly label: string;
    readonly options: Parameters<typeof chromium.launch>[0];
  }> = explicitPath
    ? [{
      label: `DISCERN_CHROME_PATH (${explicitPath})`,
      options: { executablePath: explicitPath, headless: true },
    }]
    : [
      {
        label: "installed Google Chrome",
        options: { channel: "chrome", headless: true },
      },
      {
        label: "Playwright-managed Chromium",
        options: { headless: true },
      },
    ];
  const failures: string[] = [];
  for (const attempt of attempts) {
    try {
      return await chromium.launch(attempt.options);
    } catch (error) {
      failures.push(
        `${attempt.label}: ${
          error instanceof Error ? error.message.split("\n")[0] : String(error)
        }`,
      );
    }
  }
  throw new Error(
    `No compatible Chromium browser was available. Install Google Chrome, run the Playwright Chromium installer, or set DISCERN_CHROME_PATH.\n${
      failures.join("\n")
    }`,
  );
}

async function loadConformancePage(
  page: Page,
  url: string,
): Promise<void> {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator('[data-discern-conformance-ready="true"]').waitFor();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

function targetLocator(
  root: Locator,
  target: ConformanceTarget,
): Locator {
  if ("selector" in target) return root.locator(target.selector);
  const role = target.role as AccessibleRole;
  return target.name === undefined
    ? root.getByRole(role, { includeHidden: true })
    : root.getByRole(role, {
      name: target.name,
      exact: true,
      includeHidden: true,
    });
}

async function exactlyOne(
  locator: Locator,
  target: ConformanceTarget,
): Promise<Locator> {
  const count = await locator.count();
  invariant(
    count === 1,
    `Expected one target but found ${count}: ${JSON.stringify(target)}`,
  );
  return locator;
}

async function eventually(
  predicate: () => Promise<boolean>,
  failure: string,
): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(failure);
}

async function isPerceivable(locator: Locator): Promise<boolean> {
  if (!await locator.count() || !await locator.first().isVisible()) {
    return false;
  }
  return await locator.first().evaluate((node) => {
    let current: Element | null = node;
    while (current) {
      if (Number.parseFloat(getComputedStyle(current).opacity) === 0) {
        return false;
      }
      current = current.parentElement;
    }
    return true;
  });
}

async function performStep(
  page: Page,
  root: Locator,
  step: ConformanceStep,
): Promise<void> {
  if ("action" in step) {
    if (step.action === "press") {
      if (step.target) {
        await (await exactlyOne(
          targetLocator(root, step.target),
          step.target,
        )).press(step.key);
      } else {
        await page.keyboard.press(step.key);
      }
      return;
    }
    const target = await exactlyOne(
      targetLocator(root, step.target),
      step.target,
    );
    if (step.action === "click") await target.click();
    else if (step.action === "focus") await target.focus();
    else await target.hover();
    return;
  }

  const target = targetLocator(root, step.target);
  if (step.expect === "hidden") {
    await eventually(
      async () => !await isPerceivable(target),
      `Target remained perceivable: ${JSON.stringify(step.target)}`,
    );
    return;
  }
  const element = await exactlyOne(target, step.target);
  if (step.expect === "visible") {
    await eventually(
      () => isPerceivable(element),
      `Target did not become perceivable: ${JSON.stringify(step.target)}`,
    );
    return;
  }
  if (step.expect === "focused") {
    await eventually(
      () =>
        element.evaluate((node) => node.ownerDocument.activeElement === node),
      `Target did not receive focus: ${JSON.stringify(step.target)}`,
    );
    return;
  }
  if (step.expect === "attribute") {
    await eventually(
      async () => await element.getAttribute(step.attribute) === step.value,
      `Expected ${step.attribute}=${JSON.stringify(step.value)} on ${
        JSON.stringify(step.target)
      }`,
    );
    return;
  }

  invariant(step.expect === "describes", "Unknown conformance expectation");
  const description = await exactlyOne(
    targetLocator(root, step.description),
    step.description,
  );
  const descriptionId = await description.getAttribute("id");
  const describedBy = await element.getAttribute("aria-describedby");
  invariant(descriptionId, "Described element has no id");
  invariant(
    describedBy?.split(/\s+/).includes(descriptionId),
    `Expected ${
      JSON.stringify(step.target)
    } to reference ${descriptionId} through aria-describedby`,
  );
}

function parseScenarios(
  serialized: string | null,
  component: string,
): readonly ConformanceScenario[] {
  const parsed: unknown = JSON.parse(serialized ?? "[]");
  invariant(
    Array.isArray(parsed),
    `${component} conformance scenarios are not an array`,
  );
  for (const scenario of parsed) {
    invariant(
      typeof scenario === "object" && scenario !== null &&
        "name" in scenario && typeof scenario.name === "string" &&
        "steps" in scenario && Array.isArray(scenario.steps),
      `${component} has a malformed conformance scenario`,
    );
  }
  return parsed as readonly ConformanceScenario[];
}

function addPageFailureListeners(page: Page, failures: string[]): void {
  page.on("pageerror", (error) => {
    failures.push(`Browser exception: ${error.message}`);
  });
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().startsWith("Failed to load resource:")
    ) {
      failures.push(`Browser console: ${message.text()}`);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failures.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });
}

async function assertAutoEnrollment(
  page: Page,
  expected: readonly string[],
): Promise<void> {
  const actual = await page.locator("[data-discern-component]").evaluateAll(
    (elements) =>
      elements.map((element) =>
        element.getAttribute("data-discern-component") ?? ""
      ),
  );
  invariant(
    JSON.stringify(actual) === JSON.stringify(expected),
    `Catalogue enrollment differs from the runtime manifest.\nExpected: ${
      expected.join(", ")
    }\nActual: ${actual.join(", ")}`,
  );
}

async function scanAccessibility(
  page: Page,
  theme: CatalogueTheme,
  components: readonly string[],
  failures: string[],
): Promise<number> {
  let scans = 0;
  for (const component of components) {
    const selector =
      `[data-discern-component="${component}"] .discern-catalogue-component__canvas`;
    try {
      const results = await new AxeBuilder({ page })
        .include(selector)
        .withTags([...WCAG_TAGS])
        .analyze();
      scans += 1;
      for (const violation of results.violations) {
        const targets = violation.nodes.map((node) => {
          const summary = node.failureSummary?.replace(/\s+/g, " ").trim();
          return `${JSON.stringify(node.target)}${
            summary ? ` — ${summary}` : ""
          }`;
        }).join("; ");
        failures.push(
          `${theme}/${component}: ${violation.id} (${
            violation.impact ?? "unknown impact"
          }) at ${targets}`,
        );
      }
    } catch (error) {
      failures.push(
        `${theme}/${component}: accessibility scan failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  return scans;
}

async function runInteractionScenarios(
  page: Page,
  origin: string,
  components: readonly string[],
  failures: string[],
): Promise<number> {
  let scenariosRun = 0;
  await loadConformancePage(page, conformanceUrl(origin, "light"));
  const manifests = new Map<string, readonly ConformanceScenario[]>();
  for (const component of components) {
    const card = page.locator(
      `[data-discern-component="${component}"]`,
    );
    manifests.set(
      component,
      parseScenarios(
        await card.getAttribute("data-discern-conformance-scenarios"),
        component,
      ),
    );
  }

  for (const component of components) {
    for (const scenario of manifests.get(component) ?? []) {
      try {
        await loadConformancePage(
          page,
          conformanceUrl(origin, "light", component),
        );
        const root = page.locator(
          `[data-discern-component="${component}"] .discern-catalogue-component__canvas`,
        );
        for (const step of scenario.steps) {
          await performStep(page, root, step);
        }
        scenariosRun += 1;
      } catch (error) {
        failures.push(
          `${component}/${scenario.name}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }
  return scenariosRun;
}

async function captureReviewSheets(
  page: Page,
  origin: string,
): Promise<number> {
  await Deno.mkdir(OUTPUT_ROOT, { recursive: true });
  let screenshots = 0;
  for (
    const [size, viewport] of [
      ["wide", WIDE_VIEWPORT],
      ["narrow", NARROW_VIEWPORT],
    ] as const
  ) {
    await page.setViewportSize(viewport);
    for (const theme of ["light", "dark"] as const) {
      await loadConformancePage(page, conformanceUrl(origin, theme));
      await page.screenshot({
        path: fromFileUrl(
          new URL(`catalogue-${theme}-${size}.png`, OUTPUT_ROOT),
        ),
        fullPage: true,
        animations: "disabled",
      });
      screenshots += 1;
    }
  }
  return screenshots;
}

async function verifyForcedColors(
  browser: Browser,
  origin: string,
  componentCount: number,
  failures: string[],
): Promise<number> {
  const context = await browser.newContext({
    viewport: WIDE_VIEWPORT,
    forcedColors: "active",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  addPageFailureListeners(page, failures);
  let checked = 0;
  try {
    await loadConformancePage(page, conformanceUrl(origin, "light"));
    invariant(
      await page.locator("[data-discern-component]").count() === componentCount,
      "Forced-colours rendering did not include every component",
    );
    const focusable = page.locator(
      ".discern-catalogue-component__canvas :is(a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1']))",
    );
    for (let index = 0; index < await focusable.count(); index += 1) {
      const element = focusable.nth(index);
      if (!await element.isVisible() || !await element.isEnabled()) continue;
      await element.focus();
      const outline = await element.evaluate((node) => {
        const style = getComputedStyle(node);
        return {
          style: style.outlineStyle,
          width: Number.parseFloat(style.outlineWidth),
        };
      });
      if (outline.style === "none" || outline.width < 2) {
        failures.push(
          `Forced colours: focused element has no two-pixel outline: ${await element
            .evaluate((node) => node.outerHTML.slice(0, 180))}`,
        );
      }
      checked += 1;
    }
    await Deno.mkdir(OUTPUT_ROOT, { recursive: true });
    await page.screenshot({
      path: fromFileUrl(
        new URL("catalogue-forced-colors-wide.png", OUTPUT_ROOT),
      ),
      fullPage: true,
      animations: "disabled",
    });
  } finally {
    await context.close();
  }
  return checked;
}

/** Build and exercise every catalogue example in a real Chromium browser. */
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
    browser = await launchBrowser();
    const context = await browser.newContext({
      viewport: WIDE_VIEWPORT,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    addPageFailureListeners(page, failures);

    await loadConformancePage(page, conformanceUrl(origin, "light"));
    await assertAutoEnrollment(page, expectedComponents);
    let accessibilityScans = 0;
    for (const theme of ["light", "dark"] as const) {
      await loadConformancePage(page, conformanceUrl(origin, theme));
      accessibilityScans += await scanAccessibility(
        page,
        theme,
        expectedComponents,
        failures,
      );
    }
    const scenarios = await runInteractionScenarios(
      page,
      origin,
      expectedComponents,
      failures,
    );
    const screenshots = await captureReviewSheets(page, origin);
    await context.close();
    const forcedColorFocusChecks = await verifyForcedColors(
      browser,
      origin,
      expectedComponents.length,
      failures,
    );

    invariant(
      !failures.length,
      `Component conformance failed:\n- ${failures.join("\n- ")}`,
    );
    console.log(
      `Conformance passed: ${expectedComponents.length} components, ${accessibilityScans} accessibility scans, ${scenarios} interaction scenarios, ${forcedColorFocusChecks} forced-colour focus checks, and ${
        screenshots + 1
      } review screenshots.`,
    );
  } finally {
    await browser?.close();
    await server.shutdown();
  }
}

if (import.meta.main) await runConformance();
