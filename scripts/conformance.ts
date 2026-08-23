import { fromFileUrl } from "@std/path";
import { type Browser, type Locator, type Page } from "playwright-core";
import { packageManifest } from "../src/manifest.ts";
import type { ComponentBehavior } from "../src/types/component-meta.ts";
import type {
  ConformanceScenario,
  ConformanceStep,
  ConformanceTarget,
} from "../catalogue/conformance.ts";
import { catalogueCliCapabilities } from "../catalogue/cli-preview.tsx";
import {
  catalogueComponentPath,
  catalogueRoutePaths,
} from "../catalogue/routes.ts";
import { terminalFoundationSheets } from "../catalogue/terminal-foundations.ts";
import { launchBrowser } from "./browser.ts";
import {
  addPageFailureListeners,
  scanBrowserAccessibility,
} from "./browser-conformance-support.ts";
import { buildDesignSystem } from "./build.ts";
import { runBuilderConformance } from "./builder-conformance.ts";
import { runResilienceConformance } from "./resilience-conformance.ts";
import catalogueServer from "./serve.ts";
import { withViewport } from "./viewport.ts";

const OUTPUT_ROOT = new URL("../dist/conformance/", import.meta.url);
const WIDE_VIEWPORT = { width: 1440, height: 1000 } as const;
const TERMINAL_REVIEW_VIEWPORT = { width: 1920, height: 1200 } as const;
const NARROW_VIEWPORT = { width: 390, height: 844 } as const;

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
  const url = new URL("/catalogue/", origin);
  url.searchParams.set("conformance", "1");
  url.searchParams.set("theme", theme);
  if (component) url.searchParams.set("component", component);
  return url.href;
}

