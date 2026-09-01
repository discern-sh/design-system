import { fromFileUrl } from "@std/path";
import { type Browser, type Locator, type Page } from "playwright-core";
import { packageManifest } from "../../../src/manifest.ts";
import type { ComponentBehavior } from "../../../src/types/component-meta.ts";
import type {
  ConformanceScenario,
  ConformanceStep,
  ConformanceTarget,
} from "../../../catalogue/conformance.ts";
import {
  catalogueComponentPath,
  catalogueRoutePaths,
} from "../../../catalogue/routes.ts";
import {
  addPageFailureListeners,
  scanBrowserAccessibility,
} from "../../browser-conformance-support.ts";
import { withViewport } from "../../viewport.ts";
import {
  CATALOGUE_400_PERCENT_REFLOW_VIEWPORT,
  verifyDecisionCopyEnrollment,
  verifyDecisionCopyLegibility,
} from "./metadata-copy.ts";
import { verifyInlineOverflowCueEdges } from "./overflow-cue.ts";

const OUTPUT_ROOT = new URL("../../../dist/conformance/", import.meta.url);
const WIDE_VIEWPORT = { width: 1440, height: 1000 } as const;
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
    else if (step.action === "fill") await target.fill(step.value);
    else if (step.action === "hover") await target.hover();
    else if (step.action === "pointer-down") {
      await target.hover();
      await page.mouse.down();
    } else await page.mouse.up();
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
  if (step.expect === "x-position-count") {
    const positions = await target.evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().left)
    );
    invariant(
      positions.length >= step.minimum,
      `Expected at least ${step.minimum} horizontal-position targets but found ${positions.length}: ${
        JSON.stringify(step.target)
      }`,
    );
    const tolerance = step.tolerance ?? 1;
    const distinct: number[] = [];
    for (const position of positions.toSorted((left, right) => left - right)) {
      if (!distinct.some((known) => Math.abs(known - position) <= tolerance)) {
        distinct.push(position);
      }
    }
    invariant(
      distinct.length >= step.minimum &&
        (step.maximum === undefined || distinct.length <= step.maximum),
      `Expected ${step.minimum}${
        step.maximum === undefined ? "+" : `–${step.maximum}`
      } horizontal positions within ${tolerance}px but found ${distinct.length} at ${
        distinct.map((position) => position.toFixed(2)).join(", ")
      }: ${JSON.stringify(step.target)}`,
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
        "example" in scenario && typeof scenario.example === "string" &&
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
  invariant(
    await page.locator(".discern-catalogue-example-state").getByRole(
      "heading",
      { level: 1 },
    ).count() === 0,
    "A specimen-owned document heading escaped its Catalogue heading boundary",
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
              `[data-discern-component="${component}"] [data-discern-example-state="${scenario.example}"] .discern-catalogue-example-state__canvas`,
            );
            invariant(
              await root.count() === 1,
              `${component} conformance scenario ${
                JSON.stringify(scenario.name)
              } could not resolve canonical Web example ${
                JSON.stringify(scenario.example)
              }`,
            );
            await root.scrollIntoViewIfNeeded();
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

async function verifyComponentJourneys(
  page: Page,
  origin: string,
  expectedComponents: readonly string[],
): Promise<void> {
  await withViewport(page, WIDE_VIEWPORT, async () => {
    const discoveryUrl = new URL(catalogueRoutePaths.components, origin);
    discoveryUrl.searchParams.set("theme", "dark");
    await loadCataloguePage(page, discoveryUrl.href);
    invariant(
      await page.getByRole("main").getByRole("heading", { level: 1 })
        .count() ===
        1,
      "Components discovery needs one h1",
    );
    invariant(
      await page.locator("main [data-discern-component]").count() === 0,
      "Components discovery mounted live specimens",
    );
    const collectionImages = page.locator("[data-discern-collection-image]");
    invariant(
      await collectionImages.count() > 0,
      "Component collections need generated member imagery",
    );
    const imageEvidence = await collectionImages.evaluateAll((images) =>
      images.map((image) => {
        const element = image as HTMLImageElement;
        return {
          source: element.getAttribute("src"),
          width: element.getAttribute("width"),
          height: element.getAttribute("height"),
          visible: getComputedStyle(element).display !== "none",
          theme: element.dataset.discernImageTheme,
        };
      })
    );
    invariant(
      imageEvidence.every(({ source, width, height }) =>
        source?.includes("/catalogue/generated/example-images/") &&
        Number(width) > 0 && Number(height) > 0
      ),
      "Collection imagery lost generated paths or intrinsic dimensions",
    );
    invariant(
      imageEvidence.some(({ visible, theme }) => visible && theme === "dark") &&
        !imageEvidence.some(({ visible, theme }) =>
          visible && theme === "light"
        ),
      "Dark discovery did not select the truthful generated image theme",
    );

    await page.getByRole("button", { name: /All Components \(/ }).click();
    invariant(
      new URL(page.url()).searchParams.get("all") === "1" &&
        new URL(page.url()).searchParams.get("theme") === "dark",
      "All Components did not enter URL state without losing Appearance",
    );
    invariant(
      await page.locator(".discern-catalogue-component-card").count() ===
        expectedComponents.length,
      "All Components did not enrol the complete live registry",
    );
    const groupSelect = page.getByRole("combobox", {
      name: "Group",
      exact: true,
    });
    const firstGroup = await groupSelect.locator("option").nth(1).getAttribute(
      "value",
    );
    invariant(firstGroup, "Components needs a first canonical Group option");
    await groupSelect.selectOption(firstGroup);
    invariant(
      new URL(page.url()).searchParams.get("group") === firstGroup,
      "Group selection did not enter URL state",
    );
    await page.goBack();
    await eventually(
      async () =>
        new URL(page.url()).searchParams.get("all") === "1" &&
        await groupSelect.inputValue() === "",
      "Back did not restore All Components controls and results",
    );
    await page.goForward();
    await eventually(
      async () => await groupSelect.inputValue() === firstGroup,
      "Forward did not restore the selected Component Group",
    );

    await page.getByRole("button", { name: "Reset directory" }).click();
    const query = page.getByRole("searchbox", { name: "Search Components" });
    await query.fill("call to action");
    const ctaResult = page.locator(".discern-catalogue-component-card").filter({
      has: page.getByRole("heading", {
        level: 3,
        name: "CTA band",
        exact: true,
      }),
    });
    invariant(
      await ctaResult.count() === 1 &&
        (await ctaResult.locator(".discern-catalogue-component-card__match")
            .textContent())?.includes("Matched alias: call to action") === true,
      "Component explorer disagreed with the global call-to-action alias reason",
    );
    await query.fill("future-no-such-component");
    invariant(
      new URL(page.url()).searchParams.get("q") ===
        "future-no-such-component",
      "Component query did not round-trip through the URL",
    );
    invariant(
      await page.getByRole("button", { name: "Return to collections" })
        .count() ===
        1,
      "Empty Component results need one recovery action",
    );
    await page.getByRole("button", { name: "Return to collections" }).click();

    const detailSlug = expectedComponents.includes("command")
      ? "command"
      : expectedComponents[0];
    invariant(detailSlug, "Component detail journey needs one Component");
    const detailUrl = new URL(catalogueComponentPath(detailSlug), origin);
    detailUrl.searchParams.set("theme", "light");
    detailUrl.searchParams.set("accent", "violet");
    await loadCataloguePage(page, detailUrl.href);
    invariant(
      await page.getByRole("main").getByRole("heading", { level: 1 })
            .count() ===
          1 &&
        await page.locator(
            "[data-discern-example-state], [data-discern-cli-example-state], [data-discern-example-unavailable]",
          ).count() === 1,
      "Component detail must default to one named specimen",
    );
    const evidence = page.locator(
      ".discern-catalogue-component__evidence > details",
    );
    invariant(
      await evidence.count() === 3 &&
        await page.locator(
            ".discern-catalogue-component__evidence > details[open]",
          ).count() === 0,
      "Detail evidence must stay three ordered, closed disclosures",
    );
    invariant(
      JSON.stringify(await evidence.locator("summary").allTextContents()) ===
        JSON.stringify([
          "Usage guidance",
          "Selection and import",
          "Props and variants",
        ]),
      "Detail disclosure order changed",
    );
    for (
      const [label, suffix] of [
        ["Open React source", ".tsx"],
        ["Open metadata", ".meta.ts"],
      ] as const
    ) {
      const source = page.getByRole("link", { name: label });
      invariant(
        (await source.getAttribute("href"))?.endsWith(suffix),
        `${label} does not describe its destination`,
      );
    }
    const exampleSelect = page.getByLabel("Example");
    const selectedId = await exampleSelect.inputValue();
    await page.getByRole("button", { name: "CLI", exact: true }).click();
    invariant(
      await exampleSelect.inputValue() === selectedId &&
        new URL(page.url()).searchParams.get("example") === selectedId &&
        new URL(page.url()).searchParams.get("theme") === "light" &&
        new URL(page.url()).searchParams.get("accent") === "violet",
      "Web/CLI switching changed canonical example or Appearance identity",
    );
    await page.getByRole("button", { name: "Web", exact: true }).click();
    const viewAll = page.getByRole("button", { name: /View all / });
    await viewAll.click();
    invariant(
      new URL(page.url()).searchParams.get("view") === "all" &&
        await page.locator("[data-discern-example-state]").count() ===
          await exampleSelect.locator("option:not([disabled])").count(),
      "View all examples is not a deliberate ordered gallery",
    );
    invariant(
      await page.locator('nav[aria-label="Component continuation"] a').count() >
        0,
      "Detail lacks canonical previous/next or Compare continuation",
    );

    const allUrl = new URL(catalogueRoutePaths.components, origin);
    allUrl.searchParams.set("all", "1");
    await loadCataloguePage(page, allUrl.href);
    const webOnlyCard = page.locator(".discern-catalogue-component-card")
      .filter({
        hasText: "Web only",
      }).first();
    invariant(
      await webOnlyCard.count() === 1,
      "Registry needs a CLI-exempt Component guard",
    );
    const webOnlyHref = await webOnlyCard.locator(
      ".discern-catalogue-component-card__inspect",
    ).getAttribute("href");
    invariant(webOnlyHref, "CLI-exempt result lacks its detail link");
    const exemptUrl = new URL(webOnlyHref, origin);
    exemptUrl.searchParams.set("surface", "cli");
    await loadCataloguePage(page, exemptUrl.href);
    invariant(
      await page.locator("[data-discern-example-unavailable]").count() === 1 &&
        (await page.getByLabel("Example").locator("option:checked")
          .textContent())
          ?.includes("unavailable on CLI"),
      "CLI exemption or surface-only reason silently changed examples",
    );

    const compareUrl = new URL(catalogueRoutePaths.compare, origin);
    compareUrl.searchParams.set("theme", "dark");
    compareUrl.searchParams.set("accent", "violet");
    await loadCataloguePage(page, compareUrl.href);
    invariant(
      await page.locator(".discern-catalogue-collection-card").count() === 0 &&
        await page.locator("[data-discern-compare-item]").count() === 0,
      "Bare Compare repeated the Components directory or mounted specimens",
    );
    const scopeSelect = page.getByLabel("Comparison scope");
    const firstScope = await scopeSelect.locator("option").nth(1).getAttribute(
      "value",
    );
    invariant(firstScope, "Compare needs a focused scope choice");
    await scopeSelect.selectOption(firstScope);
    await eventually(
      async () => await page.locator("[data-discern-compare-item]").count() > 0,
      "Compare scope did not mount its bounded population",
    );
    const compareItems = page.locator("[data-discern-compare-item]");
    invariant(
      await compareItems.locator(
            ".discern-catalogue-component__evidence",
          ).count() === 0 &&
        await page.getByRole("main").getByRole("heading", { level: 1 })
            .count() ===
          1 &&
        await page.getByRole("main").getByRole("heading", { level: 2 })
            .count() > 0 &&
        await page.getByRole("main").getByRole("heading", { level: 3 })
            .count() ===
          await compareItems.count(),
      "Compare density or heading hierarchy regressed",
    );
    for (let index = 0; index < await compareItems.count(); index += 1) {
      invariant(
        await compareItems.nth(index).locator(
          "[data-discern-example-state], [data-discern-cli-example-state], [data-discern-example-unavailable]",
        ).count() === 1,
        "Compare item did not lead with exactly one named specimen",
      );
    }
    invariant(
      await page.locator(".discern-catalogue-review__jump-list a").count() ===
        await compareItems.count(),
      "Compare jump list does not cover its exact population",
    );
    await page.getByRole("button", { name: "Set all to CLI" }).click();
    invariant(
      new URL(page.url()).searchParams.get("surface") === "cli" &&
        new URL(page.url()).searchParams.get("theme") === "dark" &&
        new URL(page.url()).searchParams.get("accent") === "violet",
      "Set all to CLI did not enter URL state without losing Appearance",
    );
    await compareItems.first().getByRole("button", {
      name: "Web",
      exact: true,
    }).click();
    invariant(
      new URL(page.url()).searchParams.has("surfaces"),
      "Individual Compare surface override did not enter URL state",
    );
    await page.getByRole("button", {
      name: "Reset individual overrides",
    }).click();
    invariant(
      !new URL(page.url()).searchParams.has("surfaces"),
      "Reset individual overrides left stale URL evidence",
    );

    const customSlugs = expectedComponents.slice(0, 2);
    invariant(customSlugs.length === 2, "Custom Compare needs two Components");
    const customUrl = new URL(catalogueRoutePaths.compare, origin);
    customUrl.searchParams.set("components", customSlugs.join(","));
    await loadCataloguePage(page, customUrl.href);
    invariant(
      await page.locator("[data-discern-compare-item]").count() === 2,
      "Custom Compare did not restore its shareable population",
    );
    await page.locator("[data-discern-compare-item]").first().getByRole(
      "button",
      { name: "Remove" },
    ).click();
    invariant(
      await page.locator("[data-discern-compare-item]").count() === 1 &&
        new URL(page.url()).searchParams.get("components") === customSlugs[1],
      "Custom removal lost order-stable URL state",
    );

    const completeUrl = new URL(catalogueRoutePaths.compare, origin);
    completeUrl.searchParams.set("scope", "all");
    await loadCataloguePage(page, completeUrl.href);
    invariant(
      await page.locator("[data-discern-compare-item]").count() ===
          expectedComponents.length &&
        await page.locator(
            "[data-discern-compare-item] .discern-catalogue-component__evidence",
          ).count() === 0 &&
        await page.getByText(
            `Complete system · ${expectedComponents.length} Component previews`,
          ).count() === 1,
      "Complete-system Compare lost its secondary weight/count posture",
    );
  });

  await withViewport(page, NARROW_VIEWPORT, async () => {
    const dense = expectedComponents.filter((slug) =>
      slug === "table" || slug === "command"
    );
    const slugs = dense.length === 2 ? dense : expectedComponents.slice(0, 2);
    const url = new URL(catalogueRoutePaths.compare, origin);
    url.searchParams.set("components", slugs.join(","));
    if (slugs.includes("table") && slugs.includes("command")) {
      url.searchParams.set(
        "examples",
        "table:dense-overflow,command:overflow",
      );
    }
    await loadCataloguePage(page, url.href);
    const containment = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    invariant(
      containment.scrollWidth <= containment.clientWidth + 1,
      `Narrow Compare overflowed the document (${containment.scrollWidth}/${containment.clientWidth})`,
    );
    const scope = page.getByLabel("Comparison scope");
    await scope.focus();
    await page.keyboard.press("Tab");
    const focus = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      const style = active ? getComputedStyle(active) : undefined;
      return {
        tag: active?.tagName.toLowerCase(),
        outline: Number.parseFloat(style?.outlineWidth ?? "0"),
      };
    });
    invariant(
      focus.tag !== "body" && focus.outline >= 2,
      "Keyboard Compare control lost visible focus at narrow width",
    );

    const tableUrl = new URL(catalogueComponentPath("table"), origin);
    tableUrl.searchParams.set("example", "dense-overflow");
    await loadCataloguePage(page, tableUrl.href);
    await verifyInlineOverflowCueEdges(
      page.locator("[data-discern-catalogue-specimen-overflow]"),
      "Web Component specimen",
    );

    const commandUrl = new URL(catalogueComponentPath("command"), origin);
    await loadCataloguePage(page, commandUrl.href);
    await page.getByText("Props and variants", { exact: true }).click();
    await verifyInlineOverflowCueEdges(
      page.locator(".discern-catalogue-api__cue"),
      "Component props table",
    );

    commandUrl.searchParams.set("surface", "cli");
    commandUrl.searchParams.set("example", "overflow");
    await loadCataloguePage(page, commandUrl.href);
    await verifyInlineOverflowCueEdges(
      page.locator(".discern-catalogue-cli-preview").first(),
      "CLI Component preview",
    );

    const allCompare = new URL(catalogueRoutePaths.compare, origin);
    allCompare.searchParams.set("scope", "all");
    await loadCataloguePage(page, allCompare.href);
    await verifyInlineOverflowCueEdges(
      page.locator(".discern-catalogue-review__jump-cue"),
      "Compare jump list",
    );
    const completeContainment = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    invariant(
      completeContainment.scrollWidth <= completeContainment.clientWidth + 1,
      "Complete Compare cue escaped the narrow document",
    );
  });
}

