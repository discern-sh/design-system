import type { ResolvedComponentExampleDefinition } from "../../src/types/component-examples.ts";

/** Themes captured for every canonical Web-capable Component example. */
export const componentExampleImageThemes = ["light", "dark"] as const;

/** One explicit colour posture in the generated example-image contract. */
export type ComponentExampleImageTheme =
  (typeof componentExampleImageThemes)[number];

/** Stable environment and rendering choices that constrain canonical capture. */
export const componentExampleCaptureContract = Object.freeze(
  {
    version: "4",
    denoVersion: "2.9.5",
    playwrightVersion: "1.61.1",
    chromiumRevision: "1228",
    chromiumVersion: "149.0.7827.55",
    browserArguments: Object.freeze([
      "--disable-gpu",
      "--disable-lcd-text",
      "--disable-skia-runtime-opts",
      "--font-render-hinting=none",
      "--force-color-profile=srgb",
    ]),
    bytePlatform: Object.freeze({
      os: "darwin",
      arch: "aarch64",
      release: "25.6.0",
    }),
    viewport: Object.freeze({ width: 1600, height: 2000 }),
    harness: Object.freeze({ width: 960, minimumHeight: 720, inset: 256 }),
    deviceScaleFactor: 1,
    locale: "en-GB",
    timezoneId: "UTC",
    accentHue: 255,
    colorProfile: "srgb",
    reducedMotion: "reduce",
    clock: "2000-01-01T00:00:00.000Z",
    randomSeed: 1,
    paint: Object.freeze({ shadowBlurSafetyFactor: 1.5 }),
    framing: Object.freeze({ minimumSubjectAreaRatio: 1 / 3 }),
  } as const,
);

/** One physical rectangle in capture-document coordinates. */
export interface ComponentExampleCaptureRegion {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Physical paint overflow beyond an element's border box. */
export interface ComponentExampleCaptureInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/** Explicit paint overflow for effects whose computed grammar is not provable. */
export type ComponentExampleCapturePaintBleed =
  | number
  | {
    readonly top?: number;
    readonly right?: number;
    readonly bottom?: number;
    readonly left?: number;
  };

/** An intentional allocation-sized representative frame. */
export interface ComponentExampleCaptureFramingIntent {
  readonly mode: "allocation";
  readonly reason: string;
}

/** The computed paint properties the capture geometry understands exactly. */
export interface ComponentExampleCaptureComputedPaint {
  readonly boxShadow: string;
  readonly textShadow: string;
  readonly outlineStyle: string;
  readonly outlineWidth: string;
  readonly outlineOffset: string;
  readonly filter: string;
}

/** One selected border box plus the paint that escapes it. */
export interface ComponentExampleCapturePaintBox {
  readonly bounds: {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  };
  readonly paint: ComponentExampleCaptureInsets;
}

/** A rendered allocation node used to find the first visibly painted subjects. */
export interface ComponentExampleCaptureFramingNode {
  readonly region: ComponentExampleCaptureRegion;
  readonly paintsOwnBox: boolean;
  readonly children: readonly ComponentExampleCaptureFramingNode[];
}

/** Physical computed geometry for a positioned painted pseudo-element. */
export interface ComponentExampleCapturePositionedBox {
  readonly top: string;
  readonly right: string;
  readonly bottom: string;
  readonly left: string;
  readonly width: string;
  readonly height: string;
  readonly transform: string;
}

/** Computed overflow behavior on the positioned paint's containing box. */
export interface ComponentExampleCaptureOverflow {
  readonly x: string;
  readonly y: string;
}

const zeroCaptureInsets = Object.freeze({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
});

function finiteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

/** Normalize and validate one authored physical paint extent. */
export function componentExampleCapturePaintBleed(
  bleed: ComponentExampleCapturePaintBleed | undefined,
  source = "Component example",
): ComponentExampleCaptureInsets {
  if (bleed === undefined) return zeroCaptureInsets;
  const values = typeof bleed === "number"
    ? { top: bleed, right: bleed, bottom: bleed, left: bleed }
    : {
      top: bleed.top ?? 0,
      right: bleed.right ?? 0,
      bottom: bleed.bottom ?? 0,
      left: bleed.left ?? 0,
    };
  const maximum = componentExampleCaptureContract.harness.inset;
  if (
    !Object.values(values).every((value) =>
      finiteNonNegative(value) && Number.isInteger(value) && value <= maximum
    )
  ) {
    throw new TypeError(
      `${source} paint bleed must use whole physical pixels from 0 to ${maximum}`,
    );
  }
  return values;
}

function cssLayers(value: string, source: string): readonly string[] {
  const layers: string[] = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "(") depth += 1;
    else if (character === ")") depth -= 1;
    else if (character === "," && depth === 0) {
      layers.push(value.slice(start, index).trim());
      start = index + 1;
    }
    if (depth < 0) {
      throw new TypeError(
        `${source} uses computed paint geometry the capture cannot prove; declare paintBleed`,
      );
    }
  }
  if (depth !== 0) {
    throw new TypeError(
      `${source} uses computed paint geometry the capture cannot prove; declare paintBleed`,
    );
  }
  layers.push(value.slice(start).trim());
  return layers;
}

