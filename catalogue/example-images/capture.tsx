import { Component, useEffect } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { CatalogueExample } from "../conformance.ts";
import { catalogueWebExample } from "../generated/registry.ts";
import {
  componentExampleCaptureContract,
  type ComponentExampleCaptureFramingNode,
  type ComponentExampleCapturePaintBleed,
  componentExampleCapturePaintInsets,
  componentExampleCapturePositionedPaintContainedOrClipped,
  componentExampleCaptureRegion,
  componentExampleCaptureSubjectRegions,
  type ComponentExampleImageTheme,
  componentExampleImageThemes,
  validateRepresentativeComponentExampleFraming,
} from "./contract.ts";
import type { ComponentExampleCaptureRegion } from "./contract.ts";

interface CaptureReadyState {
  readonly status: "ready";
  readonly contractVersion: string;
  readonly fontsLoaded: true;
  readonly imagesLoaded: number;
  readonly activeAnimations: 0;
  readonly region: ComponentExampleCaptureRegion;
  readonly documentWidth: number;
  readonly documentHeight: number;
}

interface CaptureErrorState {
  readonly status: "error";
  readonly message: string;
}

declare global {
  interface Window {
    __discernExampleCapture?: CaptureReadyState | CaptureErrorState;
  }
}

function captureTheme(value: string | null): ComponentExampleImageTheme {
  const theme = componentExampleImageThemes.find((candidate) =>
    candidate === value
  );
  if (theme === undefined) {
    throw new TypeError(
      `Capture theme must be light or dark; received ${JSON.stringify(value)}`,
    );
  }
  return theme;
}

function captureRepresentative(value: string | null): boolean {
  if (value === "1") return true;
  if (value === "0") return false;
  throw new TypeError(
    `Capture representative state must be 1 or 0; received ${
      JSON.stringify(value)
    }`,
  );
}

function markCaptureError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  globalThis.window.__discernExampleCapture = { status: "error", message };
  document.documentElement.dataset.discernCaptureStatus = "error";
  document.documentElement.dataset.discernCaptureError = message;
}

function oneElement(host: HTMLElement, selector: string): HTMLElement {
  const matches = host.querySelectorAll<HTMLElement>(selector);
  if (matches.length !== 1) {
    throw new Error(
      `Capture selector ${
        JSON.stringify(selector)
      } matched ${matches.length} elements; expected exactly one`,
    );
  }
  const element = matches.item(0);
  if (element === null) throw new Error("Capture selector lost its element");
  return element;
}

function inDocumentOrder(elements: Iterable<Element>): readonly Element[] {
  return [...new Set(elements)].toSorted((left, right) => {
    if (left === right) return 0;
    return left.compareDocumentPosition(right) &
        Node.DOCUMENT_POSITION_FOLLOWING
      ? -1
      : 1;
  });
}

function selectedElements(
  host: HTMLElement,
  selectors: readonly string[],
): readonly Element[] {
  const selected: Element[] = [];
  for (const selector of selectors) {
    const matches = [...host.querySelectorAll(selector)];
    if (matches.length === 0) {
      throw new Error(
        `Capture selector ${JSON.stringify(selector)} matched no elements`,
      );
    }
    selected.push(...matches);
  }
  return inDocumentOrder(selected);
}

async function paintedFrames(): Promise<void> {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
}

async function loadFonts(): Promise<void> {
  await Promise.all([
    document.fonts.load('400 16px "Crimson Pro"'),
    document.fonts.load('400 16px "Inter"'),
    document.fonts.load('600 16px "Inter"'),
    document.fonts.load('400 16px "JetBrains Mono"'),
  ]);
  await document.fonts.ready;
  for (
    const font of [
      '400 16px "Crimson Pro"',
      '400 16px "Inter"',
      '600 16px "Inter"',
      '400 16px "JetBrains Mono"',
    ]
  ) {
    if (!document.fonts.check(font)) {
      throw new Error(`Repository-owned capture font did not load: ${font}`);
    }
  }
}

async function loadImages(host: HTMLElement): Promise<number> {
  const images = [...host.querySelectorAll<HTMLImageElement>("img")];
  await Promise.all(images.map(async (image) => {
    const source = image.currentSrc || image.src;
    const url = new URL(source, globalThis.location.href);
    if (url.protocol !== "data:" && url.origin !== globalThis.location.origin) {
      throw new Error(`Capture image is not repository-owned: ${url.href}`);
    }
    if (!image.complete) {
      await new Promise<void>((resolve, reject) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener(
          "error",
          () => reject(new Error(`Capture image failed to load: ${url.href}`)),
          { once: true },
        );
      });
    }
    if (image.naturalWidth === 0 || image.naturalHeight === 0) {
      throw new Error(`Capture image has no intrinsic size: ${url.href}`);
    }
  }));
  return images.length;
}

