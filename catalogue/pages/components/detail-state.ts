import type { RegistryEntry } from "../../generated/registry.ts";
import { catalogueComponentPath } from "../../routes.ts";
import {
  catalogueHref,
  type CatalogueSurface,
  catalogueSurface,
  stateFragmentId,
} from "../shared.tsx";

export type ComponentDetailView = "single" | "all" | "states" | "playground";

/** Exact, URL-reproducible specimen inspection widths beside the fitted default. */
export const componentDetailWidthPresets = Object.freeze(
  [
    { id: "narrow", label: "Narrow", pixels: 360 },
    { id: "standard", label: "Standard", pixels: 720 },
    { id: "wide", label: "Wide", pixels: 1000 },
  ] as const,
);

export type ComponentDetailWidthPresetId =
  (typeof componentDetailWidthPresets)[number]["id"];

/** The default specimen width: fill the canvas actually allocated to it. */
export const componentDetailFitWidth = "fit";

export type ComponentDetailWidth =
  | typeof componentDetailFitWidth
  | ComponentDetailWidthPresetId;

export interface ComponentDetailState {
  readonly surface: CatalogueSurface;
  readonly exampleId: string;
  readonly view: ComponentDetailView;
  /** Optional so callers outside the detail route can omit the defaults. */
  readonly width?: ComponentDetailWidth;
  readonly expanded?: boolean;
}

/** Resolve a requested view; unknown values fall back to the single example. */
export function componentDetailView(
  value: string | null,
): ComponentDetailView {
  return value === "all" || value === "states" || value === "playground"
    ? value
    : "single";
}

/** Resolve a requested width; anything but an exact preset fits the canvas. */
export function componentDetailWidth(
  value: string | null,
): ComponentDetailWidth {
  return componentDetailWidthPresets.find(({ id }) => id === value)?.id ??
    componentDetailFitWidth;
}

function fragmentSelection(
  entry: RegistryEntry,
  hash: string,
): Readonly<{ surface: CatalogueSurface; exampleId: string }> | undefined {
  const escapedSlug = entry.meta.slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(
    `^#component-${escapedSlug}--(cli-)?([a-z0-9]+(?:-[a-z0-9]+)*)$`,
  ).exec(hash);
  const exampleId = match?.[2];
  if (
    exampleId === undefined ||
    !entry.canonicalExamples.some(({ id }) => id === exampleId)
  ) return undefined;
  return {
    surface: match?.[1] === undefined ? "web" : "cli",
    exampleId,
  };
}

function defaultDetailExample(
  entry: RegistryEntry,
  surface: CatalogueSurface,
): string {
  return entry.canonicalExamples.find(({ surfaces }) =>
    surfaces.includes(surface)
  )?.id ?? entry.canonicalExamples[0]?.id ?? "default";
}

/** Deep links outrank comfort defaults; invalid ids fall back canonically. */
export function parseComponentDetailState(
  entry: RegistryEntry,
  url: URL,
  fallbackSurface: CatalogueSurface,
): ComponentDetailState {
  const fragment = fragmentSelection(entry, url.hash);
  const surface = fragment?.surface ??
    (url.searchParams.has("surface")
      ? catalogueSurface(url.searchParams.get("surface"))
      : fallbackSurface);
  const requestedExample = fragment?.exampleId ?? url.searchParams.get(
    "example",
  );
  const exampleId =
    entry.canonicalExamples.some(({ id }) => id === requestedExample)
      ? requestedExample as string
      : defaultDetailExample(entry, surface);
  return {
    surface,
    exampleId,
    view: componentDetailView(url.searchParams.get("view")),
    width: componentDetailWidth(url.searchParams.get("width")),
    expanded: url.searchParams.get("expanded") === "1",
  };
}

export function componentExampleFragmentId(
  slug: string,
  surface: CatalogueSurface,
  exampleId: string,
): string {
  return surface === "cli"
    ? `component-${slug}--cli-${exampleId}`
    : stateFragmentId(slug, exampleId);
}

/** Stable detail URL used by controls, deep links, and previous/next travel. */
export function componentDetailHref(
  entry: RegistryEntry,
  state: ComponentDetailState,
  options: Readonly<{ anchor?: boolean }> = {},
): string {
  const definition = entry.canonicalExamples.find(({ id }) =>
    id === state.exampleId
  );
  const width = state.width ?? componentDetailFitWidth;
  const href = catalogueHref(catalogueComponentPath(entry.meta.slug), {
    surface: state.surface === "cli" ? "cli" : undefined,
    example: state.exampleId,
    view: state.view === "single" ? undefined : state.view,
    width: width === componentDetailFitWidth ? undefined : width,
    expanded: state.expanded === true ? "1" : undefined,
  });
  return options.anchor &&
      (state.view === "single" || state.view === "all") &&
      definition?.surfaces.includes(state.surface)
    ? `${href}#${
      componentExampleFragmentId(
        entry.meta.slug,
        state.surface,
        state.exampleId,
      )
    }`
    : href;
}