function cssPixelLengths(
  layer: string,
  expected: readonly number[],
  source: string,
): readonly number[] {
  const values = [...layer.matchAll(/(-?(?:\d+(?:\.\d+)?|\.\d+))px\b/gu)]
    .map((match) => Number(match[1]));
  if (
    !expected.includes(values.length) ||
    values.some((value) => !Number.isFinite(value))
  ) {
    throw new TypeError(
      `${source} uses computed paint geometry the capture cannot prove; declare paintBleed`,
    );
  }
  return values;
}

function shadowInsets(
  value: string,
  kind: "box-shadow" | "text-shadow",
): ComponentExampleCaptureInsets {
  if (value === "none") return zeroCaptureInsets;
  const result: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  } = { ...zeroCaptureInsets };
  for (const layer of cssLayers(value, kind)) {
    const inset = /(?:^|\s)inset(?:\s|$)/u.test(layer);
    if (inset) {
      if (kind !== "box-shadow") {
        throw new TypeError(
          `${kind} uses computed paint geometry the capture cannot prove; declare paintBleed`,
        );
      }
      continue;
    }
    const lengths = cssPixelLengths(
      layer,
      kind === "box-shadow" ? [3, 4] : [3],
      kind,
    );
    const offsetX = lengths[0] ?? 0;
    const offsetY = lengths[1] ?? 0;
    const blur = lengths[2] ?? 0;
    const spread = kind === "box-shadow" ? lengths[3] ?? 0 : 0;
    if (blur < 0) {
      throw new TypeError(
        `${kind} uses computed paint geometry the capture cannot prove; declare paintBleed`,
      );
    }
    const radius = Math.max(
      0,
      Math.ceil(
        blur * componentExampleCaptureContract.paint.shadowBlurSafetyFactor +
          spread,
      ),
    );
    result.top = Math.max(result.top, Math.max(0, radius - offsetY));
    result.right = Math.max(result.right, Math.max(0, radius + offsetX));
    result.bottom = Math.max(result.bottom, Math.max(0, radius + offsetY));
    result.left = Math.max(result.left, Math.max(0, radius - offsetX));
  }
  return result;
}

function oneComputedPixel(value: string, source: string): number {
  const match = /^(-?(?:\d+(?:\.\d+)?|\.\d+))px$/u.exec(value.trim());
  const pixels = match === null ? Number.NaN : Number(match[1]);
  if (!Number.isFinite(pixels)) {
    throw new TypeError(
      `${source} uses computed paint geometry the capture cannot prove; declare paintBleed`,
    );
  }
  return pixels;
}

/**
 * Derive finite paint overflow from Chromium's computed shadow/outline grammar.
 * Unknown effects fail closed so an author must declare their physical extent.
 */