function captureElements(
  host: HTMLElement,
  example: CatalogueExample,
): readonly Element[] {
  if (example.capture !== undefined) {
    return selectedElements(host, example.capture.selectors);
  }
  const roots = [...host.children];
  if (roots.length !== 1) {
    throw new Error(
      `Ordinary capture needs one example root but found ${roots.length}; declare one explicit capture region for multi-root or top-layer evidence`,
    );
  }
  return roots;
}

function transparentColor(value: string): boolean {
  const compact = value.replaceAll(" ", "").toLowerCase();
  return compact === "transparent" || compact === "rgba(0,0,0,0)" ||
    compact === "rgb(0,0,0,0)" || /\/0(?:\.0+)?\)$/u.test(compact);
}

function styleHasPaintedBorder(style: CSSStyleDeclaration): boolean {
  return ["top", "right", "bottom", "left"].some((edge) => {
    const borderStyle = style.getPropertyValue(`border-${edge}-style`);
    const borderWidth = Number.parseFloat(
      style.getPropertyValue(`border-${edge}-width`),
    );
    const borderColor = style.getPropertyValue(`border-${edge}-color`);
    return borderStyle !== "none" && borderWidth > 0 &&
      !transparentColor(borderColor);
  });
}

function nonEmptyPseudoContent(value: string): boolean {
  const normalized = value.trim();
  return normalized !== "none" && normalized !== "normal" &&
    normalized !== '""' && normalized !== "''";
}

function pseudoStyleHasPaint(style: CSSStyleDeclaration): boolean {
  if (style.content === "none" || style.content === "normal") return false;
  return nonEmptyPseudoContent(style.content) ||
    style.backgroundImage !== "none" ||
    !transparentColor(style.backgroundColor) ||
    style.boxShadow !== "none" || style.textShadow !== "none" ||
    style.outlineStyle !== "none" || styleHasPaintedBorder(style);
}

function elementHasOwnPaint(element: Element): boolean {
  if (
    element instanceof SVGElement || element instanceof HTMLCanvasElement ||
    element instanceof HTMLImageElement || element instanceof HTMLVideoElement
  ) return true;
  if (
    [...element.childNodes].some((node) =>
      node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== ""
    )
  ) return true;
  const style = getComputedStyle(element);
  if (
    style.backgroundImage !== "none" ||
    !transparentColor(style.backgroundColor) || style.boxShadow !== "none" ||
    style.textShadow !== "none" || style.outlineStyle !== "none"
  ) return true;
  return styleHasPaintedBorder(style) ||
    ["::before", "::after"].some((pseudo) =>
      pseudoStyleHasPaint(getComputedStyle(element, pseudo))
    );
}

function layoutRegion(
  elements: readonly Element[],
): ComponentExampleCaptureRegion {
  return componentExampleCaptureRegion(elements.map((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      bounds: {
        left: bounds.left + globalThis.scrollX,
        top: bounds.top + globalThis.scrollY,
        right: bounds.right + globalThis.scrollX,
        bottom: bounds.bottom + globalThis.scrollY,
      },
      paint: { top: 0, right: 0, bottom: 0, left: 0 },
    };
  }));
}

function framingNode(element: Element): ComponentExampleCaptureFramingNode {
  return {
    region: layoutRegion([element]),
    paintsOwnBox: elementHasOwnPaint(element),
    children: [...element.children]
      .filter((child) => {
        const bounds = child.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0;
      })
      .map(framingNode),
  };
}

function pseudoPaintNeedsDeclaration(element: Element): boolean {
  return ["::before", "::after"].some((pseudo) => {
    const style = getComputedStyle(element, pseudo);
    if (style.content === "none" || style.content === "normal") return false;
    if (
      style.boxShadow !== "none" || style.textShadow !== "none" ||
      style.filter !== "none" || style.outlineStyle !== "none"
    ) return true;

    if (!pseudoStyleHasPaint(style)) return false;
    if (style.position !== "absolute" && style.position !== "fixed") {
      // Normal-flow pseudo content contributes to its element's border box.
      return false;
    }
    const bounds = element.getBoundingClientRect();
    const elementStyle = getComputedStyle(element);
    return !componentExampleCapturePositionedPaintContainedOrClipped(
      {
        top: style.top,
        right: style.right,
        bottom: style.bottom,
        left: style.left,
        width: style.width,
        height: style.height,
        transform: style.transform,
      },
      bounds,
      { x: elementStyle.overflowX, y: elementStyle.overflowY },
    );
  });
}

