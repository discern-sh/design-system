import type { ResolvedComponentExampleDefinition } from "../../src/types/component-examples.ts";

/** Themes captured for every canonical Web-capable Component example. */
export const componentExampleImageThemes = ["light", "dark"] as const;

/** One explicit colour posture in the generated example-image contract. */
export type ComponentExampleImageTheme =
  (typeof componentExampleImageThemes)[number];

/** Stable environment and rendering choices that define capture bytes. */
export const componentExampleCaptureContract = Object.freeze(
  {
    version: "1",
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
    viewport: Object.freeze({ width: 1280, height: 1040 }),
    harness: Object.freeze({ width: 960, minimumHeight: 720, inset: 160 }),
    deviceScaleFactor: 1,
    locale: "en-GB",
    timezoneId: "UTC",
    accentHue: 255,
    colorProfile: "srgb",
    reducedMotion: "reduce",
    clock: "2000-01-01T00:00:00.000Z",
    randomSeed: 1,
  } as const,
);

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
  return sources.flatMap(({ slug, examples }) =>
    examples.flatMap(({ id, label, surfaces }) =>
      surfaces.includes("web")
        ? componentExampleImageThemes.map((theme) => ({
          slug,
          exampleId: id,
          label,
          theme,
          filename: componentExampleImageFilename(slug, id, theme),
        }))
        : []
    )
  );
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
