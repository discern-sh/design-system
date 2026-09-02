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
    const colorBytes = (color: string): readonly number[] => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext("2d");
      if (context === null) throw new Error("Canvas colour parser unavailable");
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data];
    };
    const inspectOpaqueRole = (surface: HTMLElement): string | undefined => {
      const role = surface.dataset.discernFloatingSurface;
      const allowed = ["surface", "canvas", "inverse-surface"];
      if (role === undefined || !allowed.includes(role)) {
        return `${
          surface.outerHTML.slice(0, 180)
        } does not name an opaque surface role`;
      }
      const root = surface.closest<HTMLElement>("[data-discern-root]");
      if (root === null) {
        return `${surface.outerHTML.slice(0, 180)} has no discern root`;
      }
      const probe = document.createElement("span");
      probe.style.backgroundColor = `var(--discern-color-${role})`;
      root.append(probe);
      const expected = colorBytes(getComputedStyle(probe).backgroundColor);
      probe.remove();
      const actual = colorBytes(getComputedStyle(surface).backgroundColor);
      if (actual[3] !== 255) {
        return `${surface.outerHTML.slice(0, 180)} resolves to alpha ${
          actual[3]
        }`;
      }
      if (!actual.every((channel, index) => channel === expected[index])) {
        return `${
          surface.outerHTML.slice(0, 180)
        } does not paint the declared --discern-color-${role} role`;
      }
      return undefined;
    };
    const references = [...document.querySelectorAll<HTMLElement>(
      "[aria-details], [aria-describedby]",
    )];
    const behaviorPanels = [...document.querySelectorAll<HTMLElement>(
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
        hasSurface: panel.hasAttribute("data-discern-floating-surface"),
      }];
    });
    const registered = [...document.querySelectorAll<HTMLElement>(
      "[data-discern-floating-surface]",
    )];
    const roleFailures = registered.flatMap((surface) => {
      const failure = inspectOpaqueRole(surface);
      return failure === undefined ? [] : [failure];
    });
    const future = document.createElement("span");
    future.dataset.discernFloatingSurface = "surface";
    future.style.backgroundColor = "rgb(0 0 0 / 50%)";
    document.querySelector<HTMLElement>("[data-discern-root]")?.append(future);
    const futureProof = inspectOpaqueRole(future) !== undefined;
    future.remove();
    return {
      behaviorPanels,
      registered: registered.length,
      roleFailures,
      futureProof,
    };
  });
  invariant(
    current.behaviorPanels.length > 0,
    "No floating supplementary surfaces found",
  );
  invariant(current.registered > 0, "No opaque floating surfaces registered");
  invariant(
    current.futureProof,
    "A synthetic translucent floating surface escaped the opaque-role detector",
  );
  const contractFailures: string[] = [];
  for (const surface of current.behaviorPanels) {
    if (
      !(surface.hasRoot && surface.hasTrigger && surface.hasPanel &&
        surface.hasSurface)
    ) {
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
    contractFailures.length + current.roleFailures.length === 0,
    [...contractFailures, ...current.roleFailures].join("\n"),
  );
  return current.registered;
}

interface FieldAxisReachEvidence {
  readonly points: number;
  readonly targetChecks: number;
  readonly textFloorChecks: number;
  readonly focusRingChecks: number;
}