function clippedPaintBox(
  element: Element,
  host: HTMLElement,
  declared: ComponentExampleCapturePaintBleed | undefined,
) {
  const style = getComputedStyle(element);
  if (declared === undefined && pseudoPaintNeedsDeclaration(element)) {
    throw new TypeError(
      "Pseudo-element paint has no measurable border box; declare paintBleed on the capture",
    );
  }
  const bounds = element.getBoundingClientRect();
  const paint = componentExampleCapturePaintInsets({
    boxShadow: style.boxShadow,
    textShadow: style.textShadow,
    outlineStyle: style.outlineStyle,
    outlineWidth: style.outlineWidth,
    outlineOffset: style.outlineOffset,
    filter: style.filter,
  }, declared);
  let left = bounds.left - paint.left;
  let top = bounds.top - paint.top;
  let right = bounds.right + paint.right;
  let bottom = bounds.bottom + paint.bottom;
  for (
    let ancestor = element.parentElement;
    ancestor !== null && ancestor !== host;
    ancestor = ancestor.parentElement
  ) {
    const ancestorStyle = getComputedStyle(ancestor);
    const ancestorBounds = ancestor.getBoundingClientRect();
    if (ancestorStyle.overflowX !== "visible") {
      left = Math.max(left, ancestorBounds.left);
      right = Math.min(right, ancestorBounds.right);
    }
    if (ancestorStyle.overflowY !== "visible") {
      top = Math.max(top, ancestorBounds.top);
      bottom = Math.min(bottom, ancestorBounds.bottom);
    }
  }
  return {
    bounds: {
      left: left + globalThis.scrollX,
      top: top + globalThis.scrollY,
      right: right + globalThis.scrollX,
      bottom: bottom + globalThis.scrollY,
    },
    paint: { top: 0, right: 0, bottom: 0, left: 0 },
  };
}

function paintedRegion(
  host: HTMLElement,
  selected: readonly Element[],
  declared: ComponentExampleCapturePaintBleed | undefined,
): ComponentExampleCaptureRegion {
  const population = inDocumentOrder(selected.flatMap((element) => [
    element,
    ...element.querySelectorAll("*"),
  ])).filter((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0;
  });
  return componentExampleCaptureRegion(
    population.map((element) => clippedPaintBox(element, host, declared))
      .filter(({ bounds }) =>
        bounds.right > bounds.left && bounds.bottom > bounds.top
      ),
  );
}

function validateRepresentativeFraming(
  source: string,
  root: Element,
  example: CatalogueExample,
): void {
  if (elementHasOwnPaint(root)) return;
  const subjectRegions = componentExampleCaptureSubjectRegions(
    [...root.children]
      .filter((child) => {
        const bounds = child.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0;
      })
      .map(framingNode),
  );
  if (subjectRegions.length === 0) {
    throw new Error(
      `${source} representative has an unpainted allocation with no rendered subject`,
    );
  }
  validateRepresentativeComponentExampleFraming(
    source,
    layoutRegion([root]),
    componentExampleCaptureRegion(subjectRegions.map((region) => ({
      bounds: {
        left: region.x,
        top: region.y,
        right: region.x + region.width,
        bottom: region.y + region.height,
      },
      paint: { top: 0, right: 0, bottom: 0, left: 0 },
    }))),
    example.capture?.framing,
  );
}

function extendDocumentTo(region: ComponentExampleCaptureRegion): void {
  const width = Math.ceil(region.x + region.width);
  const height = Math.ceil(region.y + region.height);
  document.documentElement.style.minWidth = `${width}px`;
  document.documentElement.style.minHeight = `${height}px`;
  document.body.style.minWidth = `${width}px`;
  document.body.style.minHeight = `${height}px`;
}

