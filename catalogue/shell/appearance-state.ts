import type { ThemeSwitcherMode } from "../../src/components/core/theme-switcher/theme-switcher.tsx";
import {
  appearanceAxes,
  DEFAULT_ACCENT_HUE,
  defaultAppearance,
  normalizeAccentHue,
} from "../../src/tokens/appearance.ts";
import { catalogueAccentHue } from "./appearance-options.ts";
import type { CatalogueAxesSelection } from "./axes-state.ts";
import {
  catalogueAxesPolarity,
  parseCatalogueAxesValue,
  serializeCatalogueAxes,
} from "./axes-state.ts";

/** Complete orthogonal Catalogue Appearance: policy, optional accent, and axes. */
export interface CatalogueAppearanceState {
  readonly theme: ThemeSwitcherMode;
  /** Accent hue, or `undefined` for the monochrome default. */
  readonly accent: number | undefined;
  readonly field: CatalogueAxesSelection;
}

export const defaultCatalogueAppearanceState: CatalogueAppearanceState = Object
  .freeze({
    theme: "system",
    accent: undefined,
    field: defaultAppearance,
  });

export const catalogueAppearanceStorageKey = "discern-catalogue-appearance";

export const legacyCatalogueAppearanceStorageKeys = Object.freeze({
  theme: "discern-catalogue-theme",
  accent: "discern-catalogue-accent-hue",
  field: "discern-catalogue-field",
});

/** URL value that selects the monochrome default explicitly. */
export const CATALOGUE_ACCENT_NONE = "none";

export interface CatalogueAppearanceParameterNames {
  readonly theme: string;
  readonly accent: string;
  readonly field: string;
  /** Former identity coordinate, read only to migrate older links. */
  readonly legacyAppearance: string;
}

export const catalogueAppearanceParameterNames:
  CatalogueAppearanceParameterNames = Object.freeze({
    theme: "theme",
    accent: "accent",
    field: "field",
    legacyAppearance: "appearance",
  });

/** Canonical parameters written by the Catalogue, in serialisation order. */
export const catalogueAppearanceParameters = Object.freeze([
  catalogueAppearanceParameterNames.theme,
  catalogueAppearanceParameterNames.accent,
  catalogueAppearanceParameterNames.field,
]);

export function catalogueTheme(
  value: string | null,
): ThemeSwitcherMode | undefined {
  return value === "system" || value === "light" || value === "dark"
    ? value
    : undefined;
}

function legacyAppearance(value: string | null): "mono" | "accent" | undefined {
  return value === "field" ? "mono" : value === "accent" ? value : undefined;
}

function hasAnyAppearanceParameter(
  parameters: URLSearchParams,
  names: CatalogueAppearanceParameterNames,
): boolean {
  return Object.values(names).some((name) => parameters.has(name));
}

/** Parse canonical state plus former identity, named-accent, and preset-bearing links. */
export function parseCatalogueAppearanceParameters(
  parameters: URLSearchParams,
  names: CatalogueAppearanceParameterNames = catalogueAppearanceParameterNames,
): CatalogueAppearanceState | undefined {
  if (!hasAnyAppearanceParameter(parameters, names)) return undefined;
  const parsedField = parseCatalogueAxesValue(parameters.get(names.field));
  const parsedTheme = catalogueTheme(parameters.get(names.theme));
  const field = parsedField?.field ?? (parsedTheme === "dark"
    ? {
      ...defaultAppearance,
      darkness: appearanceAxes.darkness.maximum,
    }
    : defaultAppearance);
  const former = legacyAppearance(parameters.get(names.legacyAppearance));
  const accentValue = parameters.get(names.accent);
  const explicitNone = accentValue === CATALOGUE_ACCENT_NONE;
  const parsedAccentHue = accentValue === null || explicitNone
    ? undefined
    : catalogueAccentHue(accentValue);
  const accent = former === "mono"
    ? undefined
    : former === "accent"
    ? parsedAccentHue ?? DEFAULT_ACCENT_HUE
    : parsedField?.legacyPreset === "blue"
    ? parsedAccentHue ?? DEFAULT_ACCENT_HUE
    : parsedField?.legacyPreset === "mono"
    ? undefined
    : parsedAccentHue;
  const theme = parsedTheme === undefined
    ? parsedField === undefined ? "system" : catalogueAxesPolarity(field)
    : parsedTheme === "system" && field.darkness !== 0 && field.darkness !== 1
    ? catalogueAxesPolarity(field)
    : parsedTheme;

  const invalidExplicitValue =
    (parameters.has(names.theme) && parsedTheme === undefined) ||
    (parameters.has(names.legacyAppearance) && former === undefined) ||
    (accentValue !== null && !explicitNone && parsedAccentHue === undefined) ||
    (parameters.has(names.field) && parsedField === undefined);
  if (invalidExplicitValue) return defaultCatalogueAppearanceState;

  return { theme, accent, field };
}

/** Write the exact canonical order used by both URLs and localStorage. */
export function writeCatalogueAppearanceParameters(
  parameters: URLSearchParams,
  state: CatalogueAppearanceState,
  names: CatalogueAppearanceParameterNames = catalogueAppearanceParameterNames,
): void {
  parameters.delete(names.legacyAppearance);
  parameters.set(names.theme, state.theme);
  parameters.set(
    names.accent,
    state.accent === undefined
      ? CATALOGUE_ACCENT_NONE
      : String(normalizeAccentHue(state.accent)),
  );
  parameters.set(names.field, serializeCatalogueAxes(state.field));
}

/** One storage value with the same canonical parameter representation as URLs. */
export function serializeCatalogueAppearanceState(
  state: CatalogueAppearanceState,
): string {
  const parameters = new URLSearchParams();
  writeCatalogueAppearanceParameters(parameters, state);
  return parameters.toString();
}

/** Select an accent hue, or `undefined` to return to monochrome. */
export function setCatalogueAccent(
  state: CatalogueAppearanceState,
  accent: number | undefined,
): CatalogueAppearanceState {
  return {
    ...state,
    accent: accent === undefined ? undefined : normalizeAccentHue(accent),
  };
}

export function setCatalogueFieldPoint(
  state: CatalogueAppearanceState,
  field: CatalogueAxesSelection,
): CatalogueAppearanceState {
  return { ...state, field };
}

/** Carry valid explicit Appearance state through one local URL transition. */
export function preserveCatalogueAppearanceHref(
  current: URL,
  href: string,
): string {
  const target = new URL(href, current);
  const state = parseCatalogueAppearanceParameters(current.searchParams);
  if (state !== undefined) {
    const canonicalCurrent = new URLSearchParams();
    writeCatalogueAppearanceParameters(canonicalCurrent, state);
    for (const name of catalogueAppearanceParameters) {
      if (!target.searchParams.has(name)) {
        target.searchParams.set(name, canonicalCurrent.get(name)!);
      }
    }
    const targetAppearance = parseCatalogueAppearanceParameters(
      target.searchParams,
    );
    if (targetAppearance !== undefined) {
      writeCatalogueAppearanceParameters(
        target.searchParams,
        targetAppearance,
      );
    }
  }
  return target.origin === current.origin
    ? target.pathname + target.search + target.hash
    : target.href;
}