export function componentExampleCapturePaintInsets(
  style: ComponentExampleCaptureComputedPaint,
  declared?: ComponentExampleCapturePaintBleed,
): ComponentExampleCaptureInsets {
  const authored = componentExampleCapturePaintBleed(declared);
  if (style.filter !== "none" && declared === undefined) {
    throw new TypeError(
      `filter uses computed paint geometry the capture cannot prove; declare paintBleed`,
    );
  }
  let box: ComponentExampleCaptureInsets;
  let text: ComponentExampleCaptureInsets;
  let outline: number;
  try {
    box = shadowInsets(style.boxShadow, "box-shadow");
  } catch (error) {
    if (declared === undefined) throw error;
    box = zeroCaptureInsets;
  }
  try {
    text = shadowInsets(style.textShadow, "text-shadow");
  } catch (error) {
    if (declared === undefined) throw error;
    text = zeroCaptureInsets;
  }
  try {
    outline = style.outlineStyle === "none" ? 0 : Math.max(
      0,
      oneComputedPixel(style.outlineWidth, "outline-width") +
        oneComputedPixel(style.outlineOffset, "outline-offset"),
    );
  } catch (error) {
    if (declared === undefined) throw error;
    outline = 0;
  }
  return {
    top: Math.max(box.top, text.top, outline, authored.top),
    right: Math.max(box.right, text.right, outline, authored.right),
    bottom: Math.max(box.bottom, text.bottom, outline, authored.bottom),
    left: Math.max(box.left, text.left, outline, authored.left),
  };
}

