import { componentExampleImageManifest } from "./generated/example-images-manifest.ts";
import type {
  ComponentExampleImageManifestEntry,
  ComponentExampleImageTheme,
} from "./example-images/contract.ts";

/** Development-only fallback when generated image production has failed. */
export const missingComponentExampleImage = Object.freeze({
  kind: "missing" as const,
  assetUrl: "/catalogue/example-images/missing.svg",
  width: 320,
  height: 180,
  alt: "Component example image unavailable",
  caption: "Generated image unavailable",
});

/** Resolve one exact generated image without mounting its live Component. */
export function componentExampleImage(
  slug: string,
  exampleId: string,
  theme: ComponentExampleImageTheme,
): ComponentExampleImageManifestEntry | undefined {
  return componentExampleImageManifest.entries.find((entry) =>
    entry.slug === slug && entry.exampleId === exampleId &&
    entry.theme === theme
  );
}

/** Fail closed when a current generated image is missing in production code. */
export function requireComponentExampleImage(
  slug: string,
  exampleId: string,
  theme: ComponentExampleImageTheme,
): ComponentExampleImageManifestEntry {
  const image = componentExampleImage(slug, exampleId, theme);
  if (image === undefined) {
    throw new TypeError(
      `Missing generated Component example image ${slug}/${exampleId}/${theme}; run deno task catalogue:images --update`,
    );
  }
  return image;
}

/** Default when present, otherwise the first canonical generated Web image. */
export function representativeComponentExampleImage(
  slug: string,
  theme: ComponentExampleImageTheme,
): ComponentExampleImageManifestEntry | undefined {
  const images = componentExampleImageManifest.entries.filter((entry) =>
    entry.slug === slug && entry.theme === theme
  );
  return images.find(({ exampleId }) => exampleId === "default") ?? images[0];
}

/** Truthful intrinsic image and source-backed text inputs for a consumer. */
export function componentExampleImagePresentation(
  image: ComponentExampleImageManifestEntry,
) {
  return Object.freeze({
    src: image.assetUrl,
    width: image.width,
    height: image.height,
    alt: `${image.componentName}: ${image.label}`,
    caption: `${image.componentName} — ${image.label}`,
  });
}

export { componentExampleImageManifest };
export type {
  ComponentExampleImageManifest,
  ComponentExampleImageManifestEntry,
  ComponentExampleImageTheme,
} from "./example-images/contract.ts";