async function verifyComponentMetadataLegibility(
  page: Page,
  origin: string,
  expectedComponents: readonly string[],
): Promise<{ readonly roles: number; readonly scans: number }> {
  let roles = 0;
  let scans = 0;
  const verifyPage = async (
    label: string,
    { scan = false }: { readonly scan?: boolean } = {},
  ): Promise<void> => {
    roles += await verifyDecisionCopyLegibility(page, label);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
    );
    invariant(
      overflow <= 0,
      `${label} moves the document ${overflow}px horizontally`,
    );
    if (!scan) return;
    const accessibility = await scanBrowserAccessibility(
      page,
      ".discern-catalogue-shell",
    );
    invariant(
      accessibility.violations.length === 0,
      `${label} failed accessibility: ${
        accessibility.violations.map(({ id }) => id).join(", ")
      }`,
    );
    scans += 1;
  };

  await withViewport(page, WIDE_VIEWPORT, async () => {
    const collections = new URL(catalogueRoutePaths.components, origin);
    collections.searchParams.set("theme", "dark");
    await loadCataloguePage(page, collections.href);
    await verifyDecisionCopyEnrollment(
      page,
      ".discern-catalogue-collection-card__description",
      "Purpose collection descriptions",
    );
    await verifyPage("Component collection metadata/dark");

    const results = new URL(catalogueRoutePaths.components, origin);
    results.searchParams.set("q", "call to action");
    results.searchParams.set("theme", "light");
    await loadCataloguePage(page, results.href);
    await verifyDecisionCopyEnrollment(
      page,
      ".discern-catalogue-component-card__description",
      "Component result descriptions",
    );
    await verifyDecisionCopyEnrollment(
      page,
      ".discern-catalogue-component-card__match",
      "Component result match reasons",
    );
    await verifyPage("Component result and match metadata/light", {
      scan: true,
    });

    const detailSlug = expectedComponents.includes("command")
      ? "command"
      : expectedComponents[0];
    invariant(detailSlug, "Metadata review needs one Component detail");
    const detail = new URL(catalogueComponentPath(detailSlug), origin);
    detail.searchParams.set("theme", "dark");
    await loadCataloguePage(page, detail.href);
    await verifyDecisionCopyEnrollment(
      page,
      ".discern-catalogue-component--detail > header .discern-catalogue-component__identity > p",
      "Component detail descriptions",
    );
    for (const disclosure of ["Usage guidance", "Props and variants"]) {
      await page.getByText(disclosure, { exact: true }).click();
    }
    await verifyDecisionCopyEnrollment(
      page,
      ".discern-catalogue-guidance li, .discern-catalogue-guidance > div p",
      "Component usage guidance",
    );
    await verifyDecisionCopyEnrollment(
      page,
      ".discern-catalogue-api p, .discern-catalogue-api th small",
      "Component API explanations",
    );
    await verifyPage("Component detail guidance metadata/dark", {
      scan: true,
    });

    const all = new URL(catalogueRoutePaths.components, origin);
    all.searchParams.set("all", "1");
    await loadCataloguePage(page, all.href);
    const webOnly = page.locator(".discern-catalogue-component-card").filter({
      hasText: "Web only",
    }).first();
    const href = await webOnly.locator(
      ".discern-catalogue-component-card__inspect",
    ).getAttribute("href");
    invariant(href, "Metadata review needs one CLI-exempt Component");
    const exemption = new URL(href, origin);
    exemption.searchParams.set("surface", "cli");
    exemption.searchParams.set("theme", "light");
    await loadCataloguePage(page, exemption.href);
    await verifyDecisionCopyEnrollment(
      page,
      ".discern-catalogue-component__unavailable p",
      "Selected-surface unavailability explanations",
    );
    await verifyPage("CLI exemption metadata/light");

    const compare = new URL(catalogueRoutePaths.compare, origin);
    compare.searchParams.set("group", "workflow");
    compare.searchParams.set("theme", "dark");
    await loadCataloguePage(page, compare.href);
    await verifyDecisionCopyEnrollment(
      page,
      ".discern-catalogue-compare-item > header p",
      "Compare Component descriptions",
    );
    await verifyPage("Compare Component metadata/dark");
  });

  await withViewport(
    page,
    CATALOGUE_400_PERCENT_REFLOW_VIEWPORT,
    async () => {
      const results = new URL(catalogueRoutePaths.components, origin);
      results.searchParams.set("q", "call to action");
      results.searchParams.set("theme", "dark");
      await loadCataloguePage(page, results.href);
      await verifyPage("Component metadata at representative 400% reflow/dark");

      const detail = new URL(catalogueComponentPath("command"), origin);
      detail.searchParams.set("theme", "light");
      await loadCataloguePage(page, detail.href);
      for (const disclosure of ["Usage guidance", "Props and variants"]) {
        await page.getByText(disclosure, { exact: true }).click();
      }
      await verifyPage("Detail metadata at representative 400% reflow/light");

      const compare = new URL(catalogueRoutePaths.compare, origin);
      compare.searchParams.set("group", "workflow");
      compare.searchParams.set("theme", "dark");
      await loadCataloguePage(page, compare.href);
      await verifyPage("Compare metadata at representative 400% reflow/dark");
    },
  );

  return { roles, scans };
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
    let placement = {
      top: Number.POSITIVE_INFINITY,
      viewportHeight: 0,
      scrollTop: 0,
      maxScrollTop: 0,
    };
    await eventually(
      async () => {
        placement = await target.evaluate((node) => {
          const document = node.ownerDocument;
          const scrollingElement = document.scrollingElement ??
            document.documentElement;
          return {
            top: node.getBoundingClientRect().top,
            viewportHeight: document.documentElement.clientHeight,
            scrollTop: scrollingElement.scrollTop,
            maxScrollTop: scrollingElement.scrollHeight -
              scrollingElement.clientHeight,
          };
        });
        return placement.top >= 0 &&
          (placement.top <= 160 ||
            (placement.top < placement.viewportHeight &&
              placement.scrollTop >= placement.maxScrollTop - 1));
      },
      `Cold fragment load left #${fragment} outside the viewport`,
    );
    const targetState = await target.evaluate((node) => ({
      matchesTarget: node.matches(":target"),
      highlight: getComputedStyle(
        node.querySelector(":scope > header") ?? node,
      ).boxShadow,
      component: node.closest<HTMLElement>("[data-discern-component]")?.dataset
        .discernComponent,
      activeElement: node.ownerDocument.activeElement ===
          node.ownerDocument.body
        ? "body"
        : node.ownerDocument.activeElement?.id ||
          node.ownerDocument.activeElement?.tagName.toLowerCase(),
    }));
    invariant(
      placement.top >= 0 &&
        (placement.top <= 160 ||
          (placement.top < placement.viewportHeight &&
            placement.scrollTop >= placement.maxScrollTop - 1)),
      `Cold fragment load left #${fragment} at ${
        placement.top.toFixed(2)
      }px with scroll ${placement.scrollTop.toFixed(2)}/${
        placement.maxScrollTop.toFixed(2)
      }`,
    );
    invariant(
      targetState.component === state.component,
      `Cold fragment load targeted a parent instead of #${fragment}`,
    );
    invariant(
      targetState.matchesTarget && targetState.highlight !== "none",
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

export interface ComponentContractEvidence {
  readonly floatingSurfaces: number;
  readonly accessibilityScans: number;
  readonly scenarios: number;
  readonly screenshots: number;
  readonly forcedColorFocusChecks: number;
  readonly metadataRoleChecks: number;
}

export async function runComponentContractConformance(
  browser: Browser,
  page: Page,
  origin: string,
  expectedComponents: readonly string[],
  failures: string[],
): Promise<ComponentContractEvidence> {
  await loadConformancePage(page, conformanceUrl(origin, "light"));
  await assertAutoEnrollment(page, expectedComponents);
  await verifyDecisionCopyEnrollment(
    page,
    ".discern-catalogue-component > header .discern-catalogue-component__identity > p",
    "Complete conformance Component descriptions",
  );
  const autoOpenedModals = page.locator("dialog:modal");
  invariant(
    await autoOpenedModals.count() === 0,
    "Catalogue examples must start quiescent; an auto-open modal makes every unrelated example inert",
  );
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
    await verifyComponentJourneys(page, origin, expectedComponents);
  } catch (error) {
    failures.push(
      `Component/Compare journeys: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const metadata = await verifyComponentMetadataLegibility(
    page,
    origin,
    expectedComponents,
  );
  accessibilityScans += metadata.scans;
  try {
    await verifyStateFragmentRestoration(page, origin);
  } catch (error) {
    failures.push(
      `state fragment restoration: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const screenshots = await captureReviewSheets(page, origin);
  const forcedColorFocusChecks = await verifyForcedColors(
    browser,
    origin,
    expectedComponents.length,
    failures,
  );
  return {
    floatingSurfaces,
    accessibilityScans,
    scenarios,
    screenshots,
    forcedColorFocusChecks,
    metadataRoleChecks: metadata.roles,
  };
}
