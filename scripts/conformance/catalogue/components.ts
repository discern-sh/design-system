import { type Progress, progressActivity } from "../../progress.ts";
import {
  conformanceUrl,
  loadConformancePage,
} from "./component-conformance-page.ts";
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
  addPageFailureListeners,
  scanBrowserAccessibility,
} from "../../browser-conformance-support.ts";
import { withViewport } from "../../viewport.ts";
import { verifyDecisionCopyEnrollment } from "./metadata-copy.ts";
import { misalignedGridText } from "../centered-grid-text.ts";

const OUTPUT_ROOT = new URL("../../../dist/conformance/", import.meta.url);
const WIDE_VIEWPORT = { width: 1440, height: 1000 } as const;
const NARROW_VIEWPORT = { width: 390, height: 844 } as const;

type CatalogueTheme = "light" | "dark";
type AccessibleRole = Parameters<Locator["getByRole"]>[0];

function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
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
  const specimenCanvas = page.locator(
    ".discern-catalogue-example-state__canvas",
  );
  const escapedHeadingCount = (await Promise.all(
    ([1, 2, 3, 4, 5] as const).map((level) =>
      specimenCanvas.getByRole("heading", { level }).count()
    ),
  )).reduce((total, count) => total + count, 0);
  invariant(
    escapedHeadingCount === 0,
    "Specimen-owned headings must follow their Catalogue example heading",
  );
  invariant(
    await specimenCanvas.locator(
      "h1[tabindex], h2[tabindex], h3[tabindex], h4[tabindex], h5[tabindex], h6[tabindex]",
    )
      .count() === 0,
    "A native specimen heading retained focus while its semantics moved to a proxy",
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

interface AxisReachEvidence {
  readonly points: number;
  readonly targetChecks: number;
  readonly textFloorChecks: number;
  readonly focusRingChecks: number;
}

async function verifyAxisReach(
  page: Page,
): Promise<AxisReachEvidence> {
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
    motionOverride.textContent = "[data-discern-axis-conformance], " +
      "[data-discern-axis-conformance] * {" +
      "transition: none !important; animation: none !important; }";
    document.head.append(motionOverride);
    root.setAttribute("data-discern-axis-conformance", "");

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
      root.removeAttribute("data-discern-axis-conformance");
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
  progress?: Progress,
): Promise<number> {
  let scans = 0;
  for (const [index, component] of components.entries()) {
    progress?.active(
      `Accessibility ${theme}: ${component} (${
        index + 1
      }/${components.length})`,
    );
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
  progress?: Progress,
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
      progress?.active(`Interaction: ${component}/${scenario.name}`);
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
  readonly axisPoints: number;
  readonly axisTargetChecks: number;
  readonly axisTextFloorChecks: number;
  readonly axisFocusRingChecks: number;
  readonly statusWitnessChecks: number;
  readonly accessibilityScans: number;
  readonly scenarios: number;
  readonly screenshots: number;
  readonly forcedColorFocusChecks: number;
}

export async function runComponentContractConformance(
  browser: Browser,
  page: Page,
  origin: string,
  expectedComponents: readonly string[],
  failures: string[],
  progress?: Progress,
): Promise<ComponentContractEvidence> {
  await loadConformancePage(page, conformanceUrl(origin, "light"));
  await assertAutoEnrollment(page, expectedComponents);
  const gridTextFailures = await misalignedGridText(page);
  invariant(gridTextFailures.length === 0, gridTextFailures.join("\n"));
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
  const axisReach = await verifyAxisReach(page);
  let statusWitnessChecks = 0;
  const statusPostures = [
    {
      accent: "none",
      field: "0,1,1,1",
    },
    {
      accent: "137.5",
      field: "0.75,1.4,1.35,1.2",
    },
  ] as const;
  for (const posture of statusPostures) {
    const url = new URL(conformanceUrl(origin, "light"));
    url.searchParams.set("accent", posture.accent);
    url.searchParams.set("field", posture.field);
    await loadConformancePage(page, url.href);
    statusWitnessChecks += await verifyStatusWitnesses(page);
  }
  await page.emulateMedia({ forcedColors: "active" });
  const forcedStatusUrl = new URL(conformanceUrl(origin, "dark"));
  forcedStatusUrl.searchParams.set("accent", "335");
  forcedStatusUrl.searchParams.set("field", "1,1,1,1");
  await loadConformancePage(page, forcedStatusUrl.href);
  statusWitnessChecks += await verifyStatusWitnesses(page);
  await page.emulateMedia({ forcedColors: "none" });
  let accessibilityScans = 0;
  for (const theme of ["light", "dark"] as const) {
    await loadConformancePage(page, conformanceUrl(origin, theme));
    accessibilityScans += await progressActivity(
      progress,
      `Accessibility ${theme}`,
      () =>
        scanAccessibility(page, theme, expectedComponents, failures, progress),
    );
  }
  const scenarios = await progressActivity(
    progress,
    "Component interactions",
    () =>
      runInteractionScenarios(
        page,
        origin,
        expectedComponents,
        failures,
        progress,
      ),
  );
  const screenshots = await progressActivity(
    progress,
    "Component review screenshots",
    () => captureReviewSheets(page, origin),
  );
  const forcedColorFocusChecks = await progressActivity(
    progress,
    "Forced-colour focus checks",
    () =>
      verifyForcedColors(browser, origin, expectedComponents.length, failures),
  );
  return {
    floatingSurfaces,
    axisPoints: axisReach.points,
    axisTargetChecks: axisReach.targetChecks,
    axisTextFloorChecks: axisReach.textFloorChecks,
    axisFocusRingChecks: axisReach.focusRingChecks,
    statusWitnessChecks,
    accessibilityScans,
    scenarios,
    screenshots,
    forcedColorFocusChecks,
  };
}