/** Union selected border boxes and their finite paint overflow on integer edges. */
export function componentExampleCaptureRegion(
  boxes: readonly ComponentExampleCapturePaintBox[],
): ComponentExampleCaptureRegion {
  if (boxes.length === 0) {
    throw new TypeError(
      "Component example capture needs at least one paint box",
    );
  }
  const edges = boxes.map(({ bounds, paint }) => ({
    left: bounds.left - paint.left,
    top: bounds.top - paint.top,
    right: bounds.right + paint.right,
    bottom: bounds.bottom + paint.bottom,
  }));
  if (
    edges.some(({ left, top, right, bottom }) =>
      ![left, top, right, bottom].every(Number.isFinite) ||
      right <= left || bottom <= top
    )
  ) {
    throw new TypeError("Component example capture has an invalid paint box");
  }
  const left = Math.floor(Math.min(...edges.map((edge) => edge.left)));
  const top = Math.floor(Math.min(...edges.map((edge) => edge.top)));
  const right = Math.ceil(Math.max(...edges.map((edge) => edge.right)));
  const bottom = Math.ceil(Math.max(...edges.map((edge) => edge.bottom)));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * Descend through transparent allocation wrappers until visible subjects begin.
 * A painted node is itself the subject; its descendants do not double-count it.
 */
export function componentExampleCaptureSubjectRegions(
  nodes: readonly ComponentExampleCaptureFramingNode[],
): readonly ComponentExampleCaptureRegion[] {
  return nodes.flatMap((node) =>
    node.paintsOwnBox
      ? [node.region]
      : componentExampleCaptureSubjectRegions(node.children)
  );
}

function finiteComputedPixels(value: string): number | undefined {
  const match = /^(-?(?:\d+(?:\.\d+)?|\.\d+))px$/u.exec(value.trim());
  if (match === null) return undefined;
  const pixels = Number(match[1]);
  return Number.isFinite(pixels) ? pixels : undefined;
}

function positionedAxisContained(
  startValue: string,
  endValue: string,
  sizeValue: string,
  allocation: number,
): boolean {
  const start = finiteComputedPixels(startValue);
  const end = finiteComputedPixels(endValue);
  const size = finiteComputedPixels(sizeValue);
  if (start !== undefined && end !== undefined) {
    return start >= 0 && end >= 0;
  }
  if (start !== undefined && size !== undefined) {
    return start >= 0 && size >= 0 && start + size <= allocation;
  }
  if (end !== undefined && size !== undefined) {
    return end >= 0 && size >= 0 && end + size <= allocation;
  }
  return false;
}

/**
 * Prove that one positioned paint box stays inside its selected allocation.
 * Unknown units, auto-sized axes, and transforms fail closed.
 */
export function componentExampleCapturePositionedBoxContained(
  box: ComponentExampleCapturePositionedBox,
  allocation: Pick<ComponentExampleCaptureRegion, "width" | "height">,
): boolean {
  return componentExampleCapturePositionedPaintContainedOrClipped(
    box,
    allocation,
    { x: "visible", y: "visible" },
  );
}

/** Prove positioned paint cannot escape because each axis fits or is clipped. */
export function componentExampleCapturePositionedPaintContainedOrClipped(
  box: ComponentExampleCapturePositionedBox,
  allocation: Pick<ComponentExampleCaptureRegion, "width" | "height">,
  overflow: ComponentExampleCaptureOverflow,
): boolean {
  if (
    box.transform !== "none" &&
    (overflow.x === "visible" || overflow.y === "visible")
  ) return false;
  const horizontalSafe = overflow.x !== "visible" || positionedAxisContained(
    box.left,
    box.right,
    box.width,
    allocation.width,
  );
  const verticalSafe = overflow.y !== "visible" || positionedAxisContained(
    box.top,
    box.bottom,
    box.height,
    allocation.height,
  );
  return horizontalSafe && verticalSafe;
}

/**
 * Reject a representative whose unpainted allocation overwhelms its subject.
 * Explicit allocation intent is the reviewable escape for meaningful space.
 */
export function validateRepresentativeComponentExampleFraming(
  source: string,
  allocation: ComponentExampleCaptureRegion,
  subject: ComponentExampleCaptureRegion,
  intent?: ComponentExampleCaptureFramingIntent,
): void {
  if (intent !== undefined) return;
  const left = Math.max(allocation.x, subject.x);
  const top = Math.max(allocation.y, subject.y);
  const right = Math.min(
    allocation.x + allocation.width,
    subject.x + subject.width,
  );
  const bottom = Math.min(
    allocation.y + allocation.height,
    subject.y + subject.height,
  );
  const overlapArea = Math.max(0, right - left) * Math.max(0, bottom - top);
  const allocationArea = allocation.width * allocation.height;
  const ratio = allocationArea === 0 ? 0 : overlapArea / allocationArea;
  if (
    ratio + Number.EPSILON >=
      componentExampleCaptureContract.framing.minimumSubjectAreaRatio
  ) return;
  throw new Error(
    `${source} representative capture is pathologically sparse (${
      (
        ratio * 100
      ).toFixed(1)
    }% subject coverage); select the visible subject or declare reviewed allocation framing with a reason`,
  );
}

/** The rendered document size one capture reports before its screenshot. */
export interface ComponentExampleCaptureDocumentSize {
  readonly width: number;
  readonly height: number;
}

/**
 * Keep every capture on Chromium's in-viewport rasterization path.
 *
 * A `fullPage` screenshot of a document larger than the viewport permanently
 * changes how that page rasterizes text, for every later capture it takes:
 * navigation does not clear the state, only a new page does. So `viewport` is
 * sized past the tallest example rather than to it, and each capture proves it
 * still fits. Growing an example past the viewport fails here, loudly, instead
 * of quietly moving the pixels of whichever examples happen to follow it.
 */
export function validateComponentExampleCaptureFitsViewport(
  source: string,
  document: ComponentExampleCaptureDocumentSize,
): void {
  const { width, height } = componentExampleCaptureContract.viewport;
  if (document.width <= width && document.height <= height) return;
  throw new Error(
    `${source} renders a ${document.width}×${document.height} document past the ${width}×${height} capture viewport; raise componentExampleCaptureContract.viewport past it and recapture`,
  );
}

/**
 * The document height one committed image implies inside the capture harness.
 *
 * The harness insets the example on every side and the capture route grows the
 * document to the example's outer edge, so the document is never shorter than
 * the viewport and never taller than the inset example filling it. Committed
 * image heights therefore say, without a browser, how much viewport headroom
 * the corpus still has before a capture would leave the in-viewport path.
 */
export function componentExampleCaptureDocumentHeight(
  imageHeight: number,
): number {
  const { harness, viewport } = componentExampleCaptureContract;
  return Math.max(viewport.height, 2 * harness.inset + imageHeight);
}

/** A deterministic interaction needed before one example is visually ready. */
export interface ComponentExampleCapturePreparation {
  readonly action: "click" | "focus";
  readonly selector: string;
}

/**
 * An exceptional capture posture for top-layer or multi-root evidence.
 *
 * Selectors resolve inside the example host. Their rectangles are combined
 * into one integer capture region after the optional preparation steps run.
 */
export interface ComponentExampleCaptureDirective {
  /** Reviewed intent when allocated empty space is itself the evidence. */
  readonly framing?: ComponentExampleCaptureFramingIntent;
  /** Physical overflow for an effect outside the strict computed grammar. */
  readonly paintBleed?: ComponentExampleCapturePaintBleed;
  readonly prepare?: readonly ComponentExampleCapturePreparation[];
  readonly selectors: readonly string[];
}

/** Validate one exceptional capture posture before it reaches the browser. */
export function validateComponentExampleCaptureDirective(
  directive: ComponentExampleCaptureDirective,
  source: string,
): void {
  if (directive.selectors.length === 0) {
    throw new TypeError(`${source} capture needs at least one region selector`);
  }
  for (const [index, selector] of directive.selectors.entries()) {
    if (selector.trim() === "") {
      throw new TypeError(
        `${source} capture selector ${index} must be non-empty`,
      );
    }
  }
  if (
    directive.framing !== undefined &&
    directive.framing.reason.trim() === ""
  ) {
    throw new TypeError(
      `${source} allocation framing needs a non-empty reason`,
    );
  }
  componentExampleCapturePaintBleed(directive.paintBleed, source);
  for (const [index, preparation] of (directive.prepare ?? []).entries()) {
    if (preparation.selector.trim() === "") {
      throw new TypeError(
        `${source} capture preparation ${index} must name a selector`,
      );
    }
  }
}

/** One source-backed input to the generated image plan. */
export interface ComponentExampleImageSource {
  readonly slug: string;
  readonly examples: readonly ResolvedComponentExampleDefinition[];
}

/** One planned image before the browser supplies dimensions and bytes. */
export interface PlannedComponentExampleImage {
  readonly slug: string;
  readonly exampleId: string;
  readonly label: string;
  readonly theme: ComponentExampleImageTheme;
  readonly filename: string;
  readonly representative: boolean;
}

/** Stable filename for one canonical Component example and theme. */
export function componentExampleImageFilename(
  slug: string,
  exampleId: string,
  theme: ComponentExampleImageTheme,
): string {
  return `${slug}--${exampleId}--${theme}.png`;
}

/**
 * Project the complete ordered image plan from the canonical example facts.
 * CLI-only entries deliberately emit no browser-image operations.
 */
export function planComponentExampleImages(
  sources: readonly ComponentExampleImageSource[],
): readonly PlannedComponentExampleImage[] {
  return sources.flatMap(({ slug, examples }) => {
    const representative = representativeComponentExampleId(examples);
    return examples.flatMap(({ id, label, surfaces }) =>
      surfaces.includes("web")
        ? componentExampleImageThemes.map((theme) => ({
          slug,
          exampleId: id,
          label,
          theme,
          filename: componentExampleImageFilename(slug, id, theme),
          representative: id === representative,
        }))
        : []
    );
  });
}

/** Default when present, otherwise the first canonical Web example. */
export function representativeComponentExampleId(
  examples: readonly ResolvedComponentExampleDefinition[],
): string | undefined {
  const webExamples = examples.filter(({ surfaces }) =>
    surfaces.includes("web")
  );
  return webExamples.find(({ id }) => id === "default")?.id ??
    webExamples[0]?.id;
}

/** Orphan files removed by an update, derived in both directions. */
export function orphanedComponentExampleImageFiles(
  plan: readonly PlannedComponentExampleImage[],
  currentFilenames: readonly string[],
): readonly string[] {
  const expected = new Set(plan.map(({ filename }) => filename));
  return currentFilenames.filter((filename) => !expected.has(filename))
    .toSorted();
}

/** One committed exact-bounds image and its source-backed identity. */
export interface ComponentExampleImageManifestEntry {
  readonly slug: string;
  readonly componentName: string;
  readonly exampleId: string;
  readonly label: string;
  readonly theme: ComponentExampleImageTheme;
  readonly assetPath: string;
  readonly assetUrl: string;
  readonly width: number;
  readonly height: number;
  readonly contentHash: `sha256:${string}`;
  readonly captureContractVersion: string;
}

/** The complete generated Component example-image authority. */
export interface ComponentExampleImageManifest {
  readonly captureContractVersion: string;
  readonly sourceHash: `sha256:${string}`;
  readonly entries: readonly ComponentExampleImageManifestEntry[];
}