async function verifyFieldAxisReach(
  page: Page,
): Promise<FieldAxisReachEvidence> {
  await page.keyboard.press("Tab");
  return await page.evaluate(async () => {
    const points = [0, 0.25, 0.5, 0.75, 1] as const;
    const minimumTargetSize = 24;
    const minimumFocusContrast = 3;
    const targetSelector = [
      "a[href]",
      "button",
      "input:not([type='hidden'])",
      "select",
      "textarea",
      "summary",
      "[role='button']",
      "[role='link']",
      "[role='checkbox']",
      "[role='radio']",
      "[role='switch']",
    ].join(",");
    const focusSelector = `${targetSelector},[tabindex]:not([tabindex='-1'])`;
    const root = document.querySelector<HTMLElement>("[data-discern-root]");
    if (root === null) throw new Error("The Catalogue has no discern root");
    const initial = new Map([
      ["--discern-darkness", root.style.getPropertyValue("--discern-darkness")],
      ["--discern-density", root.style.getPropertyValue("--discern-density")],
      [
        "--discern-structure",
        root.style.getPropertyValue("--discern-structure"),
      ],
      [
        "--discern-duration-fast",
        root.style.getPropertyValue("--discern-duration-fast"),
      ],
      [
        "--discern-duration-medium",
        root.style.getPropertyValue("--discern-duration-medium"),
      ],
      ["color-scheme", root.style.getPropertyValue("color-scheme")],
    ]);
    const failures: string[] = [];
    let targetChecks = 0;
    let textFloorChecks = 0;
    let focusRingChecks = 0;

    type Color = readonly [number, number, number, number];
    const color = (value: string): Color => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext("2d");
      if (context === null) throw new Error("Canvas colour parser unavailable");
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const bytes = context.getImageData(0, 0, 1, 1).data;
      return [bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0, bytes[3] ?? 0];
    };
    const over = (foreground: Color, background: Color): Color => {
      const foregroundAlpha = foreground[3] / 255;
      const backgroundAlpha = background[3] / 255;
      const alpha = foregroundAlpha + backgroundAlpha * (1 - foregroundAlpha);
      if (alpha === 0) return [0, 0, 0, 0];
      return [
        Math.round(
          (foreground[0] * foregroundAlpha +
            background[0] * backgroundAlpha * (1 - foregroundAlpha)) /
            alpha,
        ),
        Math.round(
          (foreground[1] * foregroundAlpha +
            background[1] * backgroundAlpha * (1 - foregroundAlpha)) /
            alpha,
        ),
        Math.round(
          (foreground[2] * foregroundAlpha +
            background[2] * backgroundAlpha * (1 - foregroundAlpha)) /
            alpha,
        ),
        Math.round(alpha * 255),
      ];
    };
    const luminance = (value: Color): number => {
      const channel = (byte: number) => {
        const unit = byte / 255;
        return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(value[0]) + 0.7152 * channel(value[1]) +
        0.0722 * channel(value[2]);
    };
    const contrast = (first: Color, second: Color): number => {
      const light = Math.max(luminance(first), luminance(second));
      const dark = Math.min(luminance(first), luminance(second));
      return (light + 0.05) / (dark + 0.05);
    };
    const backgroundBehind = (element: HTMLElement): Color => {
      const layers: Color[] = [];
      for (
        let ancestor = element.parentElement;
        ancestor !== null;
        ancestor = ancestor.parentElement
      ) {
        layers.push(color(getComputedStyle(ancestor).backgroundColor));
      }
      return layers.toReversed().reduce<Color>(
        (composite, layer) => over(layer, composite),
        [255, 255, 255, 255],
      );
    };
    const description = (element: HTMLElement): string => {
      const component = element.closest<HTMLElement>(
        "[data-discern-component]",
      )?.dataset.discernComponent ?? "unknown";
      const name = element.getAttribute("aria-label") ??
        element.textContent?.trim().slice(0, 48) ?? element.tagName;
      return `${component} ${element.tagName.toLowerCase()} “${name}”`;
    };
    const visible = (element: HTMLElement): boolean => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" &&
        style.visibility !== "hidden" && style.clipPath !== "inset(50%)" &&
        (style.clip === "auto" || style.clip === "") &&
        !element.closest("[inert]");
    };
    const inlineTextLink = (element: HTMLElement): boolean =>
      element.matches("a[href]") &&
      element.closest("p, li, dd, dt, figcaption") !== null;
    const labelledNativeChoice = (element: HTMLElement): boolean =>
      element instanceof HTMLInputElement &&
      (element.type === "checkbox" || element.type === "radio") &&
      element.labels?.[0] !== undefined &&
      element.labels[0].getBoundingClientRect().width >= minimumTargetSize &&
      element.labels[0].getBoundingClientRect().height >= minimumTargetSize;
    const inspectFocusRing = (element: HTMLElement): string | undefined => {
      element.focus();
      const sibling = element.nextElementSibling;
      const ringElement = sibling instanceof HTMLElement &&
          getComputedStyle(sibling).getPropertyValue("--discern-focus-proxy")
              .trim() === "1"
        ? sibling
        : element;
      const style = getComputedStyle(ringElement);
      const width = Number.parseFloat(style.outlineWidth);
      if (
        style.outlineStyle === "none" || !Number.isFinite(width) || width <= 0
      ) {
        return undefined;
      }
      const backdrop = backgroundBehind(ringElement);
      const own = color(style.backgroundColor);
      const adjacent = Number.parseFloat(style.outlineOffset) < 0
        ? over(own, backdrop)
        : backdrop;
      const ring = over(color(style.outlineColor), adjacent);
      const ratio = contrast(ring, adjacent);
      focusRingChecks += 1;
      return ratio + 0.001 < minimumFocusContrast
        ? `${description(element)} focus ring is ${ratio.toFixed(2)}:1`
        : undefined;
    };
    const canvases = [...document.querySelectorAll<HTMLElement>(
      ".discern-catalogue-example-state__canvas",
    )];
    const withinCanvases = (selector: string): HTMLElement[] =>
      canvases.flatMap((canvas) => [
        ...(canvas.matches(selector) ? [canvas] : []),
        ...canvas.querySelectorAll<HTMLElement>(selector),
      ]);
    const motionOverride = document.createElement("style");
    motionOverride.textContent = "[data-discern-field-axis-conformance], " +
      "[data-discern-field-axis-conformance] * {" +
      "transition: none !important; animation: none !important; }";
    document.head.append(motionOverride);
    root.setAttribute("data-discern-field-axis-conformance", "");

    try {
      root.style.setProperty("--discern-duration-fast", "0ms");
      root.style.setProperty("--discern-duration-medium", "0ms");
      for (const darkness of points) {
        root.style.setProperty("--discern-darkness", String(darkness));
        root.style.setProperty("--discern-density", "0.8");
        root.style.setProperty("--discern-structure", "0.35");
        root.style.setProperty(
          "color-scheme",
          darkness >= 0.5 ? "dark" : "light",
        );
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve())
        );
        const probe = document.createElement("span");
        probe.style.fontSize = "var(--discern-font-size-xs)";
        root.append(probe);
        const textFloor = Number.parseFloat(getComputedStyle(probe).fontSize);
        probe.remove();
        const targets = withinCanvases(targetSelector).filter((element) =>
          visible(element) && !element.matches(":disabled")
        );
        for (const target of targets) {
          const rect = target.getBoundingClientRect();
          if (
            !inlineTextLink(target) && !labelledNativeChoice(target) &&
            (rect.width < minimumTargetSize || rect.height < minimumTargetSize)
          ) {
            failures.push(
              `darkness ${darkness}: ${description(target)} target is ${
                rect.width.toFixed(1)
              }×${rect.height.toFixed(1)}px`,
            );
          }
          const fontSize = Number.parseFloat(getComputedStyle(target).fontSize);
          if (fontSize + 0.01 < textFloor) {
            failures.push(
              `darkness ${darkness}: ${description(target)} text is ${
                fontSize.toFixed(2)
              }px below the ${textFloor.toFixed(2)}px xs floor`,
            );
          }
          targetChecks += 1;
          textFloorChecks += 1;
        }
        const focusTargets = withinCanvases(focusSelector).filter((element) =>
          visible(element) && !element.matches(":disabled")
        );
        for (const target of focusTargets) {
          const failure = inspectFocusRing(target);
          if (failure !== undefined) {
            failures.push(`darkness ${darkness}: ${failure}`);
          }
        }
      }

      const futureBackdrop = document.createElement("span");
      futureBackdrop.style.background = "rgb(120 120 120)";
      const future = document.createElement("button");
      future.textContent = "Future field target";
      future.style.cssText =
        "width:12px;height:12px;min-width:0;min-height:0;padding:0;" +
        "font-size:8px;outline:2px solid rgb(120 120 120)";
      futureBackdrop.append(future);
      root.append(futureBackdrop);
      const futureRect = future.getBoundingClientRect();
      const futureFocusFailure = inspectFocusRing(future);
      const futureProof = futureRect.width < minimumTargetSize &&
        Number.parseFloat(getComputedStyle(future).fontSize) < 13 &&
        futureFocusFailure !== undefined;
      futureBackdrop.remove();
      if (!futureProof) {
        failures.push("Synthetic future field target escaped an axis detector");
      }
    } finally {
      root.removeAttribute("data-discern-field-axis-conformance");
      motionOverride.remove();
      for (const [property, value] of initial) {
        if (value === "") root.style.removeProperty(property);
        else root.style.setProperty(property, value);
      }
    }

    if (targetChecks === 0 || textFloorChecks === 0 || focusRingChecks === 0) {
      failures.push("Field-axis browser check exercised an empty population");
    }
    if (failures.length > 0) {
      throw new Error(`Field-axis reach failed:\n${failures.join("\n")}`);
    }
    return {
      points: points.length,
      targetChecks,
      textFloorChecks,
      focusRingChecks,
    };
  });
}

