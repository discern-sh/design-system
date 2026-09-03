import type { AppearanceName } from "../../src/tokens/appearance.ts";
import { catalogueAccentHue } from "../shell/appearance-options.ts";
import {
  type CatalogueAppearanceState,
  defaultCatalogueAppearanceState,
  parseCatalogueAppearanceParameters,
  writeCatalogueAppearanceParameters,
} from "../shell/appearance-state.ts";
import {
  reviewInlineSizes,
  reviewStateCategories,
} from "../review-postures.ts";
import type {
  ReviewInlineSize,
  ReviewStateCategory,
} from "../review-postures.ts";

export const componentReviewPath = "/catalogue/reviews/components/";
export const reviewMotionModes = ["ordinary", "reduced"] as const;
export const reviewSurfaceModes = ["contact", "reel"] as const;
export const reviewTimingModes = ["production", "slow"] as const;

export interface ComponentReviewState {
  readonly group?: string;
  readonly component?: string;
  readonly example?: string;
  readonly posture?: string;
  readonly category?: ReviewStateCategory;
  readonly width: ReviewInlineSize;
  readonly theme: "light" | "dark";
  readonly appearance: AppearanceName;
  readonly accentHue: number;
  readonly field: CatalogueAppearanceState["field"];
  readonly motion: (typeof reviewMotionModes)[number];
  readonly mode: (typeof reviewSurfaceModes)[number];
  readonly speed: (typeof reviewTimingModes)[number];
}

function oneOf<const Values extends readonly string[]>(
  value: string | null,
  values: Values,
): Values[number] | undefined {
  return value !== null && values.includes(value)
    ? value as Values[number]
    : undefined;
}

function identifier(value: string | null): string | undefined {
  return value !== null && value.trim() !== "" ? value.trim() : undefined;
}

function reviewAppearance(
  parameters: URLSearchParams,
): CatalogueAppearanceState & { readonly theme: "light" | "dark" } {
  const migrated = new URLSearchParams(parameters);
  const formerAppearance = migrated.get("appearance");
  if (
    formerAppearance !== null && formerAppearance !== "field" &&
    formerAppearance !== "accent"
  ) {
    const hue = catalogueAccentHue(formerAppearance);
    if (hue !== undefined) {
      migrated.set("appearance", "accent");
      migrated.set("accent", String(hue));
    }
  }
  const parsed = parseCatalogueAppearanceParameters(migrated);
  const state = parsed ?? {
    ...defaultCatalogueAppearanceState,
    theme: "light" as const,
  };
  const theme = state.theme === "system" ? "light" : state.theme;
  return { ...state, theme };
}

/** Parse only stable, meaningful inputs; unknown values fall back safely. */
export function parseComponentReviewState(url: URL): ComponentReviewState {
  const parameters = url.searchParams;
  const appearance = reviewAppearance(parameters);
  const group = identifier(parameters.get("group"));
  const component = identifier(parameters.get("component"));
  const example = identifier(parameters.get("example"));
  const posture = identifier(parameters.get("posture"));
  const category = oneOf(parameters.get("category"), reviewStateCategories);
  return {
    ...(group === undefined ? {} : { group }),
    ...(component === undefined ? {} : { component }),
    ...(example === undefined ? {} : { example }),
    ...(posture === undefined ? {} : { posture }),
    ...(category === undefined ? {} : { category }),
    width: oneOf(
      parameters.get("width"),
      Object.keys(reviewInlineSizes) as ReviewInlineSize[],
    ) ?? "medium",
    theme: appearance.theme,
    appearance: appearance.appearance,
    accentHue: appearance.accentHue,
    field: appearance.field,
    motion: oneOf(parameters.get("motion"), reviewMotionModes) ?? "ordinary",
    mode: oneOf(parameters.get("mode"), reviewSurfaceModes) ?? "contact",
    speed: oneOf(parameters.get("speed"), reviewTimingModes) ?? "production",
  };
}

/** Serialize inputs in one canonical order for reproducible owner handoff. */
export function componentReviewHref(state: ComponentReviewState): string {
  const parameters = new URLSearchParams();
  for (
    const [name, value] of [
      ["group", state.group],
      ["component", state.component],
      ["example", state.example],
      ["posture", state.posture],
      ["category", state.category],
      ["width", state.width],
    ] as const
  ) {
    if (value !== undefined) parameters.set(name, value);
  }
  writeCatalogueAppearanceParameters(parameters, {
    theme: state.theme,
    appearance: state.appearance,
    accentHue: state.accentHue,
    field: state.field,
  });
  for (
    const [name, value] of [
      ["motion", state.motion],
      ["mode", state.mode],
      ["speed", state.speed],
    ] as const
  ) parameters.set(name, value);
  return `${componentReviewPath}?${parameters.toString()}`;
}
