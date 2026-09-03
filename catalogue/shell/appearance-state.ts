import type { ThemeSwitcherMode } from "../../src/components/core/theme-switcher/theme-switcher.tsx";
import {
  appearanceAxes,
  type AppearanceName,
  DEFAULT_ACCENT_HUE,
  defaultAppearancePoint,
  normalizeAccentHue,
} from "../../src/tokens/appearance.ts";
import { catalogueAccentHue } from "./appearance-options.ts";
import type { CatalogueAxesSelection } from "./axes-state.ts";
import {
  catalogueAxesPolarity,
  parseCatalogueAxesValue,
  serializeCatalogueAxes,
} from "./axes-state.ts";

export interface CatalogueAppearanceState {
  readonly theme: ThemeSwitcherMode;
  readonly appearance: AppearanceName;
  readonly accentHue: number;
  readonly field: CatalogueAxesSelection;
}

export const defaultCatalogueAppearanceState: CatalogueAppearanceState = Object
  .freeze({
    theme: "system",
    appearance: "field",
    accentHue: DEFAULT_ACCENT_HUE,
    field: defaultAppearancePoint,
  });

export const catalogueAppearanceStorageKey = "discern-catalogue-appearance";

export const legacyCatalogueAppearanceStorageKeys = Object.freeze({
  theme: "discern-catalogue-theme",
  accent: "discern-catalogue-accent-hue",
  field: "discern-catalogue-appearance-page",
});

export interface CatalogueAppearanceParameterNames {
  readonly theme: string;
  readonly appearance: string;
  readonly accent: string;
  readonly field: string;
}

export const catalogueAppearanceParameterNames:
  CatalogueAppearanceParameterNames = Object.freeze({
    theme: "theme",
    appearance: "appearance",
    accent: "accent",
    field: "field",
  });

export const catalogueAppearanceParameters = Object.freeze(
  Object.values(catalogueAppearanceParameterNames),
);

export function catalogueTheme(
  value: string | null,
): ThemeSwitcherMode | undefined {
  return value === "system" || value === "light" || value === "dark"
    ? value
    : undefined;
}

function appearanceName(value: string | null): AppearanceName | undefined {
  return value === "field" || value === "accent" ? value : undefined;
}

function hasAnyAppearanceParameter(
  parameters: URLSearchParams,
  names: CatalogueAppearanceParameterNames,
): boolean {
  return Object.values(names).some((name) => parameters.has(name));
}

/** Parse canonical state plus former named-accent and preset-bearing links. */
export function parseCatalogueAppearanceParameters(
  parameters: URLSearchParams,
  names: CatalogueAppearanceParameterNames = catalogueAppearanceParameterNames,
): CatalogueAppearanceState | undefined {
  if (!hasAnyAppearanceParameter(parameters, names)) return undefined;
  const parsedField = parseCatalogueAxesValue(
    parameters.get(names.field),
  );
  const parsedTheme = catalogueTheme(parameters.get(names.theme));
  const field = parsedField?.field ?? (parsedTheme === "dark"
    ? {
      ...defaultAppearancePoint,
      darkness: appearanceAxes.darkness.maximum,
    }
    : defaultAppearancePoint);
  const explicitAppearance = appearanceName(parameters.get(names.appearance));
  const accentValue = parameters.get(names.accent);
  const parsedAccentHue = catalogueAccentHue(accentValue);
  const accentHue = parsedAccentHue ?? DEFAULT_ACCENT_HUE;
  const appearance = explicitAppearance ??
    (parsedField?.legacyPreset === "blue"
      ? "accent"
      : parsedField !== undefined
      ? "field"
      : parsedAccentHue !== undefined
      ? "accent"
      : "field");
  const theme = parsedTheme === undefined
    ? parsedField === undefined ? "system" : catalogueAxesPolarity(field)
    : parsedTheme === "system" && field.darkness !== 0 && field.darkness !== 1
    ? catalogueAxesPolarity(field)
    : parsedTheme;

  const invalidExplicitValue =
    (parameters.has(names.theme) && parsedTheme === undefined) ||
    (parameters.has(names.appearance) && explicitAppearance === undefined) ||
    (parameters.has(names.accent) && parsedAccentHue === undefined) ||
    (parameters.has(names.field) && parsedField === undefined);
  if (invalidExplicitValue) return defaultCatalogueAppearanceState;

  return { theme, appearance, accentHue, field };
}

/** Write the exact canonical order used by both URLs and localStorage. */
export function writeCatalogueAppearanceParameters(
  parameters: URLSearchParams,
  state: CatalogueAppearanceState,
  names: CatalogueAppearanceParameterNames = catalogueAppearanceParameterNames,
): void {
  parameters.set(names.theme, state.theme);
  parameters.set(names.appearance, state.appearance);
  parameters.set(names.accent, String(normalizeAccentHue(state.accentHue)));
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

export function setCatalogueAppearanceIdentity(
  state: CatalogueAppearanceState,
  appearance: AppearanceName,
): CatalogueAppearanceState {
  return { ...state, appearance };
}

export function setCatalogueAccentHue(
  state: CatalogueAppearanceState,
  accentHue: number,
): CatalogueAppearanceState {
  return { ...state, accentHue: normalizeAccentHue(accentHue) };
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
    for (const name of Object.values(catalogueAppearanceParameterNames)) {
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