async function loadConformancePage(
  page: Page,
  url: string,
): Promise<void> {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator('[data-discern-conformance-ready="true"]').waitFor();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

async function loadCataloguePage(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator(".discern-catalogue-shell").waitFor();
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

  if (step.expect === "clipboard") {
    await eventually(
      async () =>
        await page.evaluate(async () =>
          await navigator.clipboard.readText()
        ) ===
          step.value,
      `Expected clipboard to contain ${JSON.stringify(step.value)}`,
    );
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
  if (step.expect === "within-viewport") {
    const element = await exactlyOne(target, step.target);
    const bounds = await element.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        viewportWidth: node.ownerDocument.documentElement.clientWidth,
        viewportHeight: node.ownerDocument.documentElement.clientHeight,
      };
    });
    const tolerance = step.tolerance ?? 1;
    invariant(
      bounds.top >= -tolerance &&
        bounds.left >= -tolerance &&
        bounds.right <= bounds.viewportWidth + tolerance &&
        bounds.bottom <= bounds.viewportHeight + tolerance,
      `Expected target within ${bounds.viewportWidth}×${bounds.viewportHeight}px viewport but found ${
        bounds.left.toFixed(2)
      }, ${bounds.top.toFixed(2)} → ${bounds.right.toFixed(2)}, ${
        bounds.bottom.toFixed(2)
      }: ${JSON.stringify(step.target)}`,
    );
    return;
  }
  if (step.expect === "contained-x") {
    const element = await exactlyOne(target, step.target);
    const width = await element.evaluate((node) => ({
      clientWidth: node.clientWidth,
      scrollWidth: node.scrollWidth,
    }));
    const tolerance = step.tolerance ?? 1;
    invariant(
      width.scrollWidth <= width.clientWidth + tolerance,
      `Expected horizontal containment but found ${width.clientWidth}px client / ${width.scrollWidth}px content: ${
        JSON.stringify(step.target)
      }`,
    );
    return;
  }
  if (step.expect === "scrollable-x") {
    const element = await exactlyOne(target, step.target);
    const overflow = await element.evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth,
        overflowX: style.overflowX,
      };
    });
    invariant(
      overflow.scrollWidth > overflow.clientWidth &&
        (overflow.overflowX === "auto" || overflow.overflowX === "scroll"),
      `Expected horizontal scrolling but found ${overflow.clientWidth}px client / ${overflow.scrollWidth}px content with overflow-x=${overflow.overflowX}: ${
        JSON.stringify(step.target)
      }`,
    );
    return;
  }
  if (step.expect === "aligned") {
    const positions = await target.evaluateAll(
      (nodes, edge) =>
        nodes.map((node) => {
          const bounds = node.getBoundingClientRect();
          return edge === "top" ? bounds.top : bounds.bottom;
        }),
      step.edge,
    );
    invariant(
      positions.length > 1,
      `Expected multiple aligned targets but found ${positions.length}: ${
        JSON.stringify(step.target)
      }`,
    );
    const tolerance = step.tolerance ?? 1;
    invariant(
      Math.max(...positions) - Math.min(...positions) <= tolerance,
      `Expected ${step.edge} edges within ${tolerance}px but found ${
        positions.map((position) => position.toFixed(2)).join(", ")
      }`,
    );
    return;
  }
  if (step.expect === "balanced-rows") {
    const tops = await target.evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().top)
    );
    invariant(
      tops.length > 1,
      `Expected multiple row targets but found ${tops.length}: ${
        JSON.stringify(step.target)
      }`,
    );
    const tolerance = step.tolerance ?? 1;
    const rows: number[][] = [];
    for (const top of tops.toSorted((left, right) => left - right)) {
      const row = rows.find((positions) =>
        Math.abs((positions[0] ?? top) - top) <= tolerance
      );
      if (row) row.push(top);
      else rows.push([top]);
    }
    const counts = rows.map((row) => row.length);
    invariant(
      counts.length === 1 || counts.every((count) => count > 1),
      `Expected balanced rows without a singleton; found ${counts.join(" + ")}`,
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

function componentProvidesBehavior(
  componentId: string,
  behavior: ComponentBehavior,
  visited = new Set<string>(),
): boolean {
  if (visited.has(componentId)) return false;
  visited.add(componentId);
  const component = packageManifest.components.find(({ id }) =>
    id === componentId
  );
  return component?.behaviors.includes(behavior) === true ||
    component?.dependencies.some((dependency) =>
        componentProvidesBehavior(dependency, behavior, visited)
      ) === true;
}

async function verifyFloatingSurfaceCure(page: Page): Promise<number> {
  const current = await page.evaluate(() => {
    const references = [...document.querySelectorAll<HTMLElement>(
      "[aria-details], [aria-describedby]",
    )];
    return [...document.querySelectorAll<HTMLElement>(
      "[id][role='group'], [id][role='tooltip']",
    )].flatMap((panel) => {
      const trigger = references.find((candidate) =>
        ["aria-details", "aria-describedby"].some((attribute) =>
          candidate.getAttribute(attribute)?.split(/\s+/).includes(panel.id)
        )
      );
      if (!trigger) return [];
      const position = getComputedStyle(panel).position;
      if (position !== "absolute" && position !== "fixed") return [];
      return [{
        component: panel.closest<HTMLElement>("[data-discern-component]")
          ?.dataset.discernComponent ?? "",
        panel: panel.outerHTML.slice(0, 180),
        hasRoot: panel.closest("[data-discern-floating-root]") !== null,
        hasTrigger: trigger.hasAttribute("data-discern-floating-trigger"),
        hasPanel: panel.hasAttribute("data-discern-floating-panel"),
      }];
    });
  });
  invariant(current.length > 0, "No floating supplementary surfaces found");
  const contractFailures: string[] = [];
  for (const surface of current) {
    if (!(surface.hasRoot && surface.hasTrigger && surface.hasPanel)) {
      contractFailures.push(
        `${surface.component} floating surface lacks the shared behavior contract: ${surface.panel}`,
      );
      continue;
    }
    if (
      !packageManifest.components.some(({ id }) => id === surface.component)
    ) {
      contractFailures.push(`Unknown floating component: ${surface.component}`);
      continue;
    }
    if (!componentProvidesBehavior(surface.component, "floating-surface")) {
      contractFailures.push(
        `${surface.component} does not enrol the floating-surface behavior`,
      );
    }
  }

  const futureSibling = await page.evaluate(async () => {
    const fixture = document.createElement("div");
    fixture.innerHTML = `
      <div class="future-crop" style="width: 8rem; height: 4rem; overflow: hidden">
        <span
          class="future-shell"
          data-discern-floating-root
          data-discern-floating-placement="bottom"
          data-discern-floating-align="start"
        >
          <button
            id="future-trigger"
            type="button"
            aria-details="future-panel"
            data-discern-floating-trigger
          >Future trigger</button>
          <span
            id="future-panel"
            class="future-panel"
            role="group"
            aria-label="Future details"
            data-discern-floating-panel
            style="width: 18rem; height: 3rem; opacity: 0; visibility: hidden"
          >Future supplementary surface</span>
        </span>
      </div>`;
    document.body.append(fixture);
    const trigger = fixture.querySelector<HTMLElement>("#future-trigger");
    const panel = fixture.querySelector<HTMLElement>("#future-panel");
    const clip = fixture.querySelector<HTMLElement>(".future-crop");
    if (!trigger || !panel || !clip) {
      throw new Error("Future floating-surface fixture is incomplete");
    }
    const waitFor = async (predicate: () => boolean): Promise<void> => {
      const deadline = performance.now() + 2_000;
      while (!predicate() && performance.now() < deadline) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      if (!predicate()) {
        throw new Error("Floating-surface enhancement timed out");
      }
    };
    await waitFor(() => panel.hasAttribute("popover"));
    trigger.focus();
    await waitFor(() =>
      panel.matches(":popover-open") &&
      panel.hasAttribute("data-discern-floating-positioned")
    );
    const panelBounds = panel.getBoundingClientRect();
    const clipBounds = clip.getBoundingClientRect();
    const sample = {
      x: Math.min(
        panelBounds.right - 2,
        Math.max(clipBounds.right + 2, panelBounds.left + 2),
      ),
      y: Math.min(panelBounds.bottom - 2, panelBounds.top + 8),
    };
    const extendsBeyondClip = panelBounds.right > clipBounds.right + 1 ||
      panelBounds.bottom > clipBounds.bottom + 1 ||
      panelBounds.left < clipBounds.left - 1 ||
      panelBounds.top < clipBounds.top - 1;
    const paintedBeyondClip = document.elementsFromPoint(sample.x, sample.y)
      .some((element) => element === panel || panel.contains(element));
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await waitFor(() => !panel.matches(":popover-open"));
    const focusRestored = document.activeElement === trigger;
    fixture.remove();
    return {
      extendsBeyondClip,
      paintedBeyondClip,
      focusRestored,
    };
  });
  invariant(
    futureSibling.extendsBeyondClip,
    "Future floating surface did not extend beyond its clipping ancestor",
  );
  invariant(
    futureSibling.paintedBeyondClip,
    "Future floating surface was clipped outside its ancestor",
  );
  invariant(
    futureSibling.focusRestored,
    "Escape did not restore the future floating surface trigger",
  );
  invariant(
    contractFailures.length === 0,
    contractFailures.join("\n"),
  );
  return current.length;
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
      const results = await scanBrowserAccessibility(page, selector);
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
        await withViewport(
          page,
          scenario.viewport ?? WIDE_VIEWPORT,
          async () => {
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
          },
        );
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

async function verifyStateFragmentRestoration(
  page: Page,
  origin: string,
): Promise<void> {
  await withViewport(page, WIDE_VIEWPORT, async () => {
    await loadConformancePage(page, conformanceUrl(origin, "light"));
    const states = await page.locator(
      '.discern-catalogue-example-state[id^="component-"][id*="--"]',
    ).evaluateAll((nodes) =>
      nodes.map((node) => {
        const component = node.closest<HTMLElement>(
          "[data-discern-component]",
        );
        return {
          fragment: node.id,
          component: component?.dataset.discernComponent,
        };
      })
    );
    invariant(
      states.length > 0,
      "Fragment restoration needs a Catalogue state",
    );
    for (const state of states) {
      invariant(
        state.component !== undefined &&
          state.fragment.startsWith(`component-${state.component}--`) &&
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
            state.fragment.slice(`component-${state.component}--`.length),
          ),
        `Catalogue state ID does not derive from its component: #${state.fragment}`,
      );
    }
    const state = states[Math.floor(states.length / 2)];
    invariant(state, "Fragment restoration needs a middle Catalogue state");
    invariant(
      state.component !== undefined,
      "Fragment restoration needs a Component-owned state",
    );
    const fragment = state.fragment;
    const url = new URL(catalogueRoutePaths.overview, origin);
    url.hash = fragment;
    await loadCataloguePage(page, url.href);
    invariant(
      new URL(page.url()).pathname === catalogueComponentPath(state.component),
      `Legacy state link did not upgrade to ${
        catalogueComponentPath(state.component)
      }`,
    );
    const target = page.locator(`#${fragment}`);
    let position = Number.POSITIVE_INFINITY;
    await eventually(
      async () => {
        position = await target.evaluate((node) =>
          node.getBoundingClientRect().top
        );
        return position >= 0 && position <= 160;
      },
      `Cold fragment load left #${fragment} outside the viewport`,
    );
    const targetState = await target.evaluate((node) => ({
      matchesTarget: node.matches(":target"),
      boxShadow: getComputedStyle(node).boxShadow,
      component: node.closest<HTMLElement>("[data-discern-component]")?.dataset
        .discernComponent,
      activeElement: node.ownerDocument.activeElement ===
          node.ownerDocument.body
        ? "body"
        : node.ownerDocument.activeElement?.id ||
          node.ownerDocument.activeElement?.tagName.toLowerCase(),
    }));
    invariant(
      position >= 0 && position <= 160,
      `Cold fragment load left #${fragment} at ${position.toFixed(2)}px`,
    );
    invariant(
      targetState.component === state.component,
      `Cold fragment load targeted a parent instead of #${fragment}`,
    );
    invariant(
      targetState.matchesTarget && targetState.boxShadow !== "none",
      `Cold fragment load did not highlight #${fragment}`,
    );
    invariant(
      targetState.activeElement === "body",
      `Cold fragment load moved focus to ${
        targetState.activeElement ?? "nothing"
      }`,
    );
  });
}

interface TerminalCatalogueEvidence {
  readonly layouts: number;
  readonly profileChecks: number;
  readonly componentSpecimens: number;
  readonly foundationSheets: number;
  readonly foundationSpecimens: number;
  readonly animationChecks: number;
}

async function verifyTerminalFoundationEnrollment(
  page: Page,
): Promise<
  {
    readonly sheets: number;
    readonly specimens: number;
    readonly animationChecks: number;
  }
> {
  const expectedSheets = terminalFoundationSheets.map(({ id }) => id);
  const actualSheets = await page.locator(
    "[data-discern-terminal-foundation]",
  ).evaluateAll((nodes) =>
    nodes.map((node) =>
      node.getAttribute("data-discern-terminal-foundation") ?? ""
    )
  );
  invariant(
    JSON.stringify(actualSheets) === JSON.stringify(expectedSheets),
    `Terminal foundation enrollment differs from its registry.\nExpected: ${
      expectedSheets.join(", ")
    }\nActual: ${actualSheets.join(", ")}`,
  );
  const navigationSheets = await page.locator(
    '.discern-catalogue-nav a[href^="#terminal-foundation-"]',
  ).evaluateAll((nodes) =>
    nodes.map((node) =>
      node.getAttribute("href")?.replace("#terminal-foundation-", "") ?? ""
    )
  );
  invariant(
    JSON.stringify(navigationSheets) === JSON.stringify(expectedSheets),
    `Terminal foundation navigation differs from its registry.\nExpected: ${
      expectedSheets.join(", ")
    }\nActual: ${navigationSheets.join(", ")}`,
  );

  const expectedSpecimens = terminalFoundationSheets.flatMap((sheet) =>
    sheet.specimens(catalogueCliCapabilities, { theme: "light" }).map((
      specimen,
    ) => `${sheet.id}:${specimen.id}`)
  );
  const actualSpecimens = await page.locator(
    "[data-discern-terminal-foundation-specimen]",
  ).evaluateAll((nodes) =>
    nodes.map((node) => {
      const sheet = node.closest<HTMLElement>(
        "[data-discern-terminal-foundation]",
      )?.dataset.discernTerminalFoundation ?? "";
      const specimen = (node as HTMLElement).dataset
        .discernTerminalFoundationSpecimen ?? "";
      return `${sheet}:${specimen}`;
    })
  );
  invariant(
    JSON.stringify(actualSpecimens) === JSON.stringify(expectedSpecimens),
    `Terminal foundation specimens differ from their registry.\nExpected: ${
      expectedSpecimens.join(", ")
    }\nActual: ${actualSpecimens.join(", ")}`,
  );

  await page.locator(".discern-catalogue-search").click();
  const searchDialog = page.getByRole("dialog", {
    name: "Search the Catalogue",
  });
  await searchDialog.locator(".discern-search-palette__input").fill("spinner");
  const motifResult = searchDialog.locator(
    `.discern-search-palette__result[href="${catalogueRoutePaths.foundations}#terminal-foundation-motifs"]`,
  );
  invariant(
    await motifResult.count() === 1,
    "Spinner search must resolve the Terminal motifs foundation",
  );
  invariant(
    (await motifResult.textContent())?.includes("Terminal foundation") === true,
    "Spinner search must identify its foundation context",
  );
  await motifResult.click();
  await searchDialog.waitFor({ state: "hidden" });

  const spinner = page.locator(
    '[data-discern-terminal-foundation="motifs"] ' +
      '[data-discern-terminal-foundation-specimen="spinner-phases"]',
  );
  const animation = spinner.locator("[data-discern-terminal-animation]");
  invariant(
    await animation.getAttribute("data-discern-terminal-animation") ===
      "paused",
    "Reduced motion must pause terminal foundation animation initially",
  );
  const liveOutput = animation.locator(".discern-catalogue-cli-output");
  const pausedFrame = await liveOutput.textContent();
  await page.waitForTimeout(180);
  invariant(
    await liveOutput.textContent() === pausedFrame,
    "Reduced-motion terminal animation advanced while paused",
  );
  await animation.getByRole("button", { name: "Play animation" }).click();
  await eventually(
    async () => await liveOutput.textContent() !== pausedFrame,
    "Terminal motif animation did not advance after Play",
  );
  await animation.getByRole("button", { name: "Pause animation" }).click();
  const accessibility = await scanBrowserAccessibility(
    page,
    "[data-discern-terminal-foundation]",
  );
  invariant(
    accessibility.violations.length === 0,
    `Terminal foundations failed accessibility: ${
      accessibility.violations.map(({ id }) => id).join(", ")
    }`,
  );
  return {
    sheets: actualSheets.length,
    specimens: actualSpecimens.length,
    animationChecks: 3,
  };
}

async function verifyTerminalCatalogue(
  page: Page,
  origin: string,
): Promise<TerminalCatalogueEvidence> {
  return await withViewport(page, TERMINAL_REVIEW_VIEWPORT, async () => {
    const foundationsUrl = new URL(catalogueRoutePaths.foundations, origin);
    foundationsUrl.searchParams.set("theme", "light");
    await loadCataloguePage(page, foundationsUrl.href);

    const foundations = await verifyTerminalFoundationEnrollment(page);

    const terminalUrl = new URL(catalogueRoutePaths.terminal, origin);
    terminalUrl.searchParams.set("theme", "light");
    await loadCataloguePage(page, terminalUrl.href);

    const layouts = page.locator("[data-discern-cli-composition]");
    const layoutCount = await layouts.count();
    invariant(layoutCount > 0, "Terminal Catalogue needs a layout recipe");
    let profileChecks = 0;
    for (let layoutIndex = 0; layoutIndex < layoutCount; layoutIndex += 1) {
      const layout = layouts.nth(layoutIndex);
      const title = await layout.locator("h3").first().textContent() ??
        `layout ${layoutIndex + 1}`;
      const profiles = layout.locator(
        ".discern-catalogue-terminal-layout__profiles button",
      );
      const profileCount = await profiles.count();
      invariant(profileCount > 0, `${title} needs a viewport profile`);
      for (
        let profileIndex = 0;
        profileIndex < profileCount;
        profileIndex += 1
      ) {
        const profile = profiles.nth(profileIndex);
        const label = (await profile.textContent())?.trim() ??
          `profile ${profileIndex + 1}`;
        await profile.click();
        const viewport = layout.locator("[data-discern-terminal-viewport]");
        await viewport.waitFor();
        const width = await viewport.evaluate((node) => ({
          client: node.clientWidth,
          scroll: node.scrollWidth,
        }));
        invariant(
          width.scroll <= width.client,
          `${title} / ${label} has a redundant horizontal scrollbar: ` +
            `${width.client}px client / ${width.scroll}px content`,
        );
        profileChecks += 1;
      }
    }

    const inspectors = page.locator("[data-discern-terminal-theme]");
    const allTerminalLayoutsUse = async (
      theme: CatalogueTheme,
    ): Promise<boolean> => {
      const inspectorThemes = await inspectors.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-discern-terminal-theme"))
      );
      return inspectorThemes.length === layoutCount &&
        inspectorThemes.every((value) => value === theme);
    };
    invariant(
      await allTerminalLayoutsUse("light"),
      "Light mode did not reach every terminal layout",
    );
    await page.getByRole("button", {
      name: "Switch to the dark theme",
    }).click();
    await eventually(
      async () => await allTerminalLayoutsUse("dark"),
      "Dark mode did not reach every terminal layout",
    );

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

    await page.getByRole("button", {
      name: "Switch to the dark theme",
    }).click();
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
      foundationSheets: foundations.sheets,
      foundationSpecimens: foundations.specimens,
      animationChecks: foundations.animationChecks,
    };
  });
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
    await withViewport(page, viewport, async () => {
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
    });
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
      ".discern-catalogue-component__canvas, [data-discern-journey]",
    ).locator(
      ":is(a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex='-1']))",
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
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const page = await context.newPage();
    addPageFailureListeners(page, failures);

    await loadConformancePage(page, conformanceUrl(origin, "light"));
    await assertAutoEnrollment(page, expectedComponents);
    const floatingSurfaces = await verifyFloatingSurfaceCure(page);
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
    try {
      await verifyStateFragmentRestoration(
        page,
        origin,
      );
    } catch (error) {
      failures.push(
        `state fragment restoration: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    let terminalCatalogue: TerminalCatalogueEvidence = {
      layouts: 0,
      profileChecks: 0,
      componentSpecimens: 0,
      foundationSheets: 0,
      foundationSpecimens: 0,
      animationChecks: 0,
    };
    try {
      terminalCatalogue = await verifyTerminalCatalogue(page, origin);
    } catch (error) {
      failures.push(
        `terminal Catalogue: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    const resilience = await runResilienceConformance(
      browser,
      page,
      origin,
      failures,
    );
    const builder = await runBuilderConformance({
      browser,
      page,
      origin,
      failures,
      outputRoot: OUTPUT_ROOT,
    });
    const screenshots = await captureReviewSheets(page, origin);
    await context.close();
    const forcedColorFocusChecks = await verifyForcedColors(
      browser,
      origin,
      expectedComponents.length,
      failures,
    );
    const failureCounts = failures.reduce<Record<string, number>>(
      (counts, failure) => {
        const category = failure.split(":")[0] ?? "Unclassified";
        counts[category] = (counts[category] ?? 0) + 1;
        return counts;
      },
      {},
    );

    invariant(
      !failures.length,
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
      `Conformance passed: ${expectedComponents.length} components, ${accessibilityScans} accessibility scans, ${scenarios} interaction scenarios, 1 cold-state-fragment check, ${forcedColorFocusChecks} forced-colour focus checks, and ${
        screenshots + 1
      } review screenshots; ${floatingSurfaces} floating surfaces share the clipping cure. ` +
        `Terminal Catalogue passed ${terminalCatalogue.profileChecks} profile fits across ${terminalCatalogue.layouts} layouts and re-themed ${terminalCatalogue.componentSpecimens} Component specimens. ` +
        `It auto-enrolled ${terminalCatalogue.foundationSpecimens} specimens across ${terminalCatalogue.foundationSheets} terminal foundations with ${terminalCatalogue.animationChecks} reduced-motion and playback checks. ` +
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
        `(covered aliases: ${coveredFontAliases}; ` +
        `skipped aliases: ${skippedFontAliases}; maximum ` +
        `${
          resilience.maxFontWidthDeltaPercent.toFixed(2)
        }% width residual and ${
          resilience.maxFontLineBoxDeltaPixels.toFixed(2)
        }px normal-line residual), and ` +
        `${resilience.semanticFocusTargets} semantic-surface focus targets ` +
        `across ${resilience.semanticFocusRoles.join(", ")}. ` +
        `Builder passed ${builder.adaptiveCases} theme/viewport cases, ` +
        `${builder.paneTransitions} adaptive pane transitions, ` +
        `${builder.axeScans} axe scans, ` +
        `${builder.keyboardStops} finite keyboard stops, ` +
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