async function settleCapture(
  source: string,
  example: CatalogueExample,
  representative: boolean,
): Promise<void> {
  const host = document.querySelector<HTMLElement>(
    "[data-discern-capture-example]",
  );
  if (host === null) throw new Error("Capture example host is missing");
  await paintedFrames();
  for (const preparation of example.capture?.prepare ?? []) {
    const target = oneElement(host, preparation.selector);
    if (preparation.action === "focus") {
      target.focus({ preventScroll: true });
    } else {
      target.click();
    }
    await paintedFrames();
  }
  const [imagesLoaded] = await Promise.all([loadImages(host), loadFonts()]);
  await paintedFrames();
  const activeAnimations =
    document.getAnimations().filter((animation) =>
      animation.playState !== "finished" && animation.playState !== "idle"
    ).length;
  if (activeAnimations !== 0) {
    throw new Error(
      `Capture readiness found ${activeAnimations} active animations`,
    );
  }
  const elements = captureElements(host, example);
  if (representative) {
    for (const [index, element] of elements.entries()) {
      validateRepresentativeFraming(
        `${source} selection ${index + 1}`,
        element,
        example,
      );
    }
  }
  let region = paintedRegion(host, elements, example.capture?.paintBleed);
  extendDocumentTo(region);
  await paintedFrames();
  region = paintedRegion(host, elements, example.capture?.paintBleed);
  extendDocumentTo(region);
  await paintedFrames();
  region = paintedRegion(host, elements, example.capture?.paintBleed);
  const documentWidth = Math.max(
    document.documentElement.scrollWidth,
    document.body.scrollWidth,
  );
  const documentHeight = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
  );
  if (
    region.x < 0 || region.y < 0 ||
    region.x + region.width > documentWidth ||
    region.y + region.height > documentHeight
  ) {
    throw new Error(
      `Capture region ${
        JSON.stringify(region)
      } escapes document ${documentWidth}×${documentHeight}`,
    );
  }
  globalThis.window.__discernExampleCapture = {
    status: "ready",
    contractVersion: componentExampleCaptureContract.version,
    fontsLoaded: true,
    imagesLoaded,
    activeAnimations: 0,
    region,
    documentWidth,
    documentHeight,
  };
  document.documentElement.dataset.discernCaptureStatus = "ready";
}

class CaptureBoundary extends Component<
  { readonly children: ReactNode },
  { readonly error?: Error }
> {
  override state: { readonly error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, _info: ErrorInfo): void {
    markCaptureError(error);
  }

  override render(): ReactNode {
    return this.state.error === undefined ? this.props.children : null;
  }
}

function CaptureApp(
  { example, representative, source, theme }: {
    readonly example: CatalogueExample;
    readonly representative: boolean;
    readonly source: string;
    readonly theme: ComponentExampleImageTheme;
  },
) {
  useEffect(() => {
    settleCapture(source, example, representative).catch(markCaptureError);
  }, [example, representative, source]);
  const Example = example.Example;
  return (
    <main
      className="discern-example-image-capture"
      data-discern-root
      data-discern-theme={theme}
      style={{
        "--discern-accent-hue": componentExampleCaptureContract.accentHue,
        width: componentExampleCaptureContract.harness.width,
        minHeight: componentExampleCaptureContract.harness.minimumHeight,
        margin: componentExampleCaptureContract.harness.inset,
      } as React.CSSProperties}
    >
      <div data-discern-capture-example>
        <Example />
      </div>
    </main>
  );
}

globalThis.addEventListener("error", (event) => markCaptureError(event.error));
globalThis.addEventListener(
  "unhandledrejection",
  (event) => markCaptureError(event.reason),
);

try {
  const url = new URL(globalThis.location.href);
  const slug = url.searchParams.get("component");
  const id = url.searchParams.get("example");
  if (slug === null || id === null) {
    throw new TypeError("Capture route needs component and example parameters");
  }
  const example = catalogueWebExample(slug, id);
  const theme = captureTheme(url.searchParams.get("theme"));
  const representative = captureRepresentative(
    url.searchParams.get("representative"),
  );
  const root = document.getElementById("root");
  if (root === null) throw new Error("Capture route root is missing");
  const viewportWidth = `${componentExampleCaptureContract.viewport.width}px`;
  document.documentElement.style.minWidth = viewportWidth;
  document.body.style.minWidth = viewportWidth;
  createRoot(root).render(
    <CaptureBoundary>
      <CaptureApp
        example={example}
        representative={representative}
        source={`${slug}/${id}/${theme}`}
        theme={theme}
      />
    </CaptureBoundary>,
  );
} catch (error) {
  markCaptureError(error);
}
