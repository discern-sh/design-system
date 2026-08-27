import { Component, useEffect } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { CatalogueExample } from "../conformance.ts";
import { catalogueWebExample } from "../generated/registry.ts";
import {
  componentExampleCaptureContract,
  type ComponentExampleImageTheme,
  componentExampleImageThemes,
} from "./contract.ts";

interface CaptureRegion {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface CaptureReadyState {
  readonly status: "ready";
  readonly contractVersion: string;
  readonly fontsLoaded: true;
  readonly imagesLoaded: number;
  readonly activeAnimations: 0;
  readonly region: CaptureRegion;
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
): readonly HTMLElement[] {
  if (example.capture !== undefined) {
    return example.capture.selectors.map((selector) =>
      oneElement(host, selector)
    );
  }
  const roots = [...host.children].filter((node): node is HTMLElement =>
    node instanceof HTMLElement || node instanceof SVGElement
  ) as HTMLElement[];
  if (roots.length !== 1) {
    throw new Error(
      `Ordinary capture needs one example root but found ${roots.length}; declare one explicit capture region for multi-root or top-layer evidence`,
    );
  }
  return roots;
}

function integerRegion(elements: readonly HTMLElement[]): CaptureRegion {
  const bounds = elements.map((element) => element.getBoundingClientRect());
  const left = Math.floor(Math.min(...bounds.map(({ left }) => left)));
  const top = Math.floor(Math.min(...bounds.map(({ top }) => top)));
  const right = Math.ceil(Math.max(...bounds.map(({ right }) => right)));
  const bottom = Math.ceil(Math.max(...bounds.map(({ bottom }) => bottom)));
  const region = {
    x: left + globalThis.scrollX,
    y: top + globalThis.scrollY,
    width: right - left,
    height: bottom - top,
  };
  if (
    !Object.values(region).every(Number.isFinite) || region.width <= 0 ||
    region.height <= 0
  ) {
    throw new Error(
      `Capture region is empty or invalid: ${JSON.stringify(region)}`,
    );
  }
  return region;
}

function extendDocumentTo(region: CaptureRegion): void {
  const width = Math.ceil(region.x + region.width);
  const height = Math.ceil(region.y + region.height);
  document.documentElement.style.minWidth = `${width}px`;
  document.documentElement.style.minHeight = `${height}px`;
  document.body.style.minWidth = `${width}px`;
  document.body.style.minHeight = `${height}px`;
}

async function settleCapture(example: CatalogueExample): Promise<void> {
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
  let region = integerRegion(elements);
  extendDocumentTo(region);
  await paintedFrames();
  region = integerRegion(elements);
  extendDocumentTo(region);
  await paintedFrames();
  region = integerRegion(elements);
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
  { example, theme }: {
    readonly example: CatalogueExample;
    readonly theme: ComponentExampleImageTheme;
  },
) {
  useEffect(() => {
    settleCapture(example).catch(markCaptureError);
  }, [example]);
  const Example = example.Example;
  return (
    <main
      className="discern-example-image-capture"
      data-discern-root
      data-discern-theme={theme}
      style={{
        "--discern-accent-hue": componentExampleCaptureContract.accentHue,
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
  const root = document.getElementById("root");
  if (root === null) throw new Error("Capture route root is missing");
  createRoot(root).render(
    <CaptureBoundary>
      <CaptureApp example={example} theme={theme} />
    </CaptureBoundary>,
  );
} catch (error) {
  markCaptureError(error);
}