async function verifyStatusWitnesses(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const normalize = (value: string): string =>
      value.toLowerCase().replace(/[^a-z0-9]+/gu, " ").trim();
    const namesState = (value: string, state: string): boolean =>
      ` ${normalize(value)} `.includes(` ${normalize(state)} `);
    const hidden = (element: Element): boolean =>
      element.closest(
        "[aria-hidden='true'],[hidden],script,style,template,.discern-visually-hidden,.sr-only",
      ) !== null;
    const visibleText = (root: Element): string => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const text: string[] = [];
      for (
        let node = walker.nextNode();
        node !== null;
        node = walker.nextNode()
      ) {
        const parent = node.parentElement;
        if (parent !== null && !hidden(parent)) {
          text.push(node.textContent ?? "");
        }
      }
      return text.join(" ");
    };
    const textForIds = (ids: string): string =>
      ids.split(/\s+/u).map((id) =>
        document.getElementById(id)?.textContent ?? ""
      ).join(" ");
    const accessibleName = (element: Element): string =>
      element.getAttribute("aria-label") ?? element.getAttribute("alt") ??
        (element.getAttribute("aria-labelledby") === null
          ? undefined
          : textForIds(element.getAttribute("aria-labelledby") ?? "")) ??
        element.getAttribute("title") ??
        element.querySelector("title")?.textContent ?? "";
    const icon = (element: Element): boolean =>
      element.matches("img,svg,[role='img']") ||
      /(?:^|[-_\s])(?:icon|glyph|marker|sigil)(?:$|[-_\s])/iu.test(
        element.getAttribute("class") ?? "",
      );
    const inspect = (element: HTMLElement): string | undefined => {
      const attribute = element.hasAttribute("data-discern-tone")
        ? "data-discern-tone"
        : "data-discern-status";
      const state = element.getAttribute(attribute)?.trim() ?? "";
      if (state === "" || namesState(visibleText(element), state)) {
        return undefined;
      }
      const namedIcon = [element, ...element.querySelectorAll("*")].some(
        (candidate) =>
          !hidden(candidate) && icon(candidate) &&
          namesState(accessibleName(candidate), state),
      );
      if (namedIcon) return undefined;
      const component = element.closest<HTMLElement>(
        "[data-discern-component]",
      )?.dataset.discernComponent ?? "unknown";
      return `${component} ${attribute}="${state}" lacks a visible state label or named icon`;
    };

    const elements = [...document.querySelectorAll<HTMLElement>(
      ".discern-catalogue-component__canvas [data-discern-tone]," +
        ".discern-catalogue-component__canvas [data-discern-status]",
    )];
    const failures = elements.flatMap((element) => {
      const failure = inspect(element);
      return failure === undefined ? [] : [failure];
    });
    const fixture = document.createElement("span");
    fixture.dataset.discernStatus = "blocked";
    fixture.innerHTML = '<span class="future-icon" aria-hidden="true">!</span>';
    document.body.append(fixture);
    const futureProof = inspect(fixture) !== undefined;
    fixture.remove();
    if (!futureProof) {
      failures.push("A synthetic missing status witness escaped the detector");
    }
    if (elements.length === 0) {
      failures.push(
        "The status-witness browser contract exercised no elements",
      );
    }
    if (failures.length > 0) {
      throw new Error(`Status witnesses failed:\n${failures.join("\n")}`);
    }
    return elements.length;
  });
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
  readonly fieldAxisPoints: number;
  readonly fieldAxisTargetChecks: number;
  readonly fieldAxisTextFloorChecks: number;
  readonly fieldAxisFocusRingChecks: number;
  readonly statusWitnessChecks: number;
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
  const fieldAxisReach = await verifyFieldAxisReach(page);
  const statusWitnessChecks = await verifyStatusWitnesses(page);
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
    fieldAxisPoints: fieldAxisReach.points,
    fieldAxisTargetChecks: fieldAxisReach.targetChecks,
    fieldAxisTextFloorChecks: fieldAxisReach.textFloorChecks,
    fieldAxisFocusRingChecks: fieldAxisReach.focusRingChecks,
    statusWitnessChecks,
    accessibilityScans,
    scenarios,
    screenshots,
    forcedColorFocusChecks,
    metadataRoleChecks: metadata.roles,
  };
}
